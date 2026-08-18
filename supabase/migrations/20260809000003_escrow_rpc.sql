-- =====================================================================
-- Sinnapi — Escrow v2, step 3: the money RPCs.
--
-- Rules every function here obeys:
--   * security definer + fixed search_path
--   * authorization re-checked inside, never assumed from RLS
--   * amounts derived server-side; nothing money-shaped is taken from a caller
--   * idempotent on every path a webhook or cron can re-enter
--   * ledger legs, escrow_events and notification fan-out share the money
--     transaction, so they cannot drift from it
-- =====================================================================

-- ---------------------------------------------------------------------
-- NOTIFICATION FAN-OUT
--
-- One call notifies every party that has standing in the event. Writes an
-- append-only escrow_events row and one outbox row per recipient in the same
-- transaction as the money move — if the money rolls back, so do the emails.
-- ---------------------------------------------------------------------
create or replace function public.escrow_notify(
  p_escrow_id  uuid,
  p_event      escrow_event_type,
  p_trigger    text,
  p_to_client  boolean default true,
  p_to_vendor  boolean default true,
  p_to_admin   boolean default false,
  p_amount     numeric default null,
  p_metadata   jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  e         public.escrow_transactions;
  b         public.bookings;
  v_owner   uuid;
  v_payload jsonb;
  r         record;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if e.id is null then return; end if;
  select * into b from public.bookings where id = e.booking_id;
  select owner_id into v_owner from public.vendors where id = e.vendor_id;

  insert into public.escrow_events (escrow_id, event_type, actor_id, amount, metadata)
  values (p_escrow_id, p_event, auth.uid(), p_amount, p_metadata);

  -- Everything a template or an in-app card could need, resolved once.
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
    'amount',          p_amount
  ) || coalesce(p_metadata, '{}'::jsonb);

  if p_to_client and e.client_id is not null then
    insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
    values ('escrow_transactions', e.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', e.client_id, 'audience', 'client'),
            'pending', now());
  end if;

  if p_to_vendor and v_owner is not null then
    insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
    values ('escrow_transactions', e.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', v_owner, 'audience', 'vendor'),
            'pending', now());
  end if;

  if p_to_admin then
    for r in
      select distinct ur.profile_id
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where p.key = 'escrow.read'
    loop
      insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
      values ('escrow_transactions', e.id, p_trigger,
              v_payload || jsonb_build_object('recipient_id', r.profile_id, 'audience', 'admin'),
              'pending', now());
    end loop;
  end if;
end;$$;

-- ---------------------------------------------------------------------
-- PRICING — the single source of truth for the on-top breakdown.
--
-- Pure and side-effect free, so the UI can preview the exact figures the
-- client will be charged without creating anything. activate_escrow calls
-- this same function, so a preview can never disagree with the charge.
-- ---------------------------------------------------------------------
create or replace function public.escrow_price_booking(
  p_booking_id uuid,
  p_provider   payment_provider default 'pesapal',
  p_method     payment_method   default 'mtn_momo')
