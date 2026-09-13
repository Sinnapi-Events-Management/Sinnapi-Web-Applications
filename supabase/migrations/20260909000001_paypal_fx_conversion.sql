-- 0909a — PayPal cannot charge UGX, so a PayPal checkout is charged in USD.
--
-- WHY THIS EXISTS
-- PayPal's Orders v2 API accepts 24 currencies and the Ugandan Shilling is not
-- one of them. Every money column in this schema defaults to UGX, so every
-- PayPal checkout was rejected at `SubmitOrderRequest` with
-- CURRENCY_NOT_SUPPORTED — a 422 whose message says only "failed business
-- validation", which is why it read as a configuration fault for so long.
--
-- WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT
-- Only the `payments` row is re-denominated. `escrow_transactions` keeps its
-- UGX `gross_amount`, and `fund_escrow` posts the ledger from THAT — not from
-- `payments.amount` — so escrow, commission, the ledger and the vendor payout
-- all stay in shillings exactly as before. The vendor is paid what was agreed,
-- in the currency it was agreed in, and none of that arithmetic moves.
--
-- What moves is the payment row: `amount`/`currency` become the USD actually
-- charged, while `base_amount`/`base_currency` go on meaning exactly what
-- `activate_escrow` has always meant by them — this obligation normalised to
-- the platform currency — and `fx_rate_id` finally carries a rate instead of
-- the null a UGX-priced booking leaves there. Putting USD in `amount` is also
-- what keeps the PayPal webhook's amount-mismatch guard honest: it compares
-- PayPal's captured figure against `payments.amount` to the cent, and PayPal
-- reports in USD.
--
-- THE QUOTE IS A RECORD, NOT A CACHE
-- `fx_quotes` exists because the client is shown a rate and a USD total and
-- then leaves for PayPal's hosted page. Two things follow. First, they must be
-- charged the figure they agreed to, not whatever the rate has drifted to by
-- the time they finish typing their card number — so the quote is locked for
-- 15 minutes and `create-payment` re-derives the charge from the locked row
-- rather than re-pricing. Second, "what were they actually shown?" is a
-- question a chargeback or a complaint will eventually ask, and a disclosure
-- that exists only in a React component cannot answer it. Every quote is kept,
-- consumed or not.
--
-- The margin is disclosed to the payer as its own line, never folded into the
-- rate. It is what covers the drift between quoting in USD and settling an
-- obligation denominated in UGX; hiding it inside a blended rate would make
-- the platform's rate look worse than the market for no stated reason.

