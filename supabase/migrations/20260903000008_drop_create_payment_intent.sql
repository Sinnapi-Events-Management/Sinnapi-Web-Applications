-- =====================================================================
-- Sinnapi — 0903h Retire create_payment_intent; escrow reuse asserts owner
--
-- WHY
-- 0014's `create_payment_intent` took the amount from the caller and checked
-- nothing about the booking: the only guard was `auth.uid() is not null`. Any
-- signed-in user could open a payment for any booking id at any figure, and
-- with `p_purpose = 'escrow_funding'` also insert an escrow row naming
-- themselves as the client of someone else's booking and flip that booking's
-- `payment_type` to `escrow`.
--
-- 0809 replaced it with `activate_escrow`, which derives every figure from the
-- booking and refuses a caller who is not the booking's client. But 0809 only
-- ADDED the replacement. The old function stayed defined, and 0014's blanket
-- `grant execute on all functions in schema public to authenticated` still
-- covered it, so it remained callable by every authenticated user through
-- PostgREST for as long as it existed. No code path calls it: the edge
-- functions, the portals and the later migrations all go through
-- `activate_escrow`. It is dropped outright rather than revoked because a
-- function nobody calls and nobody may call has no reason to exist.
--
-- The signature is spelled out in full so `drop function` cannot silently
-- match nothing (the PGRST203 trap 0816g's header warns about): an overload
-- left behind would still be reachable.
-- =====================================================================
drop function if exists public.create_payment_intent(
  payment_purpose, payment_provider, payment_method, numeric, text, uuid, uuid);

-- ---------------------------------------------------------------------
-- activate_escrow — the reuse branch also checks the escrow's own client.
--
-- The function already refuses when `b.client_id <> auth.uid()`, and an escrow
-- row's `client_id` is copied from the booking when it is created, so today
-- the two cannot disagree. Defence in depth: the row that is about to be
-- re-pointed at a fresh payment carries its own owner, and that owner is the
-- one the update is really about. If any future path ever leaves an escrow
-- naming a different client than its booking — a reassignment, a bad backfill,
-- a bug in the very function this migration retires — the reuse branch refuses
-- rather than quietly attaching the caller's money to someone else's escrow.
--
-- Body is 0817's, unchanged apart from the one assertion.
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

  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;

  -- Both parties agreed a rail; this is not the screen that changes it.
  if b.payment_type is distinct from 'escrow' then raise exception 'not_an_escrow_booking'; end if;
  if b.payment_terms_status <> 'accepted' then raise exception 'payment_terms_not_agreed'; end if;

  if b.advance_terms_accepted_at is null then raise exception 'advance_terms_not_accepted'; end if;
  if coalesce(b.amount, 0) <= 0 then raise exception 'booking_amount_not_set'; end if;
  if p_provider = 'paypal' and p_method <> 'card' then raise exception 'paypal_requires_card'; end if;

  select * into q from public.escrow_price_booking(p_booking_id, p_provider, p_method);

  select * into e from public.escrow_transactions
   where booking_id = p_booking_id for update;

  if e.id is not null and e.status not in ('initiated', 'failed') then
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
    -- The escrow being reused must belong to the caller, independently of the
    -- booking check above. See the header.
    if e.client_id <> auth.uid() then perform public._forbidden(); end if;

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

  perform public.escrow_notify(
    v_escrow, 'initiated', 'escrow.awaiting_payment',
    true, true, false, q.gross_amount,
    jsonb_build_object('provider', p_provider, 'method', p_method));

  return query select v_payment, v_escrow, q.gross_amount, q.currency;
end;$$;
