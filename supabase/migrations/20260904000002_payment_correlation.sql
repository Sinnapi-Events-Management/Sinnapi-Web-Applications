-- =====================================================================
-- Sinnapi — 0904b Correlation: one id for the whole life of a payment
--
-- WHAT THIS IS FOR
-- 0904a makes each row say WHO acted. This makes the rows say they belong to
-- the same story. Today, reconstructing one checkout means seven queries
-- joined by hand on four different keys:
--
--   payments        by id
--   payment_logs    by payment_id — or, for the rows written before the
--                   payment is known, by `payload->>'orderTrackingId'`
--                   matched against provider_ref (0903j:325 does exactly this)
--   payment_events  by payment_id, or by event_id = provider_ref
--   ledger_entries  by payment_id or escrow_id
--   escrow_events   by escrow_id
--   outbox          by aggregate_id, which is sometimes the escrow, sometimes
--                   the subscription, and sometimes a recipient profile
--   audit_logs      by (entity_type, entity_id), once per entity involved
--
-- Every one of those joins is a guess that works until it doesn't. The
-- `payload->>'orderTrackingId'` fallback in `get_payment_admin` is the tell:
-- the IPN's log row is written BEFORE the payment is identified, so there was
-- no id to write and the reader has to reverse-engineer the link from a JSON
-- field. A correlation id written at the top of the flow removes the guess.
--
-- WHERE THE ID COMES FROM
-- Server-minted, in `activate_escrow` / `activate_subscription_payment`
-- (0904c), onto `payments.correlation_id`, and returned to the Edge Function
-- so it can thread it into the PSP order and every later call.
--
-- It is NOT the client's `Idempotency-Key`, though it plays the same role and
-- moves in lockstep with it. It cannot be: `newCheckoutAttemptKey()` falls
-- back to a non-UUID string in insecure contexts
-- (packages/ui/src/payments/rails.ts:76), and the header's accepted shape is
-- `[A-Za-z0-9._:-]{8,128}`, so the value is not a uuid and sometimes is not
-- even close. Minting server-side keeps the uuid type — which is what makes
-- these seven indexes cheap — while preserving the one property that matters:
-- an idempotent replay finds the payment row that already exists and returns
-- ITS correlation id, so a double-tapped Pay button still yields one trace.
--
-- SCOPE OF A TRACE: one payment attempt.
-- A payment that fails is retried as a NEW payments row — `record_payment_result`
-- is explicit that a failed payment never re-opens (0903i:225) and
-- `activate_escrow` releases the client key when it fails one — so the retry
-- gets a new correlation id. That is the right grain: the two attempts are
-- two separate stories about money, and an investigator asking "what happened
-- to this charge" means one of them. The booking still ties them together for
-- anyone who wants the wider view.
--
-- WHY NOT A FOREIGN KEY
-- `correlation_id` deliberately references nothing. It is a trace id, not a
-- relationship: `payment_logs` rows are written before the payment exists (an
-- IPN for an unknown merchant reference still gets logged), and an FK would
-- turn that log row — the single most valuable row in an incident where we do
-- not recognise a payment — into an insert failure.
-- =====================================================================

-- ---------------------------------------------------------------------
-- THE COLUMNS.
--
-- `audit_logs.correlation_id` already exists — 0904a added it so
-- `tg_write_audit` could be written once in its final form.
--
-- Six more here, one per remaining table in the trace. All nullable: most
-- ledger entries and outbox rows in this database were written before this
-- migration and have no trace, and a great many written after it legitimately
-- will not either (a booking status change is not a payment).
-- ---------------------------------------------------------------------
alter table public.payments        add column if not exists correlation_id uuid;
alter table public.payment_logs    add column if not exists correlation_id uuid;
alter table public.payment_events  add column if not exists correlation_id uuid;
alter table public.ledger_entries  add column if not exists correlation_id uuid;
alter table public.escrow_events   add column if not exists correlation_id uuid;
alter table public.outbox          add column if not exists correlation_id uuid;

-- ---------------------------------------------------------------------
-- `escrow_events` gains the actor kind too, for the same reason `audit_logs`
-- did: `escrow_notify` writes `actor_id = auth.uid()` (0809c:43), which is
-- NULL under every IPN and every lifecycle sweep. The domain event stream has
-- exactly the same blind spot as the audit trail and it is read by the same
-- people, so it gets the same fix rather than a different one.
-- ---------------------------------------------------------------------
alter table public.escrow_events
  add column if not exists actor_kind  audit_actor_kind,
  add column if not exists actor_label text;

