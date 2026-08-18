-- =====================================================================
-- Sinnapi — 0812a Bookings: the `in_progress` transition, and the console
--                           surface for the booking lifecycle
--
-- WHAT WAS WRONG
-- `booking_status` has carried `in_progress` since 0618a, and both portals
-- render it as a real step on the happy path (`BOOKING_LIFECYCLE` in the client
-- and vendor booking pages, `statusColor` in the shared UI package). Nothing
-- could ever produce it. Three functions write `bookings.status` and between
-- them they cover four of the six enum values:
--
--   respond_booking   -> confirmed | declined
--   complete_booking  -> completed
--   cancel_booking    -> cancelled
--
-- So a booking went `confirmed` -> `completed` in one jump, the timeline showed
-- a step that never lit up, and neither the client nor the vendor could say
-- "this is happening now". This file supplies the missing write.
--
-- WHAT THIS FILE PROVIDES
--   * bookings.started_at            when work actually began — completed_at's twin
--   * start_booking                  confirmed -> in_progress, for either party
--   * admin_set_booking_status       the console's lifecycle control
--   * complete_booking               hardened: it had no source-status guard
--   * tg_booking_history             now records a per-transition reason
--   * get_booking_admin              one booking, fully resolved, for the console
--   * get_booking_activity           status + escrow + payment history, merged
--
-- WHO MAY START A BOOKING, AND WHEN
-- Either party acting alone — the client or the vendor — because both know the
-- event has begun and requiring a handshake would strand the booking whenever
-- one side is busy running the event. Two gates apply to them:
--
--   the event date   `in_progress` means the event is happening. Starting a
--                    booking weeks early is a mis-click, not an intention.
--   escrow funded    money is secured before work begins. This is the whole
--                    promise of the platform, and it is also self-protecting:
--                    activate_escrow requires status = 'confirmed', so a
--                    booking started before funding could never be funded at
--                    all. Blocking the start is what keeps that door open.
--
-- An admin holding `bookings.manage` waives both — that is the support lever
-- for a booking stuck behind a gate — but not the ordering. Nobody skips
-- states; `admin_set_booking_status` enforces the same graph the parties walk.
--
-- A booking with no escrow row therefore cannot be started by its parties yet.
-- That is correct for today, where escrow is the only settlement route the
-- schema can express (`payment_type` is null until activate_escrow writes
-- 'escrow'; nothing ever writes 'direct'). The self-managed payment route that
-- gives those bookings their own legitimate start path lands next.
-- =====================================================================

-- ---------------------------------------------------------------------
-- started_at — the mirror of completed_at.
--
-- Kept as a column rather than derived from booking_status_history because
-- every read that wants it (hero meta, "running for 3 hours", the agreement
-- document later) wants it beside the booking, not behind a lateral join into
-- an append-only log. The log stays the audit trail; this is the fact.
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists started_at timestamptz;

comment on column public.bookings.started_at is
  'When the booking entered in_progress. Null until it does; never cleared.';

-- ---------------------------------------------------------------------
-- The status trail learns to carry a reason.
--
-- tg_booking_history sourced `reason` from new.cancellation_reason, which is
-- the right answer for exactly one transition and null for every other. An
-- admin forcing a booking to in_progress has a justification worth keeping,
-- and writing it into cancellation_reason to smuggle it past the trigger would
-- leave a non-cancelled booking carrying a cancellation reason.
--
-- A transaction-local GUC carries it instead: the caller sets it immediately
-- before the update and clears it immediately after, so it applies to exactly
-- one transition and cannot leak into a second one in the same transaction.
-- `set_config(..., true)` is rolled back with the transaction, so a failed RPC
-- leaves nothing behind either.
-- ---------------------------------------------------------------------
create or replace function public.tg_booking_history()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_reason text;
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    v_reason := nullif(current_setting('sinnapi.status_reason', true), '');
    insert into public.booking_status_history(booking_id, from_status, to_status, actor_id, reason)
    values (new.id,
            case when tg_op = 'UPDATE' then old.status end,
            new.status,
            auth.uid(),
            coalesce(v_reason, new.cancellation_reason));
  end if;
  return new;
end;$$;

