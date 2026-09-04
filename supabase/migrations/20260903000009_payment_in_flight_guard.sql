-- =====================================================================
-- Sinnapi — 0903i One checkout at a time
--
-- THE HOLE
-- `activate_escrow` locked the escrow row and refused only when its status
-- was already past 'initiated'. A second call while the first payment was
-- still 'pending' inserted a second payments row, re-pointed
-- `escrow.funding_payment_id` at it and opened a second hosted checkout.
-- A client who tapped Pay twice — a double-click, a stale tab, a browser
-- retry of a slow request — could pay both. The first IPN funded the escrow;
-- the second found `fund_escrow` already past 'initiated' and returned
-- silently. Real money in, no ledger entry, no refund, and no exception,
-- because `sweepOrphanEscrows` only looks at the CURRENT funding payment,
-- which points at a payment that did succeed.
--
-- THE FIX, IN LAYERS
--   1. `activate_escrow` refuses while a payment for the booking is in
--      flight ('payment_already_in_flight'). An in-flight payment older than
--      the checkout TTL is failed first, through `record_payment_result` so
--      the escrow and the client are told, and the call then proceeds: an
--      abandoned checkout must never lock a client out of paying.
--   2. A partial unique index on payments(booking_id) for in-flight rows, so
--      the database refuses a second one even when a future caller forgets.
--      Failed rows are outside the predicate, which is exactly what keeps the
--      retry-after-failure path working: `record_payment_result('failed')`
--      and `cancel_unpaid_booking` both move the row out of the index before
--      the next attempt inserts.
--   3. An optional idempotency key. A caller that repeats a request with the
--      same key gets the same payment back, with the provider reference and
--      checkout URL it already has, instead of a second charge.
--   4. `record_payment_result` no longer drops a 'succeeded' result on a
--      payment we had marked failed. Layer 1 can fail a checkout the client
--      is, at that very moment, approving on their phone; when the IPN then
--      lands, that is money received against nothing and Finance must hear
--      about it. It is filed as a critical exception. The row is still not
--      re-opened — a failed payment is retried as a new row, and this one
--      must not fund an escrow another payment may already have funded.
--   5. A helper the reconciliation sweep can call for succeeded funding
--      payments that no escrow claims. Same failure class, seen from the
--      other side.
--
-- WHY A NEW COLUMN FOR THE CLIENT'S KEY
-- `payments.idempotency_key` is unique across the whole table (0007's
-- `ux_payments_idem`) and every row has the platform's own random 'PM-…'
-- value in it. Storing a browser-chosen string there would let one client's
-- key collide with another's, and would make a key permanently unusable once
-- its attempt failed — the opposite of what a retry needs. The client's key
-- lives in its own column, is unique only per booking and only while the
-- attempt it names is alive, and the 'PM-…' value carries on as before.
--
-- WHY A NEW COLUMN FOR THE CHECKOUT URL
-- Returning the stored checkout on a replay requires having stored it. It
-- was previously handed to the browser and kept nowhere. It is written in
-- the same statement as the provider reference so the two cannot disagree.
--
-- SIGNATURES
-- `activate_escrow` gains a defaulted argument and two output columns, and
-- `attach_payment_provider_ref` gains a defaulted argument. Both old
-- signatures are dropped explicitly: `create or replace` with a different
-- argument list ADDS an overload, and PostgREST then refuses the call as
-- ambiguous (PGRST203). The grants are re-issued because a drop takes them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Setting.
--
-- How long a hosted checkout is presumed live. A mobile-money prompt is
-- answered or forgotten in minutes; a card page is abandoned in about the
-- same time. Thirty minutes is long enough that a slow approval is not cut
-- off, short enough that a client who gave up is not locked out for an hour
-- waiting for the reconciliation sweep to notice.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('payment_checkout_ttl_minutes', '30'::jsonb, 'number',
   'How long an opened checkout is treated as still in progress, in minutes. While a payment for a booking is younger than this, a second Pay is refused with payment_already_in_flight. Once older, the abandoned payment is failed and a fresh checkout is opened. Money that arrives for a payment failed this way is never applied; it is filed as a critical reconciliation exception.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Columns.
-- ---------------------------------------------------------------------
alter table public.payments
  add column if not exists client_idempotency_key text,
  add column if not exists checkout_url           text;

comment on column public.payments.client_idempotency_key is
  'Caller-supplied Idempotency-Key for the checkout attempt. Unique per booking while the attempt is pending, processing or succeeded; a failed attempt releases it. Null for payments opened without one.';
comment on column public.payments.checkout_url is
  'The hosted checkout page the PSP returned for this payment, kept so a replayed request can be sent back to it rather than opening a second order.';

-- ---------------------------------------------------------------------
-- Backfill: bookings that already hold more than one in-flight payment.
--
-- The unique index below cannot build over them, and they are the very
-- state this migration exists to prevent. The payment the escrow currently
-- points at is kept (it is the one a webhook will fund); if the escrow
-- points elsewhere, the newest is kept. The rest are marked failed with a
-- reason that says why, and each is filed as a warning so Finance checks
-- with the PSP that none of them was actually paid. Directly, not through
-- `record_payment_result`: that would notify the client of a failure they
-- did not just experience and reset the escrow beneath the kept payment.
-- ---------------------------------------------------------------------
do $$
declare
  r    record;
  keep uuid;
  s    uuid;
begin
  for r in
    select p.booking_id, array_agg(p.id order by p.created_at desc) as ids
      from public.payments p
     where p.booking_id is not null
       and p.status in ('pending', 'processing')
     group by p.booking_id
    having count(*) > 1
  loop
    select e.funding_payment_id into keep
      from public.escrow_transactions e
     where e.booking_id = r.booking_id;
    if keep is null or not (keep = any (r.ids)) then
      keep := r.ids[1];
    end if;

    foreach s in array r.ids loop
      if s = keep then continue; end if;

      update public.payments
         set status         = 'failed',
             failure_reason = 'superseded_checkout',
             updated_at     = now()
       where id = s;

      perform public.raise_reconciliation_exception(
        'orphan_payment',
        'payment:' || s::text || ':superseded_checkout',
        'A second checkout was open for the same booking before the one-in-flight guard existed. '
          || 'Marked failed by migration 0903i; confirm with the provider that it was never paid.',
        jsonb_build_object('booking_id', r.booking_id, 'kept_payment_id', keep),
        null, null, null, s, null, 'warning');
    end loop;
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- Indexes.
--
-- One in-flight payment per booking. The predicate is what makes the
-- legitimate retry path work: a failed row leaves the index the moment
-- `record_payment_result` marks it, so the next attempt's insert succeeds.
--
-- One live attempt per (booking, client key). 'succeeded' is in the
-- predicate so a replay after the money landed still finds its row rather
-- than being allowed to open another.
-- ---------------------------------------------------------------------
create unique index if not exists ux_payments_in_flight_booking
  on public.payments (booking_id)
  where status in ('pending', 'processing');

create unique index if not exists ux_payments_client_idem
  on public.payments (booking_id, client_idempotency_key)
  where client_idempotency_key is not null
    and status in ('pending', 'processing', 'succeeded');

-- ---------------------------------------------------------------------
-- ATTACH PROVIDER REF — now also the checkout URL, and it says whether it
-- attached anything.
--
-- The previous version returned void, so a caller could not tell "attached"
-- from "matched no row". `create-payment` ignored the error too, and a
-- payment left with no reference is invisible to the stuck-payment sweep
-- for good. Returning `found` gives the caller something it can act on.
-- A row already carrying this same reference counts as attached — a retried
-- request must not read as a failure.
-- ---------------------------------------------------------------------
drop function if exists public.attach_payment_provider_ref(uuid, text);

create function public.attach_payment_provider_ref(
  p_payment_id   uuid,
  p_provider_ref text,
  p_checkout_url text default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.payments
     set provider_ref = p_provider_ref,
         checkout_url = coalesce(p_checkout_url, checkout_url),
         status       = case when status = 'pending' then 'processing'::payment_status else status end
   where id = p_payment_id
     and (provider_ref is null or provider_ref = p_provider_ref);
  return found;
end;$$;
revoke all on function public.attach_payment_provider_ref(uuid, text, text) from anon, authenticated;
grant execute on function public.attach_payment_provider_ref(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------
-- RECORD PAYMENT RESULT — 0809's body, plus the late-success branch.
--
-- Same signature, so `create or replace` is safe. The one change is inside
-- the "failed never re-opens" rule: a 'succeeded' arriving for a failed
-- payment used to fall out of the function without a trace. It now records
-- the provider's reference on the row (the handle Finance needs to find the
-- money at the PSP) and files a critical exception. The status still does
-- not move: the escrow this payment was opened for may since have been
-- funded by its replacement, and applying this one would post the ledger
-- twice for one booking.
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
  -- But money that lands on one is real: keep the provider's handle to it and
  -- put a human on it.
  if p.status = 'failed' and p_status <> 'failed' then
    if p_status = 'succeeded' then
      update public.payments
         set provider_ref = coalesce(p_provider_ref, provider_ref)
       where id = p.id;
      perform public.raise_reconciliation_exception(
        'orphan_payment',
        'payment:' || p.id::text || ':late_success',
        'Provider reports this payment succeeded after it was marked failed ('
          || coalesce(p.failure_reason, 'no reason recorded')
          || '). The money was received but has funded nothing.',
        jsonb_build_object(
          'payment_id',     p.id,
          'booking_id',     p.booking_id,
          'provider',       p.provider,
          'provider_ref',   coalesce(p_provider_ref, p.provider_ref),
          'failure_reason', p.failure_reason),
        p.amount, 0, p.escrow_id, p.id, null, 'critical');
    end if;
    return;
  end if;

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
-- ACTIVATE ESCROW — 0903h's body, plus the guard, the key and the lock.
--
-- Order of the new checks, and why:
--
--   * A per-booking transaction lock is taken before anything is read. The
--     escrow row's `for update` only serialises callers once an escrow row
--     exists; two first-ever calls for the same booking had nothing to
--     collide on until the insert. The unique index would still stop the
--     second insert, but it would stop it with a 23505 rather than a message
--     a client can be shown. With the lock, the second caller waits, then
--     sees the first caller's payment, and is told so.
--
--   * The idempotency replay is checked AFTER the escrow-already-active
--     guard. A replay of a key whose payment succeeded is an attempt to pay
--     a funded booking, and 'escrow_already_active' is the truthful answer.
--
--   * A replay must match the rail it was opened on. The browser regenerates
--     the key when the rail changes, so a key arriving with a different rail
--     is a stale tab; it falls through to the in-flight guard and is refused
--     rather than being handed a checkout for a rail the client did not pick.
--
--   * The in-flight guard runs last, immediately before the insert, on a row
--     it holds `for update`. An expired attempt is failed through
--     `record_payment_result` so the escrow returns to 'initiated' and the
--     client is told the old one lapsed; the fresh attempt then re-prices and
--     bumps `attempt_no` exactly as a retry after a declined payment does.
--
--   * The insert is still wrapped: should anything ever reach it past the
--     lock, the index's 23505 is translated into the same token.
--
-- Output columns are qualified everywhere they could shadow a payments
-- column (`provider_ref`, `checkout_url`, `amount`, `currency`); RETURNS
-- TABLE names are variables inside the body, and an unqualified reference
-- is "ambiguous" at call time, not at create time.
-- ---------------------------------------------------------------------
drop function if exists public.activate_escrow(uuid, payment_provider, payment_method);

create function public.activate_escrow(
  p_booking_id      uuid,
  p_provider        payment_provider,
  p_method          payment_method,
  p_idempotency_key text default null)
returns table (
  payment_id   uuid,
  escrow_id    uuid,
  amount       numeric,
  currency     text,
  provider_ref text,
  checkout_url text)
language plpgsql security definer set search_path = public as $$
declare
  b         public.bookings;
  q         record;
  e         public.escrow_transactions;
  rp        public.payments;   -- replay: the payment the caller's key names
  ip        public.payments;   -- the payment currently in flight, if any
  v_escrow  uuid;
  v_payment uuid;
  v_idem    text;
  v_fx      uuid;
  v_base    numeric;
  v_ttl     numeric;
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

  -- One activation at a time per booking, from here to commit.
  perform pg_advisory_xact_lock(hashtextextended('activate_escrow:' || p_booking_id::text, 0));

  select * into q from public.escrow_price_booking(p_booking_id, p_provider, p_method);

  select * into e from public.escrow_transactions
   where booking_id = p_booking_id for update;

  if e.id is not null and e.status not in ('initiated', 'failed') then
    raise exception 'escrow_already_active: %', e.status;
  end if;

  -- Replay. The same key on the same booking and rail is the same request,
  -- and gets the same answer.
  if p_idempotency_key is not null then
    select p.* into rp
      from public.payments p
     where p.booking_id = p_booking_id
       and p.client_idempotency_key = p_idempotency_key
       and p.status in ('pending', 'processing', 'succeeded')
     order by p.created_at desc
     limit 1;

    if rp.id is not null and rp.provider = p_provider and rp.provider_method = p_method then
      if rp.payer_id <> auth.uid() then perform public._forbidden(); end if;
      return query
        select rp.id, rp.escrow_id, rp.amount, rp.currency, rp.provider_ref, rp.checkout_url;
      return;
    end if;
  end if;

  -- In-flight guard.
  v_ttl := coalesce((public.get_setting('payment_checkout_ttl_minutes') #>> '{}')::numeric, 30);

  select p.* into ip
    from public.payments p
   where p.booking_id = p_booking_id
     and p.status in ('pending', 'processing')
   order by p.created_at desc
   limit 1
   for update;

  if ip.id is not null then
    if ip.created_at > now() - (v_ttl * interval '1 minute') then
      raise exception 'payment_already_in_flight';
    end if;
    -- Abandoned. Fail it the way a declined payment is failed, so the escrow
    -- and the client both learn the old checkout is dead, then carry on.
    perform public.record_payment_result(ip.id, 'failed', null, 'checkout_expired');
  end if;

  if q.currency <> 'UGX' then
    v_fx   := public.latest_fx_rate_id(q.currency, 'UGX');
    v_base := q.gross_amount * coalesce((select rate from public.exchange_rates where id = v_fx), 1);
  else
    v_base := q.gross_amount;
  end if;

  v_idem := 'PM-' || replace(gen_random_uuid()::text, '-', '');

  begin
    insert into public.payments (payer_id, purpose, booking_id, provider, provider_method,
        idempotency_key, client_idempotency_key, amount, currency, fx_rate_id, base_amount,
        base_currency, status, created_by)
    values (auth.uid(), 'escrow_funding', p_booking_id, p_provider, p_method,
        v_idem, p_idempotency_key, q.gross_amount, q.currency, v_fx, v_base,
        'UGX', 'pending', auth.uid())
    returning id into v_payment;
  exception when unique_violation then
    raise exception 'payment_already_in_flight';
  end;

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
    -- booking check above. See 0903h.
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

  update public.payments p set escrow_id = v_escrow where p.id = v_payment;

  perform public.escrow_notify(
    v_escrow, 'initiated', 'escrow.awaiting_payment',
    true, true, false, q.gross_amount,
    jsonb_build_object('provider', p_provider, 'method', p_method));

  return query select v_payment, v_escrow, q.gross_amount, q.currency, null::text, null::text;
end;$$;
revoke all on function public.activate_escrow(uuid, payment_provider, payment_method, text) from anon;
grant execute on function public.activate_escrow(uuid, payment_provider, payment_method, text) to authenticated;

-- ---------------------------------------------------------------------
-- UNREFERENCED FUNDING PAYMENTS — for the reconciliation sweep.
--
-- A succeeded escrow-funding payment that no escrow names as its funding
-- payment is money received against nothing. Written as a function rather
-- than assembled in the edge function because it is an anti-join, which
-- PostgREST cannot express, and paging "the newest N succeeded payments"
-- from the client side would stop seeing an old orphan the day the table
-- outgrew the page.
-- ---------------------------------------------------------------------
create or replace function public.unreferenced_funding_payments(p_limit integer default 200)
returns table (
  payment_id   uuid,
  booking_id   uuid,
  escrow_id    uuid,
  amount       numeric,
  currency     text,
  provider     payment_provider,
  provider_ref text,
  paid_at      timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.booking_id, p.escrow_id, p.amount, p.currency, p.provider, p.provider_ref, p.paid_at
    from public.payments p
   where p.purpose = 'escrow_funding'
     and p.status  = 'succeeded'
     and not exists (select 1 from public.escrow_transactions e
                      where e.funding_payment_id = p.id)
   order by p.paid_at desc nulls last
   limit p_limit;
$$;
revoke all on function public.unreferenced_funding_payments(integer) from anon, authenticated;
grant execute on function public.unreferenced_funding_payments(integer) to service_role;