-- ---------------------------------------------------------------------
-- BACKFILL.
--
-- Four of these seven tables are append-only (0618j:60-75): `ledger_entries`,
-- `escrow_events`, `payment_logs` and `audit_logs`. Backfilling them means
-- disabling `trg_append_only` for the duration and re-enabling it in the same
-- transaction — the same manoeuvre 0904a used, and for the same reason.
--
-- `payments.correlation_id` is backfilled to the payment's own id rather than
-- left null. A historical payment then has a trace like any other, and the
-- trace query (0904e) returns its logs, its events and its ledger entries
-- instead of an empty result that reads like "nothing happened". Using the
-- payment id is safe: it is a uuid, it is unique, and it can never collide
-- with a minted correlation id, which comes from `gen_random_uuid()`.
--
-- The satellite tables are backfilled by joining through `payment_id` where
-- they have one. Rows that do not — an IPN logged for an unrecognised
-- merchant reference, a ledger entry keyed only on an escrow — are left null.
-- Guessing a trace for those is exactly the reverse-engineering this
-- migration exists to stop doing.
-- ---------------------------------------------------------------------
update public.payments
   set correlation_id = id
 where correlation_id is null;

alter table public.payment_logs   disable trigger trg_append_only;
alter table public.ledger_entries disable trigger trg_append_only;
alter table public.escrow_events  disable trigger trg_append_only;

update public.payment_logs l
   set correlation_id = p.correlation_id
  from public.payments p
 where l.correlation_id is null and l.payment_id = p.id;

update public.ledger_entries e
   set correlation_id = p.correlation_id
  from public.payments p
 where e.correlation_id is null and e.payment_id = p.id;

-- Ledger legs posted against an escrow rather than a payment (the release and
-- payout legs) inherit the trace of the payment that FUNDED that escrow.
-- That is the correct answer, not an approximation: the money being released
-- is the money that arrived on that payment.
update public.ledger_entries e
   set correlation_id = p.correlation_id
  from public.escrow_transactions t
  join public.payments p on p.id = t.funding_payment_id
 where e.correlation_id is null
   and e.payment_id is null
   and e.escrow_id = t.id;

update public.escrow_events ev
   set correlation_id = p.correlation_id
  from public.escrow_transactions t
  join public.payments p on p.id = t.funding_payment_id
 where ev.correlation_id is null and ev.escrow_id = t.id;

-- Existing escrow events keep the same rule 0904a applied to audit rows:
-- an actor id means a person, its absence means the system acted.
update public.escrow_events
   set actor_kind = case when actor_id is not null then 'user' else 'system' end::audit_actor_kind
 where actor_kind is null;

alter table public.payment_logs   enable trigger trg_append_only;
alter table public.ledger_entries enable trigger trg_append_only;
alter table public.escrow_events  enable trigger trg_append_only;

-- `payment_events` and `outbox` are mutable (the webhook handlers stamp
-- `processed_at` on one, the dispatcher stamps `status` on the other), so no
-- trigger has to be moved aside for these two.
update public.payment_events ev
   set correlation_id = p.correlation_id
  from public.payments p
 where ev.correlation_id is null and ev.payment_id = p.id;

update public.outbox o
   set correlation_id = p.correlation_id
  from public.payments p
 where o.correlation_id is null
   and o.aggregate_type = 'payments'
   and o.aggregate_id = p.id;

update public.outbox o
   set correlation_id = p.correlation_id
  from public.escrow_transactions t
  join public.payments p on p.id = t.funding_payment_id
 where o.correlation_id is null
   and o.aggregate_type = 'escrow_transactions'
   and o.aggregate_id = t.id;

-- ---------------------------------------------------------------------
-- INDEXES.
--
-- One per table, all partial. The trace query looks each table up by
-- correlation id and by nothing else, and on six of the seven the column is
-- null for most rows — `outbox` and `audit_logs` especially, where the
-- overwhelming majority of traffic has nothing to do with money.
--
-- `payments` is the exception (every row now has one, from the backfill) but
-- the partial predicate costs nothing there and keeps the six declarations
-- reading identically.
-- ---------------------------------------------------------------------
create index if not exists ix_payments_correlation
  on public.payments(correlation_id) where correlation_id is not null;
create index if not exists ix_payment_logs_correlation
  on public.payment_logs(correlation_id) where correlation_id is not null;
create index if not exists ix_payment_events_correlation
  on public.payment_events(correlation_id) where correlation_id is not null;
create index if not exists ix_ledger_correlation
  on public.ledger_entries(correlation_id) where correlation_id is not null;
create index if not exists ix_escrow_events_correlation
  on public.escrow_events(correlation_id) where correlation_id is not null;