-- ---------------------------------------------------------------------
-- start_booking — confirmed -> in_progress.
--
-- Idempotent on the target state: a client and a vendor both tapping "Start"
-- on the morning of the event is the expected case, not an error, and the
-- second call should not raise at someone who did nothing wrong.
-- ---------------------------------------------------------------------
create or replace function public.start_booking(
  p_booking_id uuid,
  p_reason     text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  e        public.escrow_transactions;
  v_admin  boolean;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;

  v_admin := public.has_permission('bookings.manage');
  if not (v_admin or b.client_id = auth.uid() or public.is_vendor_owner(b.vendor_id)) then
    perform public._forbidden();
  end if;

  -- Already there. Nothing to do, and nothing to complain about.
  if b.status = 'in_progress' then return; end if;
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;

  if not v_admin then
    -- Compared as dates, not instants: a booking is startable from the first
    -- moment of its event day, not from midnight UTC on it.
    if current_date < b.event_date then raise exception 'booking_not_yet_due'; end if;

    select * into e from public.escrow_transactions where booking_id = p_booking_id;
    -- 'held' is funded and waiting; 'advance_released' is funded with the
    -- advance already gone to the vendor. Both mean the money is in.
    if coalesce(e.status::text, '') not in ('held', 'advance_released') then
      raise exception 'booking_not_funded';
    end if;
  end if;

  perform set_config('sinnapi.status_reason', coalesce(p_reason, ''), true);
  update public.bookings
     set status = 'in_progress', started_at = now()
   where id = p_booking_id;
  perform set_config('sinnapi.status_reason', '', true);
end;$$;

-- ---------------------------------------------------------------------
-- complete_booking — unchanged in intent, given the guard it never had.
--
-- It would previously take a booking straight from `requested` to `completed`,
-- which skips the vendor's own acceptance and fires trg_escrow_release_window
-- on a booking that was never confirmed, let alone funded. No caller does that
-- today; the vendor portal only offers the button from `confirmed` upward. The
-- guard makes the server agree with the UI instead of trusting it.
-- ---------------------------------------------------------------------
create or replace function public.complete_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;
  if not (public.is_vendor_owner(b.vendor_id) or public.has_permission('bookings.manage')) then
    perform public._forbidden();
  end if;

  if b.status = 'completed' then return; end if;   -- idempotent
  if b.status not in ('confirmed', 'in_progress') then
    raise exception 'booking_not_completable';
  end if;

  update public.bookings set status = 'completed', completed_at = now() where id = p_booking_id;
end;$$;

-- ---------------------------------------------------------------------
-- admin_set_booking_status — the console's lifecycle control.
--
-- One function rather than four, because the console offers the transitions as
-- one control and every one of them needs the same three things: the same
-- permission, a recorded reason, and the same refusal to skip a state.
--
-- The graph below is the parties' own path with nothing added. An admin waives
-- the date and funding gates (that is the support lever) but never the
-- ordering: `completed` reachable from `requested` would open the escrow
-- release window on a booking nobody ever accepted.
--
-- A reason is mandatory. An operator changing someone else's booking state is
-- exactly the event a colleague reads back later, and an unexplained one is
-- indistinguishable from a mistake.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_booking_status(
  p_booking_id uuid,
  p_status     text,
  p_reason     text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_from  text;
  v_ok    boolean;
begin
  if not public.has_permission('bookings.manage') then perform public._forbidden(); end if;

  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;

  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason_required'; end if;
  if length(p_reason) > 500 then raise exception 'reason_too_long'; end if;

  v_from := b.status::text;
  if v_from = p_status then return; end if;   -- idempotent

  v_ok := case p_status
    when 'confirmed'   then v_from = 'requested'
    when 'in_progress' then v_from = 'confirmed'
    when 'completed'   then v_from in ('confirmed', 'in_progress')
    when 'cancelled'   then v_from in ('requested', 'confirmed', 'in_progress')
    else null
  end;

  if v_ok is null then raise exception 'unsupported_status: %', p_status; end if;
  if not v_ok then raise exception 'invalid_transition: % -> %', v_from, p_status; end if;

  perform set_config('sinnapi.status_reason', p_reason, true);
  update public.bookings
     set status              = p_status::booking_status,
         started_at          = case when p_status = 'in_progress' then now() else started_at end,
         completed_at        = case when p_status = 'completed'   then now() else completed_at end,
         cancelled_by        = case when p_status = 'cancelled' then auth.uid() else cancelled_by end,
         cancellation_reason = case when p_status = 'cancelled' then p_reason else cancellation_reason end
   where id = p_booking_id;
  perform set_config('sinnapi.status_reason', '', true);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'booking_status_set_by_admin', 'bookings', p_booking_id,
          jsonb_build_object('status', v_from),
          jsonb_build_object('status', p_status, 'reason', p_reason));
end;$$;

-- ---------------------------------------------------------------------
-- get_booking_admin — one booking, fully resolved.
--
-- The console's booking page needs the booking, both parties, the quotation it
-- came from and the escrow behind it. Assembled here rather than as four
-- PostgREST reads because three of the four are optional and a page that
-- fires four requests to render one screen spends most of its life in a
-- partially-loaded state.
--
-- The `quotation` key deliberately matches `get_event_quotation`'s shape, so
-- the console's existing `downloadQuotationPdf` renders it unchanged.
-- ---------------------------------------------------------------------
create or replace function public.get_booking_admin(p_booking_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_doc jsonb;
begin
  if not public.has_permission('bookings.read') then perform public._forbidden(); end if;

  select jsonb_build_object(
    'id',                          b.id,
    'reference_no',                b.reference_no,
    'status',                      b.status,
    'event_date',                  b.event_date,
    'start_time',                  b.start_time,
    'end_time',                    b.end_time,
    'location',                    b.location,
    'currency',                    b.currency,
    'amount',                      b.amount,
    'payment_type',                b.payment_type,
    'advance_rate',                b.advance_rate,
    'advance_release_days_before', b.advance_release_days_before,
    'advance_terms_note',          b.advance_terms_note,
    'advance_terms_accepted_at',   b.advance_terms_accepted_at,
    'advance_terms_accepted_by',   acc.full_name,
    'cancellation_reason',         b.cancellation_reason,
    'cancelled_by',                canc.full_name,
    'started_at',                  b.started_at,
    'completed_at',                b.completed_at,
    'created_at',                  b.created_at,

    'vendor', jsonb_build_object(
      'id',    vend.id,
      'name',  vend.business_name,
      'slug',  vend.slug,
      'email', vown.email,
      'phone', vown.phone),

    'client', jsonb_build_object(
      'id',    cli.id,
      'name',  cli.full_name,
      'email', cli.email,
      'phone', cli.phone),

    'event', case when ev.id is null then null else jsonb_build_object(
      'id',    ev.id,
      'title', ev.title) end,

    'escrow', case when esc.id is null then null else jsonb_build_object(
      'id',                     esc.id,
      'status',                 esc.status,
      'currency',               esc.currency,
      'gross_amount',           esc.gross_amount,
      'agreed_amount',          esc.agreed_amount,
      'commission_amount',      esc.commission_amount,
      'psp_fee_amount',         esc.psp_fee_amount,
      'advance_rate',           esc.advance_rate,
      'advance_amount',         esc.advance_amount,
      'balance_amount',         esc.balance_amount,
      'advance_release_due_at', esc.advance_release_due_at,
      'advance_released_at',    esc.advance_released_at,
      'balance_released_at',    esc.balance_released_at,
      'timers_frozen_at',       esc.timers_frozen_at) end,

    -- Same shape as get_event_quotation, so one PDF renderer serves both.
    'quotation', case when q.id is null then null else jsonb_build_object(
      'id',              q.id,
      'reference_no',    q.reference_no,
      'status',          q.status,
      'currency',        q.currency,
      'subtotal',        q.subtotal,
      'discount_total',  q.discount_total,
      'tax_total',       q.tax_total,
      'total',           q.total,
      'valid_until',     q.valid_until,
      'request_details', q.request_details,
      'sent_at',         q.sent_at,
      'created_at',      q.created_at,
      'vendor_name',     vend.business_name,
      'client_name',     cli.full_name,
      'event_title',     ev.title,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'description', qi.description,
                 'quantity',    qi.quantity,
                 'unit_price',  qi.unit_price,
                 'line_total',  qi.line_total)
               order by qi.sort_order)
        from public.quotation_items qi where qi.quotation_id = q.id), '[]'::jsonb)) end
  )
  into v_doc
  from public.bookings b
  join public.vendors  vend on vend.id = b.vendor_id
  join public.profiles vown on vown.id = vend.owner_id
  join public.profiles cli  on cli.id  = b.client_id
  left join public.events     ev   on ev.id  = b.event_id
  left join public.quotations q    on q.id   = b.quotation_id and q.deleted_at is null
  left join public.escrow_transactions esc on esc.booking_id = b.id
  left join public.profiles acc  on acc.id  = b.advance_terms_accepted_by
  left join public.profiles canc on canc.id = b.cancelled_by
  where b.id = p_booking_id and b.deleted_at is null;

  if v_doc is null then raise exception 'not_found'; end if;
  return v_doc;