returns table (
  agreed_amount     numeric,
  commission_rate   numeric,
  commission_amount numeric,
  psp_fee_rate      numeric,
  psp_fee_amount    numeric,
  gross_amount      numeric,
  advance_rate      numeric,
  advance_amount    numeric,
  balance_amount    numeric,
  currency          text,
  advance_release_days_before integer,
  advance_release_due_at      timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  b        public.bookings;
  v_comm_r numeric;
  v_comm   numeric;
  v_fee_r  numeric;
  v_fee    numeric;
  v_adv_r  numeric;
  v_adv    numeric;
  v_days   integer;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;

  -- Visible to the two parties to the booking and to Finance. Pricing leaks
  -- the vendor's agreed rate, so it is not public.
  if not (b.client_id = auth.uid()
          or public.is_vendor_owner(b.vendor_id)
          or public.has_permission('escrow.read')) then
    perform public._forbidden();
  end if;

  v_comm_r := public.get_commission_rate();
  v_comm   := round(b.amount * v_comm_r / 100, 2);

  -- Estimated at checkout from the configured rate for this rail; the actual
  -- fee is only known at settlement and is reconciled as a variance later.
  v_fee_r := coalesce(
    (public.get_setting('psp_fee_rates') #>> array[p_provider::text, p_method::text])::numeric,
    0);
  v_fee := round((b.amount + v_comm) * v_fee_r / 100, 2);

  v_adv_r := coalesce(b.advance_rate,
                      (public.get_setting('advance_rate_default') #>> '{}')::numeric, 0);
  v_adv   := round(b.amount * v_adv_r / 100, 2);

  v_days := coalesce(b.advance_release_days_before,
                     (public.get_setting('advance_release_days_default') #>> '{}')::integer, 7);

  return query select
    b.amount,
    v_comm_r,
    v_comm,
    v_fee_r,
    v_fee,
    -- Sum of already-rounded components; never re-round the total, or the
    -- parts stop adding up to the whole.
    b.amount + v_comm + v_fee,
    v_adv_r,
    v_adv,
    -- Subtraction, not a second rounding, so the tranches sum exactly.
    b.amount - v_adv,
    b.currency,
    v_days,
    (b.event_date - make_interval(days => v_days))::timestamptz;
end;$$;

-- ---------------------------------------------------------------------
-- CLIENT ACCEPTS THE ADVANCE TERMS
--
-- A distinct, recorded act of consent. Without it activate_escrow refuses,
-- so no client can be charged under a payout schedule they never saw.
-- ---------------------------------------------------------------------
create or replace function public.accept_advance_terms(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; v_max numeric; v_max_days integer;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.advance_terms_accepted_at is not null then return; end if;  -- idempotent

  -- Re-validate against the live ceilings: the quotation may have been drafted
  -- before an admin tightened them.
  v_max      := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::integer, 30);

  if coalesce(b.advance_rate, 0) > v_max then
    raise exception 'advance_rate_above_platform_max: % > %', b.advance_rate, v_max;
  end if;
  if coalesce(b.advance_release_days_before, 0) > v_max_days then
    raise exception 'advance_release_days_above_platform_max: % > %',
      b.advance_release_days_before, v_max_days;
  end if;

  update public.bookings
     set advance_terms_accepted_at = now(), advance_terms_accepted_by = auth.uid()
   where id = p_booking_id;
end;$$;

-- ---------------------------------------------------------------------
-- ACTIVATE ESCROW
--
-- Replaces create_payment_intent for the escrow purpose. The old version took
-- the amount from the caller (a client could fund a 200,000 booking with 1)
-- and inserted a fresh escrow row per attempt, which tripped the unique index
-- on booking_id and left a failed payment un-retryable. This derives every
-- figure from the booking and reuses the escrow row across attempts.
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

-- Attach the provider's reference as soon as checkout is created. Without
-- this the reconciliation sweep cannot re-query a stuck payment, which is why
-- it silently skipped every one of them.
create or replace function public.attach_payment_provider_ref(
  p_payment_id uuid, p_provider_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.payments
     set provider_ref = p_provider_ref,
         status = case when status = 'pending' then 'processing' else status end
   where id = p_payment_id and provider_ref is null;
end;$$;
revoke all on function public.attach_payment_provider_ref(uuid, text) from anon, authenticated;
grant execute on function public.attach_payment_provider_ref(uuid, text) to service_role;

-- ---------------------------------------------------------------------
-- RECORD PAYMENT RESULT  (webhooks + reconciliation, service_role only)
--
-- Terminal states are absorbing: a late or out-of-order delivery can never
-- walk a succeeded payment back to failed, or resurrect a refunded one.
-- ---------------------------------------------------------------------
create or replace function public.record_payment_result(
  p_payment_id   uuid,
  p_status       payment_status,
  p_provider_ref text default null,
  p_reason       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.payments;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if p.id is null then raise exception 'not_found'; end if;
  if p.status = p_status then return; end if;                       -- idempotent

  -- 'refunded' is the one transition allowed out of 'succeeded'; everything
  -- else out of a terminal state is a stale delivery and is dropped.
  if p.status in ('succeeded', 'refunded')
     and not (p.status = 'succeeded' and p_status in ('refunded', 'partially_refunded')) then
    return;
  end if;
  -- A failed payment is retried as a NEW payment row, so it never re-opens.
  if p.status = 'failed' and p_status <> 'failed' then return; end if;

  update public.payments
     set status         = p_status,
         provider_ref   = coalesce(p_provider_ref, provider_ref),
         failure_reason = p_reason,
         paid_at        = case when p_status = 'succeeded' then now() else paid_at end
   where id = p_payment_id;

  if p_status = 'succeeded' then
    if p.purpose = 'escrow_funding' and p.escrow_id is not null then
      perform public.fund_escrow(p.escrow_id);
    elsif p.purpose = 'subscription' and p.subscription_id is not null then
      perform public.activate_subscription(p.subscription_id, p.id);
    end if;

  elsif p_status = 'failed' and p.escrow_id is not null then
    update public.escrow_transactions
       set status = 'initiated', failure_reason = p_reason
     where id = p.escrow_id and status in ('initiated', 'failed');
    perform public.escrow_notify(
      p.escrow_id, 'payment_failed', 'escrow.payment_failed',
      true, false, true, p.amount, jsonb_build_object('reason', p_reason));

  elsif p_status = 'refunded' and p.escrow_id is not null then
    -- Pesapal status 3 (REVERSED) lands here. Money we thought we held is
    -- gone: freeze the escrow and put a human on it rather than proceeding.
    update public.escrow_transactions
       set status = 'failed', failure_reason = coalesce(p_reason, 'psp_reversal')
     where id = p.escrow_id;
    perform public.escrow_notify(
      p.escrow_id, 'payment_reversed', 'escrow.payment_reversed',
      true, true, true, p.amount, jsonb_build_object('reason', p_reason));
    perform public.raise_reconciliation_exception(
      'psp_amount_mismatch', 'payment:' || p.id::text || ':reversed',
      'PSP reversed a payment that had already funded escrow',
      jsonb_build_object('payment_id', p.id), p.amount, 0, p.escrow_id, p.id);
  end if;
end;$$;
revoke all on function public.record_payment_result(uuid, payment_status, text, text) from anon, authenticated;
grant execute on function public.record_payment_result(uuid, payment_status, text, text) to service_role;

-- ---------------------------------------------------------------------
-- FUND ESCROW — money has landed. Rates are already snapshotted by
-- activate_escrow, so this only posts the ledger and starts the clocks.
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

  perform public.escrow_notify(
    p_escrow_id, 'funded', 'escrow.funded', true, true, true, e.gross_amount,
    jsonb_build_object('advance_release_due_at', e.advance_release_due_at));
end;$$;
revoke all on function public.fund_escrow(uuid) from anon, authenticated;
grant execute on function public.fund_escrow(uuid) to service_role;

-- ---------------------------------------------------------------------
-- RELEASE THE ADVANCE — cron-driven, once advance_release_due_at passes.
--
-- Raises the advance payout for Finance to settle by hand. Moves value from
-- the held pool to vendor_payable; nothing leaves the platform until a
-- settlement is recorded and independently approved.
-- ---------------------------------------------------------------------
create or replace function public.release_advance(p_escrow_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e       public.escrow_transactions;
  v_grp   uuid;
  v_payout uuid;
  v_bank  uuid;
  v_label text;
  v_blocked text;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status not in ('held', 'awaiting_advance') then return null; end if;
  if e.advance_released_at is not null then return null; end if;    -- idempotent
  if e.timers_frozen_at is not null then return null; end if;       -- dispute open
  if e.advance_amount <= 0 then
    update public.escrow_transactions set status = 'held', advance_released_at = now()
     where id = p_escrow_id;
    return null;
  end if;

  select ba.id, ba.bank_name || ' ••••' || coalesce(ba.account_number_last4, '')
    into v_bank, v_label
  from public.vendor_bank_accounts ba
  where ba.vendor_id = e.vendor_id and ba.is_primary and ba.deleted_at is null
  limit 1;

  -- The old release path used `insert ... select` over this same lookup, so a
  -- vendor without a primary account produced zero rows and left the escrow
  -- approved with no payout and no error. Raise it either way and say why.
  if v_bank is null then
    v_blocked := 'vendor_has_no_primary_bank_account';
  end if;

  insert into public.payouts (vendor_id, escrow_id, bank_account_id, amount, currency,
      kind, status, requested_by, destination_label, blocked_reason, due_at)
  values (e.vendor_id, e.id, v_bank, e.advance_amount, e.currency,
      'advance', 'requested', auth.uid(), v_label, v_blocked, now())
  returning id into v_payout;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp, 'escrow_held',    'debit',  e.advance_amount, e.currency,
                             'Advance tranche due', p_escrow_id, null, v_payout);
  perform public.post_ledger(v_grp, 'vendor_payable', 'credit', e.advance_amount, e.currency,
                             'Advance tranche due', p_escrow_id, null, v_payout);
  perform public.assert_balanced(v_grp);

  update public.escrow_transactions
     set status = 'advance_released', advance_released_at = now()
   where id = p_escrow_id;

  perform public.escrow_notify(
    p_escrow_id, 'advance_scheduled', 'escrow.advance_scheduled',
    false, true, true, e.advance_amount,
    jsonb_build_object('payout_id', v_payout, 'blocked_reason', v_blocked));

  return v_payout;
end;$$;
revoke all on function public.release_advance(uuid) from anon, authenticated;
grant execute on function public.release_advance(uuid) to service_role;

-- ---------------------------------------------------------------------
-- CLIENT CONFIRMS THE SERVICE — the maker half of the balance release.
-- ---------------------------------------------------------------------
create or replace function public.client_confirm_release(p_escrow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; b public.bookings;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.client_id <> auth.uid() then perform public._forbidden(); end if;
  if e.status = 'release_requested' then return; end if;            -- idempotent
  if e.status not in ('held', 'advance_released') then
    raise exception 'invalid_state: %', e.status;
  end if;

  select * into b from public.bookings where id = e.booking_id;
  if b.status <> 'completed' then raise exception 'booking_not_completed'; end if;

  update public.escrow_transactions
     set status = 'release_requested', client_confirmed_at = now()
   where id = p_escrow_id;

  perform public.escrow_notify(
    p_escrow_id, 'release_requested', 'escrow.release_requested',
    true, true, true, e.balance_amount, jsonb_build_object('source', 'client'));
end;$$;

-- Cron path when the client goes quiet. Identical downstream: a Finance admin
-- still approves, so this only breaks the stalemate — it moves no money.
create or replace function public.auto_request_release(p_escrow_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then return; end if;
  if e.status not in ('held', 'advance_released') then return; end if;
  if e.timers_frozen_at is not null then return; end if;
  if e.auto_release_due_at is null or e.auto_release_due_at > now() then return; end if;

  update public.escrow_transactions
     set status = 'release_requested', client_confirmed_at = null
   where id = p_escrow_id;

  perform public.escrow_notify(
    p_escrow_id, 'auto_release_triggered', 'escrow.auto_release_triggered',
    true, true, true, e.balance_amount, jsonb_build_object('source', 'auto'));
end;$$;
revoke all on function public.auto_request_release(uuid) from anon, authenticated;
grant execute on function public.auto_request_release(uuid) to service_role;

-- ---------------------------------------------------------------------
-- ADMIN APPROVES THE RELEASE — the checker half.
--
-- This is where the held pool finally splits three ways: what the vendor is
-- still owed, Sinnapi's commission, and the processing fee the client paid
-- through. Under the on-top model the vendor's total across both tranches
-- equals the agreed amount exactly.
-- ---------------------------------------------------------------------
create or replace function public.approve_escrow_release(p_escrow_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e        public.escrow_transactions;
  v_grp    uuid;
  v_payout uuid;
  v_bank   uuid;
  v_label  text;
  v_blocked text;
  v_held   numeric;
begin
  if not public.has_permission('escrow.release') then perform public._forbidden(); end if;

  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status <> 'release_requested' then
    raise exception 'invalid_state: need client confirmation or auto-release first (%)', e.status;
  end if;

  select ba.id, ba.bank_name || ' ••••' || coalesce(ba.account_number_last4, '')
    into v_bank, v_label
  from public.vendor_bank_accounts ba
  where ba.vendor_id = e.vendor_id and ba.is_primary and ba.deleted_at is null
  limit 1;
  if v_bank is null then v_blocked := 'vendor_has_no_primary_bank_account'; end if;

  update public.escrow_transactions
     set status = 'payout_approved',
         admin_approved_by = auth.uid(),
         admin_approved_at = now(),
         balance_released_at = now()
   where id = p_escrow_id;

  -- Whatever is still in the pool: the balance if the advance already left it,
  -- the whole agreed amount plus fees if it never did.
  v_held := e.balance_amount + e.commission_amount + e.psp_fee_amount
            + case when e.advance_released_at is null then e.advance_amount else 0 end;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp, 'escrow_held', 'debit', v_held, e.currency,
                             'Escrow released', p_escrow_id);
  perform public.post_ledger(v_grp, 'vendor_payable', 'credit',
                             e.balance_amount
                               + case when e.advance_released_at is null then e.advance_amount else 0 end,
                             e.currency, 'Vendor balance', p_escrow_id);
  if e.commission_amount > 0 then
    perform public.post_ledger(v_grp, 'commission_revenue', 'credit', e.commission_amount,
                               e.currency, 'Platform commission', p_escrow_id);
  end if;
  if e.psp_fee_amount > 0 then
    -- The client paid this through to the processor; it is recognised as an
    -- expense against the fee they contributed, not as Sinnapi margin.
    perform public.post_ledger(v_grp, 'psp_fee_expense', 'credit', e.psp_fee_amount,
                               e.currency, 'Processing fee recovered', p_escrow_id);
  end if;
  perform public.assert_balanced(v_grp);

  insert into public.payouts (vendor_id, escrow_id, bank_account_id, amount, currency,
      kind, status, requested_by, destination_label, blocked_reason, due_at)
  values (e.vendor_id, e.id, v_bank,
      e.balance_amount + case when e.advance_released_at is null then e.advance_amount else 0 end,
      e.currency, 'balance', 'requested', auth.uid(), v_label, v_blocked, now())
  returning id into v_payout;

  perform public.escrow_notify(
    p_escrow_id, 'payout_approved', 'escrow.release_approved',
    true, true, true, e.balance_amount, jsonb_build_object('payout_id', v_payout));

  return v_payout;
end;$$;

-- ---------------------------------------------------------------------
-- MANUAL SETTLEMENT — maker records, checker approves.
--
-- Sinnapi operates no payout API. Finance transfers by bank, mobile money,
-- merchant or cash, then evidences it here. Proof is mandatory: cash in
-- particular has no provider reference to fall back on.
-- ---------------------------------------------------------------------
create or replace function public.record_payout_settlement(
  p_payout_id      uuid,
  p_method         settlement_method,
  p_reference      text,
  p_proof_path     text,
  p_proof_file_name text default null,
  p_destination    text default null,
  p_notes          text default null)
returns void language plpgsql security definer set search_path = public as $$
declare po public.payouts;
begin
  if not public.has_permission('payout.settle') then perform public._forbidden(); end if;

  select * into po from public.payouts where id = p_payout_id for update;
  if po.id is null then raise exception 'not_found'; end if;
  if po.status not in ('requested', 'approved') then
    raise exception 'invalid_state: %', po.status;
  end if;
  if po.blocked_reason is not null then
    raise exception 'payout_blocked: %', po.blocked_reason;
  end if;
  if coalesce(trim(p_reference), '') = '' then raise exception 'reference_required'; end if;
  if coalesce(trim(p_proof_path), '') = '' then raise exception 'proof_required'; end if;

  update public.payouts
     set status               = 'settlement_recorded',
         settlement_method    = p_method,
         settlement_reference = p_reference,
         proof_path           = p_proof_path,
         proof_file_name      = p_proof_file_name,
         destination_label    = coalesce(p_destination, destination_label),
         notes                = p_notes,
         recorded_by          = auth.uid(),
         recorded_at          = now()
   where id = p_payout_id;
end;$$;

create or replace function public.approve_payout_settlement(p_payout_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare po public.payouts; e public.escrow_transactions; v_grp uuid;
begin
  if not public.has_permission('payout.settle.approve') then perform public._forbidden(); end if;

  select * into po from public.payouts where id = p_payout_id for update;
  if po.id is null then raise exception 'not_found'; end if;
  if po.status = 'completed' then return; end if;                   -- idempotent
  if po.status <> 'settlement_recorded' then
    raise exception 'invalid_state: settlement must be recorded first (%)', po.status;
  end if;
  -- Enforced by a table constraint too; re-checked here so the error is
  -- meaningful rather than a raw constraint violation.
  if po.recorded_by = auth.uid() then
    raise exception 'segregation_of_duties: approver must differ from the recorder';
  end if;

  update public.payouts
     set status = 'completed', approved_by = auth.uid(), approved_at = now(),
         completed_at = now(), settled_at = now()
   where id = p_payout_id;

  -- The money is now genuinely out of the platform.
  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp, 'vendor_payable', 'debit',  po.amount, po.currency,
                             'Payout settled', po.escrow_id, null, po.id);
  perform public.post_ledger(v_grp, 'psp_clearing',   'credit', po.amount, po.currency,
                             'Payout settled', po.escrow_id, null, po.id);
  perform public.assert_balanced(v_grp);

  select * into e from public.escrow_transactions where id = po.escrow_id for update;

  if po.kind = 'balance' then
    update public.escrow_transactions
       set status = 'paid_out', released_at = now()
     where id = po.escrow_id;
    perform public.escrow_notify(
      po.escrow_id, 'balance_settled', 'escrow.balance_settled',
      true, true, true, po.amount, jsonb_build_object('payout_id', po.id, 'method', po.settlement_method));
  elsif po.kind = 'advance' then
    perform public.escrow_notify(
      po.escrow_id, 'advance_settled', 'escrow.advance_settled',
      true, true, false, po.amount, jsonb_build_object('payout_id', po.id, 'method', po.settlement_method));
  end if;
end;$$;

-- ---------------------------------------------------------------------
-- BOOKING COMPLETION starts the confirmation clock.
-- ---------------------------------------------------------------------
create or replace function public.start_escrow_release_window(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_days integer;
begin
  v_days := coalesce((public.get_setting('escrow_auto_release_days') #>> '{}')::integer, 7);
  update public.escrow_transactions
     set auto_release_due_at = now() + make_interval(days => v_days),
         last_reminder_day   = null
   where booking_id = p_booking_id
     and status in ('held', 'awaiting_advance', 'advance_released')
     and auto_release_due_at is null;
end;$$;

create or replace function public.tg_escrow_release_window()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and coalesce(old.status, 'requested') <> 'completed' then
    perform public.start_escrow_release_window(new.id);
  end if;
  return new;
end;$$;

drop trigger if exists trg_escrow_release_window on public.bookings;
create trigger trg_escrow_release_window
  after update on public.bookings
  for each row execute function public.tg_escrow_release_window();

-- ---------------------------------------------------------------------
-- RECONCILIATION EXCEPTIONS — nothing here corrects money, it queues it.
-- ---------------------------------------------------------------------
create or replace function public.raise_reconciliation_exception(
  p_kind       reconciliation_kind,
  p_dedupe_key text,
  p_detail     text,
  p_metadata   jsonb    default '{}'::jsonb,
  p_expected   numeric  default null,
  p_actual     numeric  default null,
  p_escrow_id  uuid     default null,
  p_payment_id uuid     default null,
  p_payout_id  uuid     default null,
  p_severity   text     default 'warning')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.reconciliation_exceptions (
    kind, dedupe_key, detail, metadata, expected, actual,
    escrow_id, payment_id, payout_id, severity)
  values (p_kind, p_dedupe_key, p_detail, p_metadata, p_expected, p_actual,
          p_escrow_id, p_payment_id, p_payout_id, p_severity)
  on conflict (dedupe_key) where status in ('open', 'investigating')
  do update set last_seen_at = now(),
                occurrences  = reconciliation_exceptions.occurrences + 1,
                actual       = excluded.actual,
                detail       = excluded.detail
  returning id into v_id;
  return v_id;
end;$$;
revoke all on function public.raise_reconciliation_exception(
  reconciliation_kind, text, text, jsonb, numeric, numeric, uuid, uuid, uuid, text) from anon, authenticated;
grant execute on function public.raise_reconciliation_exception(
  reconciliation_kind, text, text, jsonb, numeric, numeric, uuid, uuid, uuid, text) to service_role;

create or replace function public.resolve_reconciliation_exception(
  p_id uuid, p_status reconciliation_status, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('finance.reconcile') then perform public._forbidden(); end if;
  update public.reconciliation_exceptions
     set status = p_status, resolved_by = auth.uid(), resolved_at = now(),
         resolution_notes = p_notes
   where id = p_id;
end;$$;

-- ---------------------------------------------------------------------
-- DISPUTES — opening one freezes both timers.
--
-- Without this the advance could be released, or the balance auto-requested,
-- while the parties are still arguing about whether the service happened.
-- ---------------------------------------------------------------------
create or replace function public.open_dispute(p_escrow_id uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.escrow_transactions; v_id uuid; v_sla int; v_against uuid; v_owner uuid;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id for update;
  if e.id is null then raise exception 'not_found'; end if;
  select owner_id into v_owner from public.vendors where id = e.vendor_id;
  if not (e.client_id = auth.uid() or public.is_vendor_owner(e.vendor_id)) then
    perform public._forbidden();
  end if;
  if e.status in ('paid_out', 'refunded') then raise exception 'escrow_closed'; end if;

  v_sla := 72;
  v_against := case when e.client_id = auth.uid() then v_owner else e.client_id end;

  insert into public.disputes (escrow_id, booking_id, raised_by, against_id, reason, status, sla_due_at)
  values (p_escrow_id, e.booking_id, auth.uid(), v_against, p_reason, 'open',
          now() + make_interval(hours => v_sla))
  returning id into v_id;

  update public.escrow_transactions
     set status = 'disputed', timers_frozen_at = now()
   where id = p_escrow_id;

  perform public.escrow_notify(
    p_escrow_id, 'disputed', 'escrow.dispute_opened', true, true, true, null,
    jsonb_build_object('dispute_id', v_id, 'reason', p_reason, 'sla_hours', v_sla));

  return v_id;
end;$$;

-- The 3-argument version from 0014 knew nothing about frozen timers. Ours adds
-- a defaulted 4th argument, which makes any 3-argument call ambiguous between
-- the two — so the old one goes before the new one is defined.
drop function if exists public.resolve_dispute(uuid, dispute_status, text);

-- Resolving returns the escrow to whichever state it was in and restarts the
-- clocks. p_restore_status names that state so a dispute raised before the
-- advance went out doesn't accidentally resume as if it had.
create or replace function public.resolve_dispute(
  p_dispute_id     uuid,
  p_status         dispute_status,
  p_notes          text,
  p_restore_status escrow_status default 'held')
returns void language plpgsql security definer set search_path = public as $$
declare d public.disputes; e public.escrow_transactions;
begin
  if not public.has_permission('dispute.manage') then perform public._forbidden(); end if;

  select * into d from public.disputes where id = p_dispute_id for update;
  if d.id is null then raise exception 'not_found'; end if;
  if d.status in ('resolved_refund', 'resolved_release', 'resolved_partial', 'closed') then
    return;                                                          -- idempotent
  end if;

  update public.disputes
     set status = p_status, resolution_notes = p_notes,
         resolved_by = auth.uid(), resolved_at = now()
   where id = p_dispute_id;

  select * into e from public.escrow_transactions where id = d.escrow_id for update;

  -- A refund resolution leaves the status to approve_refund; the others hand
  -- the escrow back to its normal flow with the timers running again.
  if p_status <> 'resolved_refund' then
    update public.escrow_transactions
       set status = p_restore_status, timers_frozen_at = null
     where id = d.escrow_id;
  else
    update public.escrow_transactions set timers_frozen_at = null where id = d.escrow_id;
  end if;

  perform public.escrow_notify(
    d.escrow_id, 'admin_review', 'escrow.dispute_resolved', true, true, true, null,
    jsonb_build_object('dispute_id', p_dispute_id, 'resolution', p_status, 'notes', p_notes));
end;$$;

-- ---------------------------------------------------------------------
-- REFUNDS — composition comes from the reason, capped by what is still held.
--
-- The client paid three components; which of them come back depends on who
-- was at fault. platform_settings.refund_policy holds the percentage of each
-- per reason, and the approving admin may override the computed total.
-- ---------------------------------------------------------------------
create or replace function public.escrow_refund_quote(
  p_escrow_id uuid, p_reason refund_reason)
returns table (
  agreed_component     numeric,
  commission_component numeric,
  psp_fee_component    numeric,
  total                numeric,
  refundable_ceiling   numeric,
  shortfall_amount     numeric,
  currency             text)
language plpgsql stable security definer set search_path = public as $$
declare
  e        public.escrow_transactions;
  v_policy jsonb;
  v_a numeric; v_c numeric; v_f numeric; v_total numeric;
  v_settled numeric; v_ceiling numeric;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if e.id is null then raise exception 'not_found'; end if;
  if not (e.client_id = auth.uid()
          or public.is_vendor_owner(e.vendor_id)
          or public.has_permission('refund.approve')) then
    perform public._forbidden();
  end if;

  v_policy := public.get_setting('refund_policy') -> p_reason::text;

  v_a := round(e.agreed_amount     * coalesce((v_policy #>> '{agreed}')::numeric, 0)     / 100, 2);
  v_c := round(e.commission_amount * coalesce((v_policy #>> '{commission}')::numeric, 0) / 100, 2);
  v_f := round(e.psp_fee_amount    * coalesce((v_policy #>> '{psp_fee}')::numeric, 0)    / 100, 2);
  v_total := v_a + v_c + v_f;

  -- Only money still on the platform can be returned. Anything already
  -- settled to the vendor is a recovery matter, surfaced rather than hidden.
  select coalesce(sum(amount), 0) into v_settled
  from public.payouts
  where escrow_id = p_escrow_id and status = 'completed';

  v_ceiling := greatest(e.gross_amount - v_settled, 0);

  return query select
    v_a, v_c, v_f,
    least(v_total, v_ceiling),
    v_ceiling,
    greatest(v_total - v_ceiling, 0),
    e.currency;
end;$$;

create or replace function public.request_refund(
  p_escrow_id uuid,
  p_reason    refund_reason,
  p_notes     text default null,
  p_dispute_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e public.escrow_transactions;
  q record;
  v_id uuid;
  v_quoted numeric;
  v_a numeric; v_c numeric; v_f numeric;
begin
  select * into e from public.escrow_transactions where id = p_escrow_id;
  if e.id is null then raise exception 'not_found'; end if;
  if not (e.client_id = auth.uid() or public.has_permission('refund.approve')) then
    perform public._forbidden();
  end if;
  if exists (select 1 from public.refunds
             where escrow_id = p_escrow_id and status in ('requested', 'approved', 'settlement_recorded')) then
    raise exception 'refund_already_in_progress';
  end if;

  select * into q from public.escrow_refund_quote(p_escrow_id, p_reason);

  -- The quote reports each component at its policy value but caps `total` at
  -- what is still held. When the cap bites, the components must be scaled to
  -- match or the ck_refunds_component_identity constraint rejects the row —
  -- and that check fires on INSERT, so this cannot be fixed up afterwards.
  v_quoted := q.agreed_component + q.commission_component + q.psp_fee_component;

  if v_quoted <= 0 then
    v_a := 0; v_c := 0; v_f := 0;
  elsif q.total >= v_quoted then
    v_a := q.agreed_component; v_c := q.commission_component; v_f := q.psp_fee_component;
  else
    v_a := round(q.agreed_component     * q.total / v_quoted, 2);
    v_c := round(q.commission_component * q.total / v_quoted, 2);
    -- The last component absorbs the rounding drift so the three sum exactly.
    v_f := q.total - v_a - v_c;
  end if;

  insert into public.refunds (escrow_id, dispute_id, client_id, amount, currency, type,
      reason, reason_code, status, requested_by,
      agreed_component, commission_component, psp_fee_component,
      refundable_ceiling, shortfall_amount)
  values (p_escrow_id, p_dispute_id, e.client_id, q.total, q.currency,
      case when q.total >= e.gross_amount then 'full'::refund_type else 'partial'::refund_type end,
      p_notes, p_reason, 'requested', auth.uid(),
      v_a, v_c, v_f,
      q.refundable_ceiling, q.shortfall_amount)
  returning id into v_id;

  if q.shortfall_amount > 0 then
    perform public.raise_reconciliation_exception(
      'missing_payout', 'refund:' || v_id::text || ':shortfall',
      format('Refund of %s exceeds what is still held by %s — already settled to the vendor',
             q.total, q.shortfall_amount),
      jsonb_build_object('refund_id', v_id, 'reason', p_reason),
      q.total, q.refundable_ceiling, p_escrow_id, null, null, 'critical');
  end if;

  perform public.escrow_notify(
    p_escrow_id, 'refund_requested', 'escrow.refund_requested', true, true, true, q.total,
    jsonb_build_object('refund_id', v_id, 'reason', p_reason, 'shortfall', q.shortfall_amount));

  return v_id;
end;$$;

create or replace function public.approve_refund(
  p_refund_id uuid, p_override_amount numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.refunds;
  e public.escrow_transactions;
  v_grp uuid;
  v_amt numeric;
  v_quoted numeric;
  v_a numeric; v_c numeric; v_f numeric;
begin
  if not public.has_permission('refund.approve') then perform public._forbidden(); end if;

  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status <> 'requested' then return; end if;                    -- idempotent
  if r.requested_by = auth.uid() then
    raise exception 'segregation_of_duties: approver must differ from requester';
  end if;

  select * into e from public.escrow_transactions where id = r.escrow_id for update;

  v_amt := coalesce(p_override_amount, r.amount);
  if v_amt <= 0 then raise exception 'invalid_amount'; end if;
  if v_amt > coalesce(r.refundable_ceiling, e.gross_amount) then
    raise exception 'refund_exceeds_held_funds: % > %', v_amt, r.refundable_ceiling;
  end if;

  -- Keep the identity intact when an admin overrides the total. Scaling all
  -- three rather than forcing the difference onto the fee component: a smaller
  -- override would otherwise drive that component negative, which reads as a
  -- charge to the client in any report that sums the components.
  v_quoted := r.agreed_component + r.commission_component + r.psp_fee_component;
  if v_quoted <= 0 then
    v_a := v_amt; v_c := 0; v_f := 0;
  else
    v_a := round(r.agreed_component     * v_amt / v_quoted, 2);
    v_c := round(r.commission_component * v_amt / v_quoted, 2);
    v_f := v_amt - v_a - v_c;
  end if;

  update public.refunds
     set status = 'approved', approved_by = auth.uid(), approved_at = now(),
         amount = v_amt,
         agreed_component = v_a,
         commission_component = v_c,
         psp_fee_component = v_f
   where id = p_refund_id;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp, 'escrow_held',    'debit',  v_amt, r.currency,
                             'Refund approved', e.id, null, null, p_refund_id);
  perform public.post_ledger(v_grp, 'refund_payable', 'credit', v_amt, r.currency,
                             'Refund approved', e.id, null, null, p_refund_id);
  perform public.assert_balanced(v_grp);

  update public.escrow_transactions
     set status = case when v_amt >= e.gross_amount then 'refunded'::escrow_status
                       else 'partially_refunded'::escrow_status end,
         timers_frozen_at = now()
   where id = e.id;

  perform public.escrow_notify(
    e.id, case when v_amt >= e.gross_amount then 'refunded'::escrow_event_type
               else 'partially_refunded'::escrow_event_type end,
    'escrow.refund_approved', true, true, true, v_amt,
    jsonb_build_object('refund_id', p_refund_id));
end;$$;

-- Finance moves the money back to the client by hand, same evidence rules as
-- a payout, then a second admin signs it off.
create or replace function public.record_refund_settlement(
  p_refund_id  uuid,
  p_method     settlement_method,
  p_reference  text,
  p_proof_path text,
  p_notes      text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.refunds;
begin
  if not public.has_permission('payout.settle') then perform public._forbidden(); end if;
  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status <> 'approved' then raise exception 'invalid_state: %', r.status; end if;
  if coalesce(trim(p_reference), '') = '' then raise exception 'reference_required'; end if;
  if coalesce(trim(p_proof_path), '') = '' then raise exception 'proof_required'; end if;

  update public.refunds
     set status = 'settlement_recorded', settlement_method = p_method,
         settlement_reference = p_reference, proof_path = p_proof_path,
         reason = coalesce(p_notes, reason),
         recorded_by = auth.uid(), recorded_at = now()
   where id = p_refund_id;
end;$$;

create or replace function public.approve_refund_settlement(p_refund_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.refunds; v_grp uuid;
begin
  if not public.has_permission('payout.settle.approve') then perform public._forbidden(); end if;
  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then raise exception 'not_found'; end if;
  if r.status = 'completed' then return; end if;                     -- idempotent
  if r.status <> 'settlement_recorded' then
    raise exception 'invalid_state: settlement must be recorded first (%)', r.status;
  end if;
  if r.recorded_by = auth.uid() then
    raise exception 'segregation_of_duties: approver must differ from the recorder';
  end if;

  update public.refunds set status = 'completed', settled_at = now() where id = p_refund_id;

  v_grp := gen_random_uuid();
  perform public.post_ledger(v_grp, 'refund_payable', 'debit',  r.amount, r.currency,
                             'Refund settled', r.escrow_id, null, null, p_refund_id);
  perform public.post_ledger(v_grp, 'psp_clearing',   'credit', r.amount, r.currency,
                             'Refund settled', r.escrow_id, null, null, p_refund_id);
  perform public.assert_balanced(v_grp);

  perform public.escrow_notify(
    r.escrow_id, 'refunded', 'escrow.refund_settled', true, true, true, r.amount,
    jsonb_build_object('refund_id', p_refund_id, 'method', r.settlement_method));
end;$$;

-- The old signature took (uuid, numeric, refund_type, text, uuid). It is
-- replaced above by the reason-driven one; drop the stale overload so callers
-- cannot bind to it by accident.
drop function if exists public.request_refund(uuid, numeric, refund_type, text, uuid);
drop function if exists public.approve_refund(uuid);

-- ---------------------------------------------------------------------
-- Retire the automated payout completion path.
--
-- complete_payout() moved a payout straight to 'completed' and posted the
-- settlement ledger from a single service-role call, with no evidence and no
-- second pair of eyes. Settlement is now manual and maker-checked, so leaving
-- it callable would be a way around the control.
-- ---------------------------------------------------------------------
drop function if exists public.complete_payout(uuid, text, payment_provider);

-- =====================================================================
-- ADVANCE TERMS ON THE QUOTATION
--
-- The advance schedule is proposed with the quote, not at checkout, so it
-- binds the deal whether or not it is ultimately settled through escrow — a
-- client and vendor dealing directly still have agreed terms on record.
-- =====================================================================
create or replace function public.send_quotation(
  p_quotation_id uuid,
  p_items        jsonb,
  p_valid_days   int default null,
  p_advance_rate numeric default null,
  p_advance_release_days_before int default null,
  p_advance_terms_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q public.quotations;
  v_sub numeric := 0;
  it jsonb;
  v_days int;
  v_max_rate numeric;
  v_max_days int;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(q.vendor_id) then perform public._forbidden(); end if;

  -- Bounds are the platform's, not the form's: a quotation row is reachable
  -- through PostgREST, so the ceiling has to hold here.
  v_max_rate := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::int, 30);

  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_max_rate) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_max_rate;
  end if;
  if p_advance_release_days_before is not null
     and (p_advance_release_days_before < 0 or p_advance_release_days_before > v_max_days) then
    raise exception 'advance_release_days_out_of_range: must be between 0 and %', v_max_days;
  end if;

  delete from public.quotation_items where quotation_id = p_quotation_id;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.quotation_items(quotation_id, description, quantity, unit_price, line_total)
    values (p_quotation_id, it->>'description',
            coalesce((it->>'quantity')::numeric,1), coalesce((it->>'unit_price')::numeric,0),
            coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0));
    v_sub := v_sub + coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0);
  end loop;

  v_days := coalesce(p_valid_days, (public.get_setting('quote_expiry_days') #>> '{}')::int, 14);

  update public.quotations
     set status = 'sent',
         subtotal = v_sub,
         total = v_sub - discount_total + tax_total,
         sent_at = now(),
         valid_until = now() + make_interval(days => v_days),
         advance_rate = coalesce(p_advance_rate,
                                 (public.get_setting('advance_rate_default') #>> '{}')::numeric),
         advance_release_days_before = coalesce(p_advance_release_days_before,
                                 (public.get_setting('advance_release_days_default') #>> '{}')::int),
         advance_terms_note = p_advance_terms_note
   where id = p_quotation_id;
end;$$;

-- The old 3-argument overload would still resolve for existing callers and
-- would silently skip the advance terms. Drop it so there is one entry point.
drop function if exists public.send_quotation(uuid, jsonb, int);

-- Accepting a quote copies its terms onto the booking, which is where escrow
-- and the client's consent step read them from.
create or replace function public.respond_quotation(p_quotation_id uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare q public.quotations;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  update public.quotations
     set status = case p_action when 'accept' then 'accepted'
                                when 'decline' then 'declined'
                                when 'revise' then 'revised' else status end,
         responded_at = now()
   where id = p_quotation_id;

  if p_action = 'accept' then
    update public.bookings b
       set advance_rate                = q.advance_rate,
           advance_release_days_before = q.advance_release_days_before,
           advance_terms_note          = q.advance_terms_note
     where b.quotation_id = p_quotation_id
       and b.client_id = auth.uid()
       -- Never re-write terms the client has already consented to.
       and b.advance_terms_accepted_at is null;
  end if;
end;$$;

-- A booking created straight from an accepted quote inherits its terms too.
create or replace function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; q public.quotations;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = p_vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable'; end if;

  if p_quotation_id is not null then
    select * into q from public.quotations where id = p_quotation_id;
  end if;

  insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
      reference_no, status, event_date, location, currency, amount,
      advance_rate, advance_release_days_before, advance_terms_note)
  values (p_vendor_id, auth.uid(), p_service_id, p_quotation_id, p_event_id,
      public.gen_reference('BK'), 'requested', p_event_date, p_location, p_currency, p_amount,
      coalesce(q.advance_rate, (public.get_setting('advance_rate_default') #>> '{}')::numeric),
      coalesce(q.advance_release_days_before,
               (public.get_setting('advance_release_days_default') #>> '{}')::int),
      q.advance_terms_note)
  returning id into v_id;
  return v_id;
end;$$;