-- ---------------------------------------------------------------------
-- 1. The margin, as a setting rather than a constant.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('fx_margin_rate', '0.02'::jsonb, 'number',
   'Margin added to the mid-market rate when a payment is converted out of the platform currency for a provider that cannot accept it (PayPal cannot accept UGX). Charged to the payer, disclosed to them as its own line, and sized to cover rate drift between quoting in the charge currency and settling an obligation denominated in UGX. 0 turns the margin off without removing the disclosure.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2. What the payer was shown, and what they agreed to pay.
-- ---------------------------------------------------------------------
create table public.fx_quotes (
  id              uuid primary key default gen_random_uuid(),
  purpose         text not null check (purpose in ('escrow_funding', 'subscription')),

  -- Who was quoted. Checked against the payment's payer when the quote is
  -- applied, so one person's quote can never price another's charge.
  requested_by    uuid not null references public.profiles(id) on delete cascade,

  -- What was being paid for. Not used to derive the charge — the amounts
  -- below are the contract — but a quote with no subject is unauditable.
  booking_id      uuid references public.bookings(id) on delete cascade,
  plan_id         uuid references public.pricing_plans(id) on delete cascade,
  vendor_id       uuid references public.vendors(id) on delete cascade,

  -- The obligation, in the currency it is denominated in (UGX).
  base_amount     numeric(14,2) not null check (base_amount > 0),
  base_currency   text not null references public.currencies(code),

  -- What the payer is charged, in the currency the provider accepts (USD).
  quote_amount    numeric(14,2) not null check (quote_amount > 0),
  quote_currency  text not null references public.currencies(code),

  -- The mid-market rate this was built from, kept both by reference and by
  -- value: the row it points at is append-only, but a rate that has to be
  -- joined to be read is a rate nobody checks.
  fx_rate_id      uuid not null references public.exchange_rates(id),
  rate            numeric(18,8) not null check (rate > 0),
  rate_fetched_at timestamptz not null,

  -- The disclosed margin, in the base currency so it reads next to the
  -- amount the payer already understands.
  margin_rate     numeric(6,4) not null check (margin_rate >= 0),
  margin_amount   numeric(14,2) not null check (margin_amount >= 0),

  -- True when the stored rate was served because the FX API could not be
  -- reached. The payer is told the rate's real age either way; this is so an
  -- investigator can tell a stale-by-outage quote from a stale-by-cron one.
  rate_stale      boolean not null default false,

  expires_at      timestamptz not null,
  created_at      timestamptz not null default now(),

  -- Set when the quote becomes a charge. A quote is single-use.
  consumed_at     timestamptz,
  payment_id      uuid references public.payments(id) on delete set null,

  constraint fx_quotes_has_subject check (
    (purpose = 'escrow_funding' and booking_id is not null and plan_id is null)
    or
    (purpose = 'subscription' and plan_id is not null and vendor_id is not null
     and booking_id is null)
  )
);

create index ix_fx_quotes_requested_by on public.fx_quotes(requested_by, created_at desc);
create index ix_fx_quotes_booking on public.fx_quotes(booking_id) where booking_id is not null;
create index ix_fx_quotes_payment on public.fx_quotes(payment_id) where payment_id is not null;

alter table public.fx_quotes enable row level security;

-- The payer may read their own quotes and nothing else. No insert or update
-- policy: quotes are written by `fx-quote` under the service role, after it
-- has priced the booking through the caller's own RLS.
create policy fx_quotes_select_own on public.fx_quotes
  for select to authenticated
  using (requested_by = auth.uid());

comment on table public.fx_quotes is
  'Currency conversions disclosed to a payer before checkout, and the exact figure they agreed to. Single-use, time-limited, and kept whether consumed or not — it is the record of what was shown.';

-- ---------------------------------------------------------------------
-- 3. Turning a quote into the charge.
--
-- Service-role only: reached from `create-payment` after `activate_escrow`
-- (or `activate_subscription_payment`) has already created the payment row
-- under the caller's own identity and RLS. By the time this runs, ownership
-- and state have been settled; what is left is arithmetic and a guard that
-- the quote really does price THIS payment.
-- ---------------------------------------------------------------------
create or replace function public.apply_payment_fx(
  p_payment_id  uuid,
  p_fx_quote_id uuid,
  p_context     jsonb default null)
returns table (
  amount        numeric,
  currency      text,
  base_amount   numeric,
  base_currency text)
language plpgsql security definer set search_path = public as $$
declare
  q public.fx_quotes;
  p public.payments;
begin
  -- A lock wait here must fail fast, not hang. This is reached from
  -- `create-payment` through the service role, which carries no
  -- statement_timeout, so without these a row held by a concurrent
  -- reconciliation sweep or an abandoned checkout would block until the edge
  -- runtime kills the request at its wall-clock limit (~150s) — surfacing to
  -- the payer as an opaque "upstream request timeout" with nothing recorded
  -- here and no order ever opened at PayPal. `set local` is reverted when the
  -- function returns (the `set search_path` clause snapshots GUCs on entry).
  set local lock_timeout = '4s';
  set local statement_timeout = '15s';

  perform public._set_payment_context(p_context, 'apply_payment_fx');

  select * into q from public.fx_quotes where id = p_fx_quote_id for update;
  if q.id is null then raise exception 'fx_quote_not_found'; end if;

  select * into p from public.payments where id = p_payment_id for update;
  if p.id is null then raise exception 'payment_not_found'; end if;

  perform public._ensure_correlation(p.correlation_id);

  -- Idempotent replay. `create-payment` is retried on the same idempotency
  -- key, and the second pass must find the conversion already done rather
  -- than refuse — otherwise a dropped connection turns a live checkout into
  -- a dead one.
  if q.consumed_at is not null then
    if q.payment_id = p_payment_id then
      return query
        select p.amount, p.currency, p.base_amount, p.base_currency;
      return;
    end if;
    raise exception 'fx_quote_already_used';
  end if;

  if q.expires_at <= now() then raise exception 'fx_quote_expired'; end if;

  -- One person's quote may not price another's charge.
  if p.created_by is distinct from q.requested_by then
    raise exception 'fx_quote_not_yours';
  end if;

  -- The quote must price what this payment actually owes. Both sides come
  -- from the same server-side pricing call moments apart, so any divergence
  -- means the booking was re-priced in between and the disclosure the payer
  -- saw no longer describes the charge.
  if p.currency is distinct from q.base_currency then
    raise exception 'fx_quote_currency_mismatch';
  end if;
  if abs(p.amount - q.base_amount) > 0.01 then
    raise exception 'fx_quote_amount_mismatch';
  end if;

  -- `base_amount`/`base_currency` already mean "this obligation, normalised to
  -- the platform currency" — `activate_escrow` has always written the UGX
  -- figure there. That meaning is preserved rather than repurposed: the quote's
  -- base side IS that figure, so this writes back the same value it already
  -- held, and `amount`/`currency` become the transacted pair. Sourcing both
  -- from the quote rather than from `p` keeps it correct if a non-UGX
  -- obligation ever reaches here.
  update public.payments
     set base_amount   = q.base_amount,
         base_currency = q.base_currency,
         amount        = q.quote_amount,
         currency      = q.quote_currency,
         fx_rate_id    = q.fx_rate_id,
         updated_at    = now(),
         version       = p.version + 1
   where id = p_payment_id;

  update public.fx_quotes
     set consumed_at = now(),
         payment_id  = p_payment_id
   where id = p_fx_quote_id;

  return query
    select q.quote_amount, q.quote_currency, p.amount, p.currency;
end;$$;

revoke all on function public.apply_payment_fx(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment_fx(uuid, uuid, jsonb) to service_role;