end;$$;

-- ---------------------------------------------------------------------
-- get_booking_activity — one timeline, four sources.
--
-- What an operator asks of a booking is "what happened, in order". That story
-- is spread across four append-only tables, and reading them separately hands
-- the browser four lists to interleave by timestamp — which is a merge sort
-- written in TypeScript, done again on every render, against pages that may
-- not overlap in time.
--
-- `kind` lets the console group or filter without parsing labels, and `detail`
-- is already the sentence to render. `actor` is null for the several entries
-- no human caused: a webhook confirming funding, the cron releasing an advance.
-- ---------------------------------------------------------------------
create or replace function public.get_booking_activity(p_booking_id uuid)
returns table (
  kind        text,
  label       text,
  detail      text,
  actor       text,
  amount      numeric,
  currency    text,
  occurred_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('bookings.read') then perform public._forbidden(); end if;

  return query
  -- The booking's own status trail.
  select 'status'::text,
         h.to_status::text,
         case when h.from_status is null
              then 'Booking created'
              else 'Moved from ' || h.from_status::text || ' to ' || h.to_status::text end,
         p.full_name,
         null::numeric,
         null::text,
         h.occurred_at
    from public.booking_status_history h
    left join public.profiles p on p.id = h.actor_id
   where h.booking_id = p_booking_id

  union all
  -- Reasons are worth their own line: they are the only free text an operator
  -- gets, and appending them to the label above would make a status chip out
  -- of a paragraph.
  select 'note'::text,
         'Reason'::text,
         h.reason,
         p.full_name,
         null::numeric,
         null::text,
         h.occurred_at
    from public.booking_status_history h
    left join public.profiles p on p.id = h.actor_id
   where h.booking_id = p_booking_id
     and coalesce(btrim(h.reason), '') <> ''

  union all
  -- Escrow's own ledger of events.
  select 'escrow'::text,
         ee.event_type::text,
         replace(ee.event_type::text, '_', ' '),
         p.full_name,
         ee.amount,
         e.currency,
         ee.occurred_at
    from public.escrow_events ee
    join public.escrow_transactions e on e.id = ee.escrow_id
    left join public.profiles p on p.id = ee.actor_id
   where e.booking_id = p_booking_id

  union all
  -- Money in. Attempts included: a failed charge is part of the story.
  select 'payment'::text,
         pay.status::text,
         pay.provider::text || ' ' || pay.status::text,
         payer.full_name,
         pay.amount,
         pay.currency,
         pay.created_at
    from public.payments pay
    left join public.profiles payer on payer.id = pay.payer_id
   where pay.booking_id = p_booking_id

  union all
  -- Admin overrides. Everything else here is a consequence; these are choices.
  select 'admin'::text,
         al.action,
         coalesce(al.after ->> 'reason', al.action),
         p.full_name,
         null::numeric,
         null::text,
         al.occurred_at
    from public.audit_logs al
    left join public.profiles p on p.id = al.actor_id
   where al.entity_type = 'bookings'
     and al.entity_id = p_booking_id

  order by 7 asc;
end;$$;

-- ---------------------------------------------------------------------
-- Grants. Every function here checks its own caller, so a signed-in session
-- may call them all and an unprivileged one gets a refusal rather than data.
-- ---------------------------------------------------------------------
grant execute on function public.start_booking(uuid, text)               to authenticated;
grant execute on function public.admin_set_booking_status(uuid, text, text) to authenticated;
grant execute on function public.get_booking_admin(uuid)                 to authenticated;
grant execute on function public.get_booking_activity(uuid)              to authenticated;
