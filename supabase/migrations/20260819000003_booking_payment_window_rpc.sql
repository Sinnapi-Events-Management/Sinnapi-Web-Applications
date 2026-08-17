-- =====================================================================
-- Sinnapi — the booking payment window, step 3: the functions.
--
-- Same rules as the escrow money functions: security definer with a fixed
-- search_path, authorization re-checked inside rather than assumed from RLS,
-- idempotent on every path a cron can re-enter, and the trail written in the
-- same transaction as the thing it records.
--
-- The order is the flow, and each function enforces its own place in it:
--
--   open_booking_payment_window    trigger. The vendor confirmed and the terms
--                                  are accepted, so the clock starts.
--   remind_booking_payment         cron. A reminder mark came due.
--   nudge_booking_payment          vendor or admin, by hand, rate limited.
--   extend_booking_payment_window  admin. More time, with a reason.
--   flag_booking_payment_overdue   cron. The clock ran out. Flags; never cancels.
--   close_booking_payment_window   the escrow funded. The clock stops for good.
--   cancel_unpaid_booking          vendor or admin, only once overdue.
--
-- Nothing here moves money, and nothing here cancels a booking without a
-- person asking it to.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Which side the caller is on, for the visible trail.
-- ---------------------------------------------------------------------
create or replace function public.booking_payment_actor_role(p_booking_id uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null or auth.uid() is null then return 'system'; end if;
  if b.client_id = auth.uid() then return 'client'; end if;
  if public.is_vendor_owner(b.vendor_id) then return 'vendor'; end if;
  return 'admin';
end;$$;

-- ---------------------------------------------------------------------
-- One step of the trail, plus the fan-out that goes with it.
--
-- Kept as a single call for the same reason `settlement_notify` is: a chase
-- that left no trace, or a trace nobody was told about, is precisely the
-- failure this flow exists to prevent.
--
-- This cannot delegate to `escrow_notify`. That function starts by loading an
-- escrow row and returns silently when there is none — which is the exact
-- state of every booking this flow cares most about.
-- ---------------------------------------------------------------------
create or replace function public.booking_payment_notify(
  p_booking_id uuid,
  p_kind       booking_payment_event_kind,
  p_trigger    text,
  p_to_client  boolean default true,
  p_to_vendor  boolean default false,
  p_to_admin   boolean default false,
  p_note       text default null,
  p_metadata   jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  b         public.bookings;
  v_owner   uuid;
  v_role    text;
  v_due     timestamptz;
  v_payload jsonb;
  r         record;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then return; end if;

  select owner_id into v_owner from public.vendors where id = b.vendor_id;

  v_role := public.booking_payment_actor_role(p_booking_id);
  v_due  := public.booking_payment_deadline(b);

  insert into public.booking_payment_events (booking_id, kind, actor_id, actor_role, note, metadata)
  values (p_booking_id, p_kind, auth.uid(), v_role, p_note, coalesce(p_metadata, '{}'::jsonb));

  -- Everything a template or an in-app card could need, resolved once. The
  -- amount is the booking's agreed figure rather than the escrow gross,
  -- because at the moment most of these fire there is no escrow to read a
  -- gross off — the templates say "the agreed amount plus fees" and the exact
  -- total is shown on the page the link goes to.
  --
  -- The two party names are deliberately absent: the dispatcher resolves them
  -- from `vendor_id` and `client_id` when a payload does not carry them, and a
  -- second copy of that lookup here would be one more place to drift.
  v_payload := jsonb_build_object(
    'booking_id',      b.id,
    'booking_ref',     b.reference_no,
    'event_date',      b.event_date,
    'start_time',      b.start_time,
    'location',        b.location,
    'vendor_id',       b.vendor_id,
    'client_id',       b.client_id,
    'currency',        b.currency,
    'amount',          b.amount,
    'agreed_amount',   b.amount,
    'payment_due_at',  v_due,
    'payment_overdue_at', b.payment_overdue_at,
    'event_kind',      p_kind,
    'note',            p_note
  ) || coalesce(p_metadata, '{}'::jsonb);

  if p_to_client and b.client_id is not null then
    insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
    values ('bookings', b.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', b.client_id, 'audience', 'client'),
            'pending', now());
  end if;

  if p_to_vendor and v_owner is not null then
    insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
    values ('bookings', b.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', v_owner, 'audience', 'vendor'),
            'pending', now());
  end if;

  if p_to_admin then
    for r in
      select distinct ur.profile_id
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where p.key = 'booking.payment.chase'
    loop
      insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
      values ('bookings', b.id, p_trigger,
              v_payload || jsonb_build_object('recipient_id', r.profile_id, 'audience', 'admin'),
              'pending', now());
    end loop;
  end if;
end;$$;

revoke all on function public.booking_payment_notify(
  uuid, booking_payment_event_kind, text, boolean, boolean, boolean, text, jsonb) from anon, authenticated;

-- ---------------------------------------------------------------------
-- OPEN THE WINDOW
--
-- Called from a trigger rather than from `respond_booking`, because four
-- different writers can put a booking into the state that starts this clock —
-- the vendor accepting, the client accepting a counter, an admin confirming on
-- the vendor's behalf, and a booking created from an accepted quotation. A
-- clock started in only three of them is a clock that silently does not exist
-- for a quarter of bookings.
--
-- THE CLAMP
-- The deadline is the earlier of "now plus the configured window" and the
-- start of the event. An unclamped 48-hour window on a booking confirmed the
-- day before the event comes due after the event is over, which makes the
-- overdue flag meaningless on exactly the bookings where the vendor's held
-- date is worth the most.
--
-- A booking confirmed at or after its own event start has no window left at
-- all. It gets `now()` and the next sweep flags it — which is the honest
-- answer, and better than inventing a grace period nobody agreed to.
-- ---------------------------------------------------------------------
create or replace function public.open_booking_payment_window(
  p_booking_id uuid,
  -- False only for the backfill at the bottom of this file. A migration that
  -- emailed every client with an open booking the moment it was deployed would
  -- be a mailshot, not a notification.
  p_notify boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_hours numeric;
  v_start timestamptz;
  v_due   timestamptz;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then return; end if;

  -- Only the escrow rail has anything to fund. An off-platform booking is
  -- settled between the two of them and Sinnapi has no standing to put a clock
  -- on it, let alone cancel it for a payment it cannot see.
  if b.payment_type <> 'escrow' then return; end if;
  if b.status <> 'confirmed' then return; end if;
  if b.payment_terms_status <> 'accepted' then return; end if;
  -- Idempotent: the clock starts once. A booking whose terms are renegotiated
  -- and re-accepted does not get to restart the client's window, and neither
  -- does a trigger firing twice on one statement.
  if b.payment_window_opened_at is not null then return; end if;
  -- Already paid — nothing to chase. Possible when an admin backfills a
  -- confirmation on a booking that was funded out of band.
  if b.payment_settled_at is not null then return; end if;
  if exists (select 1 from public.escrow_transactions
              where booking_id = p_booking_id
                and status not in ('initiated', 'failed')) then return; end if;

  v_hours := coalesce((public.get_setting('booking_payment_window_hours') #>> '{}')::numeric, 48);
  v_start := public.booking_start_at(b.event_date, b.start_time);

  v_due := now() + make_interval(secs => (v_hours * 3600)::int);
  if v_start is not null and v_start < v_due then v_due := v_start; end if;
  if v_due < now() then v_due := now(); end if;

  update public.bookings
     set payment_window_opened_at = now(),
         payment_due_at           = v_due
   where id = p_booking_id;

  if not p_notify then return; end if;

  -- Client and admin, per the flow's design: the client because it is their
  -- deadline, and an admin because the queue of bookings awaiting payment is
  -- pushed rather than only polled. The vendor is not told here — they have
  -- just confirmed the booking and are already looking at it; a second
  -- notification in the same minute is noise.
  perform public.booking_payment_notify(
    p_booking_id, 'window_opened', 'booking.payment_due',
    true, false, true, null,
    jsonb_build_object('window_hours', v_hours,
                       'clamped_to_event', v_start is not null and v_due = v_start));
end;$$;

revoke all on function public.open_booking_payment_window(uuid, boolean) from anon, authenticated;

-- The trigger. Fires on the transition into the payable state from any writer.
--
-- The two operations are branched rather than folded into one condition with a
-- `tg_op = 'INSERT'` escape: PL/pgSQL does not promise to short-circuit `or`,
-- and `OLD` is unassigned on an insert, so a single expression that mentions
-- both is a trigger that may throw on every booking ever created.
create or replace function public.tg_open_booking_payment_window()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (new.payment_type = 'escrow'
          and new.status = 'confirmed'
          and new.payment_terms_status = 'accepted'
          and new.payment_window_opened_at is null) then
    return null;
  end if;

  if tg_op = 'UPDATE'
     and old.status is not distinct from new.status
     and old.payment_terms_status is not distinct from new.payment_terms_status
     and old.payment_type is not distinct from new.payment_type then
    return null;
  end if;

  perform public.open_booking_payment_window(new.id);
  return null;
end;$$;

drop trigger if exists trg_open_payment_window on public.bookings;
create trigger trg_open_payment_window
  after insert or update of status, payment_terms_status, payment_type on public.bookings
  for each row execute function public.tg_open_booking_payment_window();

-- ---------------------------------------------------------------------
-- CLOSE THE WINDOW — the money is in.
--
-- Called from `fund_escrow` inside the funding transaction, so a booking can
-- never be simultaneously funded and chased. Also clears any overdue flag: a
-- client who paid late paid, and leaving the booking badged overdue would keep
-- offering a vendor a cancel button on money Sinnapi is now holding.
-- ---------------------------------------------------------------------
create or replace function public.close_booking_payment_window(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then return; end if;
  if b.payment_settled_at is not null then return; end if;   -- idempotent

  update public.bookings
     set payment_settled_at = now(),
         payment_overdue_at = null
   where id = p_booking_id;

  -- Trail only, no fan-out: `escrow.funded` already tells all three parties
  -- the money landed, and a second "payment received" beside it would be the
  -- same news twice.
  insert into public.booking_payment_events (booking_id, kind, actor_role, metadata)
  values (p_booking_id, 'paid', 'system',
          jsonb_build_object('was_overdue', b.payment_overdue_at is not null,
                             'due_at', public.booking_payment_deadline(b)));
end;$$;

revoke all on function public.close_booking_payment_window(uuid) from anon, authenticated;

-- ---------------------------------------------------------------------
-- AUTOMATIC REMINDER — cron, on a configured hours-remaining mark.
--
-- Service-role only. `p_hours_mark` is decided by the sweep from the settings
-- list and recorded here, so the same mark is never sent twice.
--
-- The mark is also checked for being *due*, not merely taken on trust from the
-- caller. The sweep already filters on it, so this is a second copy of that
-- rule — kept deliberately, because the alternative is a service-role function
-- that will happily tell a client they have 1 hour left when they have three
-- days, on nothing worse than a future caller passing the wrong constant.
-- A reminder is a message to a real person; it should not be reachable by
-- accident.
-- ---------------------------------------------------------------------
create or replace function public.remind_booking_payment(
  p_booking_id uuid, p_hours_mark integer)
returns text language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_due timestamptz; v_hours_left numeric;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then return 'noop'; end if;

  -- Every condition re-checked under the row lock. The sweep's query can go
  -- stale between the select and this call, and a reminder to pay a booking
  -- that was paid or cancelled ninety seconds ago is the kind of message that
  -- costs more trust than the reminder was ever going to earn.
  if b.payment_settled_at is not null then return 'noop'; end if;
  if b.status <> 'confirmed' then return 'noop'; end if;
  if b.payment_type <> 'escrow' then return 'noop'; end if;
  if coalesce(b.last_payment_reminder_hour, 2147483647) <= p_hours_mark then return 'noop'; end if;

  v_due := public.booking_payment_deadline(b);
  if v_due is null or v_due <= now() then return 'noop'; end if;

  -- The mark has to have been passed. "24 hours left" is only true once there
  -- are 24 hours or fewer left.
  v_hours_left := extract(epoch from (v_due - now())) / 3600;
  if p_hours_mark < v_hours_left then return 'noop'; end if;

  update public.bookings set last_payment_reminder_hour = p_hours_mark where id = p_booking_id;

  perform public.booking_payment_notify(
    p_booking_id, 'reminded', 'booking.payment_reminder',
    true, false, false, null,
    jsonb_build_object('hours_left', p_hours_mark, 'automatic', true));

  return 'reminded';
end;$$;

revoke all on function public.remind_booking_payment(uuid, integer) from anon, authenticated;
grant execute on function public.remind_booking_payment(uuid, integer) to service_role;

-- ---------------------------------------------------------------------
-- MANUAL NUDGE — the vendor or an admin chases the client.
--
-- The cooldown is per sender, not per booking: a vendor who has just chased
-- their client should not silence the support agent who was about to do the
-- same for a different reason. Both are still rate limited against themselves,
-- which is what stops a chase becoming harassment.
-- ---------------------------------------------------------------------
create or replace function public.nudge_booking_payment(
  p_booking_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_admin  boolean;
  v_cool   integer;
  v_last   timestamptz;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then raise exception 'not_found'; end if;

  v_admin := public.has_permission('booking.payment.chase');
  if not (public.is_vendor_owner(b.vendor_id) or v_admin) then perform public._forbidden(); end if;

  if b.payment_type <> 'escrow' then raise exception 'not_an_escrow_booking'; end if;
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.payment_settled_at is not null then raise exception 'already_paid'; end if;
  if v_note is not null and length(v_note) > 500 then raise exception 'note_too_long'; end if;

  v_cool := coalesce(
    (public.get_setting('booking_payment_nudge_cooldown_minutes') #>> '{}')::integer, 60);

  select max(created_at) into v_last
    from public.booking_payment_events
   where booking_id = p_booking_id and kind = 'nudged' and actor_id = auth.uid();

  if v_last is not null and v_last > now() - make_interval(mins => v_cool) then
    raise exception 'nudge_too_soon: %', v_cool;
  end if;

  update public.bookings
     set last_payment_nudge_at = now(),
         payment_nudge_count   = payment_nudge_count + 1
   where id = p_booking_id;

  perform public.booking_payment_notify(
    p_booking_id, 'nudged', 'booking.payment_nudge',
    true, false, false, v_note,
    jsonb_build_object('automatic', false,
                       'from', case when public.is_vendor_owner(b.vendor_id)
                                    then 'vendor' else 'admin' end));
end;$$;

grant execute on function public.nudge_booking_payment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- EXTEND — an admin gives one client more time.
--
-- Deliberately additive to the deadline in force rather than a free-form
-- timestamp from the caller: "give them another day" is the operation people
-- actually perform, and it cannot express an extension that quietly shortens
-- the window. The check constraint on the table refuses that anyway; this
-- makes it unreachable rather than merely refused.
-- ---------------------------------------------------------------------
create or replace function public.extend_booking_payment_window(
  p_booking_id uuid, p_hours numeric, p_reason text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_from   timestamptz;
  v_to     timestamptz;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.has_permission('booking.payment.chase') then perform public._forbidden(); end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then raise exception 'not_found'; end if;

  if b.payment_settled_at is not null then raise exception 'already_paid'; end if;
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.payment_due_at is null then raise exception 'no_payment_window'; end if;
  -- An extension is a decision somebody has to answer for later. The reason is
  -- shown to both parties on the trail, so it is not optional.
  if v_reason is null then raise exception 'reason_required'; end if;
  if length(v_reason) > 500 then raise exception 'reason_too_long'; end if;
  if p_hours is null or p_hours <= 0 then raise exception 'invalid_extension'; end if;
  if p_hours > 720 then raise exception 'extension_too_long'; end if;

  v_from := public.booking_payment_deadline(b);
  -- Extending an already-expired booking counts from now, not from the missed
  -- deadline — otherwise "give them 6 more hours" on a booking three days
  -- overdue hands them a deadline still in the past.
  v_to := greatest(v_from, now()) + make_interval(secs => (p_hours * 3600)::int);

  update public.bookings
     set payment_due_override_at     = v_to,
         payment_due_override_by     = auth.uid(),
         payment_due_override_reason = v_reason,
         -- The clock is live again, so the flag comes off and the reminder
         -- marks reset: the client should be reminded on the way down to the
         -- new deadline, not treated as already fully chased.
         payment_overdue_at          = null,
         last_payment_reminder_hour  = null
   where id = p_booking_id;

  perform public.booking_payment_notify(
    p_booking_id, 'extended', 'booking.payment_extended',
    true, true, false, v_reason,
    jsonb_build_object('from_due_at', v_from, 'to_due_at', v_to, 'hours', p_hours));

  return v_to;
end;$$;

grant execute on function public.extend_booking_payment_window(uuid, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- FLAG OVERDUE — cron, when the clock runs out.
--
-- This is the whole of what the platform does unattended, and it is
-- deliberately the smallest possible thing: stamp a column, tell three
-- parties, stop. It cancels nothing.
--
-- The reason is not squeamishness. A client can complete a payment at the PSP
-- minutes before the deadline and have the webhook arrive after it; a booking
-- auto-cancelled out from under a client who has actually paid is a refund, an
-- apology and a released date the vendor has already re-sold. Flagging is
-- reversible by the webhook arriving. Cancelling is not.
-- ---------------------------------------------------------------------
create or replace function public.flag_booking_payment_overdue(p_booking_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_due timestamptz;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then return 'noop'; end if;

  if b.payment_settled_at is not null then return 'noop'; end if;
  if b.payment_overdue_at is not null then return 'noop'; end if;   -- flagged once
  if b.status <> 'confirmed' then return 'noop'; end if;
  if b.payment_type <> 'escrow' then return 'noop'; end if;

  v_due := public.booking_payment_deadline(b);
  if v_due is null or v_due > now() then return 'noop'; end if;

  update public.bookings set payment_overdue_at = now() where id = p_booking_id;

  -- All three. The client because they may still pay and this is the last
  -- clear warning before someone ends it; the vendor because it is their date
  -- and theirs is the decision; an admin because an overdue booking is a queue
  -- item, and a queue nobody is told about is a queue nobody works.
  perform public.booking_payment_notify(
    p_booking_id, 'overdue', 'booking.payment_overdue',
    true, true, true, null,
    jsonb_build_object('due_at', v_due));

  return 'flagged';
end;$$;

revoke all on function public.flag_booking_payment_overdue(uuid) from anon, authenticated;
grant execute on function public.flag_booking_payment_overdue(uuid) to service_role;

-- ---------------------------------------------------------------------
-- CANCEL AN UNPAID BOOKING — vendor or admin, and only once overdue.
--
-- A narrow, single-purpose power rather than a general vendor cancel. Vendors
-- have never been able to cancel a confirmed booking and this does not give
-- them that: every branch below has to hold, so the function cannot be used on
-- a booking that is funded, in its window, or already under way. A vendor who
-- wants out of a paid booking still goes through an admin, where a refund
-- decision can be made by someone with the standing to make it.
--
-- `p_reason` is mandatory and is shown to the client. Somebody's event just
-- lost its vendor; "cancelled" with no sentence attached is not an acceptable
-- thing for them to log in and find.
-- ---------------------------------------------------------------------
create or replace function public.cancel_unpaid_booking(p_booking_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_admin  boolean;
  v_due    timestamptz;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then raise exception 'not_found'; end if;

  v_admin := public.has_permission('booking.payment.chase')
             or public.has_permission('bookings.manage');
  if not (public.is_vendor_owner(b.vendor_id) or v_admin) then perform public._forbidden(); end if;

  if v_reason is null then raise exception 'reason_required'; end if;
  if length(v_reason) > 500 then raise exception 'reason_too_long'; end if;

  if b.status = 'cancelled' then return; end if;                     -- idempotent
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.payment_type <> 'escrow' then raise exception 'not_an_escrow_booking'; end if;

  -- The money gate, twice over: the settled stamp, and the escrow's own status
  -- read fresh. Either one alone would be a race — the stamp is written by
  -- `close_booking_payment_window` and the escrow row by `fund_escrow`, in the
  -- same transaction but through different paths.
  if b.payment_settled_at is not null then raise exception 'booking_already_paid'; end if;
  if exists (select 1 from public.escrow_transactions
              where booking_id = p_booking_id
                and status not in ('initiated', 'failed')) then
    raise exception 'booking_already_paid';
  end if;

  v_due := public.booking_payment_deadline(b);
  if v_due is null then raise exception 'no_payment_window'; end if;
  if v_due > now() then raise exception 'payment_window_open'; end if;

  -- The status write. `booking_status_history` is trigger-written, so the
  -- cancellation lands on the timeline every portal already renders without
  -- this function knowing that table exists.
  update public.bookings
     set status              = 'cancelled',
         cancellation_reason = v_reason
   where id = p_booking_id;

  -- Any half-opened checkout dies with the booking, or the client could still
  -- complete a hosted payment for a booking that no longer exists and fund an
  -- escrow with nothing behind it.
  update public.escrow_transactions
     set status = 'failed', failure_reason = 'booking cancelled — payment window elapsed'
   where booking_id = p_booking_id and status in ('initiated', 'failed');

  update public.payments
     set status = 'failed'
   where booking_id = p_booking_id and status in ('pending', 'processing');

  perform public.booking_payment_notify(
    p_booking_id, 'cancelled', 'booking.payment_cancelled',
    true, true, true, v_reason,
    jsonb_build_object('due_at', v_due,
                       'cancelled_by', case when public.is_vendor_owner(b.vendor_id)
                                            then 'vendor' else 'admin' end));
end;$$;

grant execute on function public.cancel_unpaid_booking(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- FUND ESCROW — unchanged, except that funding now closes the clock.
--
-- Re-declared in full rather than patched, because that is the only way to
-- change a function body in Postgres. The single new line is the
-- `close_booking_payment_window` call, and it is inside this transaction on
-- purpose: if the funding rolls back, so does the settled stamp.
-- ---------------------------------------------------------------------
create or replace function public.fund_escrow(p_escrow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; v_grp uuid;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status not in ('initiated', 'funded') then return; end if;   -- idempotent

  v_grp := gen_random_uuid();

  update public.escrow_transactions
     set status = case
                    -- Event is already inside the advance window, so the
                    -- advance is payable immediately rather than on a timer.
                    when e.advance_release_due_at is null or e.advance_release_due_at <= now()
                      then 'held'::escrow_status
                    else 'awaiting_advance'::escrow_status
                  end,
         failure_reason = null
   where id = p_escrow_id;

  -- The client's full payment enters the held pool. It is split into vendor
  -- payable, commission and fee only when a tranche is actually released.
  perform public.post_ledger(v_grp, 'psp_clearing', 'debit',  e.gross_amount, e.currency,
                             'Escrow funded', p_escrow_id, e.funding_payment_id);
  perform public.post_ledger(v_grp, 'escrow_held',  'credit', e.gross_amount, e.currency,
                             'Escrow funded', p_escrow_id, e.funding_payment_id);
  perform public.assert_balanced(v_grp);

  -- The money is in, so the client is no longer someone to chase. Closing this
  -- here rather than from the webhook means every funding path closes it —
  -- including reconciliation replaying a payment the webhook never delivered.
  perform public.close_booking_payment_window(e.booking_id);

  perform public.escrow_notify(
    p_escrow_id, 'funded', 'escrow.funded', true, true, true, e.gross_amount,
    jsonb_build_object('advance_release_due_at', e.advance_release_due_at));
end;$$;
revoke all on function public.fund_escrow(uuid) from anon, authenticated;
grant execute on function public.fund_escrow(uuid) to service_role;

-- ---------------------------------------------------------------------
-- ACTIVATE ESCROW — unchanged, plus the full-payment guard.
--
-- WHAT THE GUARD IS FOR
-- Escrow has always charged the client the whole gross in one go; there is no
-- instalment path and this makes sure there never accidentally becomes one.
-- The identity it asserts is the one the product promises:
--
--     gross = agreed with the vendor
--           + Sinnapi's commission
--           + the processing fee the payment provider charges
--
-- and the payment row is written for exactly that figure. `escrow_price_booking`
-- computes all four, so today the assertion cannot fail — which is the point.
-- It is a tripwire on the pricing function, placed on the path where money is
-- actually charged, so that a future change which starts returning a partial
-- amount fails loudly at checkout instead of quietly funding an escrow with
-- less than the booking is worth and leaving the shortfall to reconciliation.
--
-- A cancelled booking is also refused here now. Without it, a client sitting
-- on a checkout page opened before the cancellation could still come back and
-- fund a booking that no longer exists.
-- ---------------------------------------------------------------------
create or replace function public.activate_escrow(
  p_booking_id uuid,
  p_provider   payment_provider,
  p_method     payment_method)
returns table (payment_id uuid, escrow_id uuid, amount numeric, currency text)
language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  q        record;
  e        public.escrow_transactions;
  v_escrow uuid;
  v_payment uuid;
  v_idem   text;
  v_fx     uuid;
  v_base   numeric;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;

  -- The vendor must have accepted first; escrow cannot pre-empt the booking.
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.advance_terms_accepted_at is null then raise exception 'advance_terms_not_accepted'; end if;
  if coalesce(b.amount, 0) <= 0 then raise exception 'booking_amount_not_set'; end if;
  if p_provider = 'paypal' and p_method <> 'card' then raise exception 'paypal_requires_card'; end if;

  select * into q from public.escrow_price_booking(p_booking_id, p_provider, p_method);

  -- The full-payment guard. One charge, for the whole of what the booking
  -- costs, or nothing at all.
  if coalesce(q.gross_amount, 0) <= 0 then
    raise exception 'booking_amount_not_set';
  end if;
  if q.gross_amount <> coalesce(q.agreed_amount, 0)
                     + coalesce(q.commission_amount, 0)
                     + coalesce(q.psp_fee_amount, 0) then
    raise exception 'partial_payment_not_allowed: gross % <> agreed % + commission % + fee %',
      q.gross_amount, q.agreed_amount, q.commission_amount, q.psp_fee_amount;
  end if;

  select * into e from public.escrow_transactions
   where booking_id = p_booking_id for update;

  if e.id is not null and e.status not in ('initiated', 'failed') then
    -- Already funded or beyond. Never charge twice for one booking.
    raise exception 'escrow_already_active: %', e.status;
  end if;

  if q.currency <> 'UGX' then
    v_fx   := public.latest_fx_rate_id(q.currency, 'UGX');
    v_base := q.gross_amount * coalesce((select rate from public.exchange_rates where id = v_fx), 1);
  else
    v_base := q.gross_amount;
  end if;

  v_idem := 'PM-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payments (payer_id, purpose, booking_id, provider, provider_method,
      idempotency_key, amount, currency, fx_rate_id, base_amount, base_currency, status, created_by)
  values (auth.uid(), 'escrow_funding', p_booking_id, p_provider, p_method,
      v_idem, q.gross_amount, q.currency, v_fx, v_base, 'UGX', 'pending', auth.uid())
  returning id into v_payment;

  if e.id is null then
    insert into public.escrow_transactions (
      booking_id, client_id, vendor_id, funding_payment_id, currency,
      agreed_amount, commission_rate, commission_amount, psp_fee_rate, psp_fee_amount,
      gross_amount, advance_rate, advance_amount, balance_amount, net_payout_amount,
      advance_release_due_at, status, fx_rate_id, created_by)
    values (
      p_booking_id, auth.uid(), b.vendor_id, v_payment, q.currency,
      q.agreed_amount, q.commission_rate, q.commission_amount, q.psp_fee_rate, q.psp_fee_amount,
      q.gross_amount, q.advance_rate, q.advance_amount, q.balance_amount, q.agreed_amount,
      q.advance_release_due_at, 'initiated', v_fx, auth.uid())
    returning id into v_escrow;
  else
    -- Retry after a failure: re-price (rates may have moved), point at the new
    -- payment, bump the attempt counter. One escrow row per booking, always.
    update public.escrow_transactions
       set funding_payment_id = v_payment,
           currency           = q.currency,
           agreed_amount      = q.agreed_amount,
           commission_rate    = q.commission_rate,
           commission_amount  = q.commission_amount,
           psp_fee_rate       = q.psp_fee_rate,
           psp_fee_amount     = q.psp_fee_amount,
           gross_amount       = q.gross_amount,
           advance_rate       = q.advance_rate,
           advance_amount     = q.advance_amount,
           balance_amount     = q.balance_amount,
           net_payout_amount  = q.agreed_amount,
           advance_release_due_at = q.advance_release_due_at,
           status             = 'initiated',
           fx_rate_id         = v_fx,
           failure_reason     = null,
           attempt_no         = e.attempt_no + 1
     where id = e.id
    returning id into v_escrow;
  end if;

  update public.payments set escrow_id = v_escrow where id = v_payment;
  update public.bookings  set payment_type = 'escrow' where id = p_booking_id;

  perform public.escrow_notify(
    v_escrow, 'initiated', 'escrow.awaiting_payment',
    true, true, false, q.gross_amount,
    jsonb_build_object('provider', p_provider, 'method', p_method));

  return query select v_payment, v_escrow, q.gross_amount, q.currency;
end;$$;

-- ---------------------------------------------------------------------
-- Backfill.
--
-- Bookings confirmed before this migration have no window and would never get
-- one, since the trigger only fires on the transition. They get a full window
-- counted from now rather than from their original confirmation: the clock is
-- a promise made to the client, and one that expired before it was ever shown
-- to them is not a promise, it is a trap.
--
-- Silently. These clients are being given a deadline they did not previously
-- have, and the first they should hear of it is the reminder sweep on its
-- normal schedule — not a burst of mail timed to a deployment.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select b.id from public.bookings b
    where b.payment_type = 'escrow'
      and b.status = 'confirmed'
      and b.payment_terms_status = 'accepted'
      and b.payment_window_opened_at is null
      and b.deleted_at is null
      and not exists (select 1 from public.escrow_transactions e
                       where e.booking_id = b.id and e.status not in ('initiated', 'failed'))
  loop
    perform public.open_booking_payment_window(r.id, false);
  end loop;
end$$;