create index if not exists ix_outbox_correlation
  on public.outbox(correlation_id) where correlation_id is not null;

-- ---------------------------------------------------------------------
-- tg_enqueue_outbox — 0618b:210's body, plus the trace.
--
-- The outbox trigger is attached to `payments`, `escrow_transactions`,
-- `subscriptions`, `bookings` and five others (0618j:186). Where the changed
-- row carries a correlation id, the outbox row inherits it, so a notification
-- that went out because a payment succeeded is on the same trace as the
-- payment — which is the question support actually asks ("did the client ever
-- get told?").
--
-- Where the row has none, the transaction's own context supplies it: an
-- escrow row has no `correlation_id` column of its own, but the IPN that
-- funded it set one for the transaction, and that is the same answer.
-- ---------------------------------------------------------------------
create or replace function public.tg_enqueue_outbox()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event text := coalesce(tg_argv[0], tg_table_name || '_changed');
  v_corr  uuid;
begin
  v_corr := coalesce(
    public._try_uuid(to_jsonb(new) ->> 'correlation_id'),
    public._try_uuid(current_setting('sinnapi.correlation_id', true)));

  insert into public.outbox(aggregate_type, aggregate_id, event_type, payload,
                            status, available_at, correlation_id)
  values (tg_table_name, new.id, v_event, to_jsonb(new), 'pending', now(), v_corr);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- post_ledger — 0618n:36's body, plus the trace.
--
-- Same signature, so every existing call site keeps compiling. The trace is
-- read from the transaction context rather than added as a parameter: the
-- alternative is threading an extra argument through all eleven call sites in
-- `fund_escrow`, `release_advance`, `approve_escrow_release`, `approve_refund`
-- and the settlement RPCs, each of which is already inside the transaction
-- that set the context. An argument there would be the same value, written
-- eleven more times, with eleven more chances to forget one.
-- ---------------------------------------------------------------------
create or replace function public.post_ledger(
  p_group uuid, p_account ledger_account, p_direction ledger_direction,
  p_amount numeric, p_currency text, p_desc text,
  p_escrow uuid default null, p_payment uuid default null,
  p_payout uuid default null, p_refund uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into public.ledger_entries(entry_group_id, escrow_id, payment_id, payout_id, refund_id,
                                    account, direction, amount, currency, description,
                                    correlation_id)
  values (p_group, p_escrow, p_payment, p_payout, p_refund,
          p_account, p_direction, p_amount, p_currency, p_desc,
          public._try_uuid(current_setting('sinnapi.correlation_id', true)));
$$;

-- ---------------------------------------------------------------------
-- escrow_notify — 0809c:20's body, plus the trace, the actor kind, and a
-- context of its own.
--
-- The `escrow_events` insert used to write `auth.uid()` alone, which is null
-- under every IPN and every lifecycle sweep, so the domain event stream said
-- "initiated by nobody" for the majority of its own rows.
--
-- WHY THIS ONE TAKES A p_context WHEN post_ledger DOES NOT.
-- Almost every caller reaches it from inside a money RPC, already in a
-- contextualised transaction, and for those the argument is unnecessary —
-- `_payment_context()` reads what the RPC set. But `escrow-lifecycle` calls it
-- DIRECTLY over PostgREST to send a release reminder, and that is its own
-- transaction with no context in it. Without the argument, every reminder the
-- fifteen-minute sweep sends would write an `escrow_events` row attributed to
-- 'system' — indistinguishable from an IPN's, which is the defect. `post_ledger`
-- has no such caller: nothing outside the database has ever posted to the
-- ledger, and nothing should.
--
-- Adding the parameter creates an overload, so the 8-argument signature is
-- dropped first. Every internal caller passes 8 positional arguments and
-- resolves to the new function through the default.
--
-- The notification payload gains the correlation id too. It travels out to
-- the outbox and into the notification record, so a support agent holding a
-- notification can walk back to the trace it came from.
-- ---------------------------------------------------------------------
drop function if exists public.escrow_notify(
  uuid, escrow_event_type, text, boolean, boolean, boolean, numeric, jsonb);

create function public.escrow_notify(
  p_escrow_id  uuid,
  p_event      escrow_event_type,
  p_trigger    text,
  p_to_client  boolean default true,
  p_to_vendor  boolean default true,
  p_to_admin   boolean default false,
  p_amount     numeric default null,
  p_metadata   jsonb default '{}'::jsonb,
  p_context    jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  e         public.escrow_transactions;
  b         public.bookings;
  v_owner   uuid;
  v_payload jsonb;
  c         record;
  r         record;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if e.id is null then return; end if;
  select * into b from public.bookings where id = e.booking_id;
  select owner_id into v_owner from public.vendors where id = e.vendor_id;

  -- A null context leaves an outer one untouched (see `_set_payment_context`),
  -- so the overwhelmingly common case — called from inside a money RPC — is
  -- unaffected. Only a direct caller supplies one.
  perform public._set_payment_context(p_context, 'escrow_notify');
  perform public._ensure_correlation((
    select p.correlation_id from public.payments p where p.id = e.funding_payment_id));

  select * into c from public._payment_context();

  insert into public.escrow_events (escrow_id, event_type, actor_id, amount, metadata,
                                    actor_kind, actor_label, correlation_id)
  values (p_escrow_id, p_event, c.ctx_actor_id, p_amount, p_metadata,
          c.ctx_actor_kind, c.ctx_actor_label, c.ctx_correlation_id);

  v_payload := jsonb_build_object(
    'escrow_id',       e.id,
    'booking_id',      e.booking_id,
    'booking_ref',     b.reference_no,
    'event_date',      b.event_date,
    'vendor_id',       e.vendor_id,
    'client_id',       e.client_id,
    'currency',        e.currency,
    'agreed_amount',   e.agreed_amount,
    'gross_amount',    e.gross_amount,
    'advance_amount',  e.advance_amount,
    'balance_amount',  e.balance_amount,
    'commission_amount', e.commission_amount,
    'psp_fee_amount',  e.psp_fee_amount,
    'escrow_status',   e.status,
    'event_type',      p_event,
    'amount',          p_amount,
    'correlation_id',  c.ctx_correlation_id
  ) || coalesce(p_metadata, '{}'::jsonb);

  if p_to_client and e.client_id is not null then
    insert into public.outbox(aggregate_type, aggregate_id, event_type, payload,
                              status, available_at, correlation_id)
    values ('escrow_transactions', e.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', e.client_id, 'audience', 'client'),
            'pending', now(), c.ctx_correlation_id);
  end if;

  if p_to_vendor and v_owner is not null then
    insert into public.outbox(aggregate_type, aggregate_id, event_type, payload,
                              status, available_at, correlation_id)
    values ('escrow_transactions', e.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', v_owner, 'audience', 'vendor'),
            'pending', now(), c.ctx_correlation_id);
  end if;

  if p_to_admin then
    for r in
      select ur.profile_id
        from public.user_roles ur
        join public.roles ro on ro.id = ur.role_id
       where ro.is_admin
    loop
      insert into public.outbox(aggregate_type, aggregate_id, event_type, payload,
                                status, available_at, correlation_id)
      values ('escrow_transactions', e.id, p_trigger,
              v_payload || jsonb_build_object('recipient_id', r.profile_id, 'audience', 'admin'),
              'pending', now(), c.ctx_correlation_id);
    end loop;
  end if;
end;$$;

-- ---------------------------------------------------------------------
-- VERIFY the rewritten escrow_notify still fans out the way 0809c's did.
--
-- Its body was reproduced here from the original rather than patched in
-- place, which is the kind of edit that silently drops a branch. plpgsql
-- bodies are not resolved at CREATE time, so nothing above proves the
-- function even runs. This asserts the shape that matters: three audiences,
-- an escrow_events insert, and the admin fan-out loop.
-- ---------------------------------------------------------------------
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'escrow_notify';

  if v_def not like '%''client''%' or v_def not like '%''vendor''%'
     or v_def not like '%''admin''%' then
    raise exception 'escrow_notify lost an audience in the 0904b rewrite';
  end if;
  if v_def not like '%insert into public.escrow_events%' then
    raise exception 'escrow_notify no longer writes the escrow event stream';
  end if;

  -- Exactly one definition: the 8-argument signature was dropped above, and an
  -- overload left behind would make every PostgREST call to it ambiguous
  -- (PGRST203) — which would break the release reminders the lifecycle sweep
  -- sends, fifteen minutes after deploy rather than at deploy.
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'escrow_notify') <> 1 then
    raise exception 'escrow_notify has more than one definition (PGRST203)';
  end if;
end$$;

-- Reached directly by `escrow-lifecycle` to send a release reminder, and from
-- inside the money RPCs otherwise. Unchanged from 0809c apart from the new
-- signature the grant has to name.
revoke all on function public.escrow_notify(
  uuid, escrow_event_type, text, boolean, boolean, boolean, numeric, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.escrow_notify(
  uuid, escrow_event_type, text, boolean, boolean, boolean, numeric, jsonb, jsonb)
  to service_role;
