-- =====================================================================
-- Sinnapi — 0903l Subscription payments: the front half.
--
-- WHAT WAS MISSING
-- `activate_subscription` already set the period, flipped the status to
-- 'active' and made the vendor public; `record_payment_result` already
-- dispatched to it for purpose = 'subscription'. Nothing ever CREATED a
-- payment with that purpose. The vendor portal called
-- `choose_subscription_plan`, a one-line `update subscriptions set plan_id`
-- with no charge, no period change and no consent step — so a vendor could
-- hold any paid plan for free, and could never actually pay for one.
--
-- WHAT THIS FILE BUILDS — the escrow pattern, not a second one
--   * subscription_price_plan        pure pricing; preview and charge agree
--   * activate_subscription_payment  one pending payment, priced server-side,
--                                    one-in-flight guard, idempotent replay
--   * activate_subscription          now reads the plan FROM THE PAYMENT
--   * subscription_notify            one call: event row + outbox per party,
--                                    in the same transaction as the change
--   * apply_subscription_state       per-row, notifying, and it no longer
--                                    hides a vendor who was never prompted
--   * remind_subscription_renewal    pay-to-renew reminders on day offsets
--   * choose_subscription_plan       DROPPED
--
-- DECISIONS, so they are not re-litigated in code review
--
--   Processing fee. The platform absorbs it on subscriptions. Escrow passes
--   it on to the client because that fee is a pass-through on somebody
--   else's money; a subscription is our own list price and a vendor must pay
--   exactly what the pricing page says. There is no fee line, and the
--   pricing function returns psp_fee_amount = 0 explicitly so the UI can
--   render the absence rather than guess at it.
--
--   Period start. Four cases, and only one of them credits anything:
--     - active on the SAME plan  -> the new period starts at
--       current_period_end. Paying on the day-7 reminder must not cost the
--       vendor seven days.
--     - trialing                 -> the paid period starts at trial_ends_at.
--       The free days were promised; they are not clawed back for paying
--       early.
--     - active on a DIFFERENT plan (up or down) -> the new period starts
--       now, charged in full, nothing credited. Honest, explainable, and it
--       avoids part-period arithmetic no one can verify. The unused days of
--       the old period are returned in the preview so the vendor sees what
--       they are giving up before they commit.
--     - grace / expired / cancelled / suspended / no live row -> now.
--
--   The target plan travels ON THE PAYMENT (`payments.target_plan_id`), not
--   on the subscription. A plan a vendor picked but never paid for must
--   never take effect, and `activate_subscription` refuses to run without a
--   succeeded payment that names one.
--
--   Renewal. Pesapal mobile money has no card-on-file and no merchant-
--   initiated debit, so `subscriptions.auto_renew` CANNOT mean auto-charge.
--   It now means "send me pay-to-renew reminders before the period ends".
--   The reminder sweep and the grace notice both link to checkout; either
--   counts as the vendor having been given a way to pay.
--
--   Hiding. `apply_subscription_state` used to hide every expired vendor on
--   every tick. It now hides only a vendor who has had at least one renewal
--   prompt. One who was never prompted is flagged (`hide_blocked_at`) and
--   Finance is told, rather than the vendor silently vanishing from search.
--
--   Non-UGX plans snapshot fx_rate_id and base_amount the way
--   `activate_escrow` does.
--
--   Free plans (price = 0) are refused at checkout with `plan_is_free`. A
--   zero-amount PSP order is nonsense, and activating without a payment is
--   the exact invariant this file exists to establish. Pricing a plan at
--   zero is a product decision that needs its own path, not a silent bypass.
--
-- SIGNATURES
-- `activate_subscription`, `apply_subscription_state` and
-- `record_payment_result` keep their argument lists, so `create or replace`
-- is safe and existing grants carry over. The admin search functions in
-- 0903m change their return types and are dropped explicitly there.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Settings.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('subscription_renewal_reminder_days', '[7,3,1]'::jsonb, 'json',
   'Days before current_period_end (or trial_ends_at) at which a vendor with auto_renew on is reminded to pay for the next period. Each mark is sent once per period; a sweep that misses ticks sends one reminder for the closest mark passed, not a burst.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Columns.
-- ---------------------------------------------------------------------
alter table public.payments
  add column if not exists target_plan_id uuid references public.pricing_plans(id);

comment on column public.payments.target_plan_id is
  'For purpose = subscription: the pricing plan this payment buys. Read by activate_subscription; a plan a vendor picked but never paid for is never written to the subscription.';

alter table public.subscriptions
  add column if not exists last_renewal_reminder_day integer,
  add column if not exists renewal_prompted_at       timestamptz,
  add column if not exists hide_blocked_at           timestamptz;

comment on column public.subscriptions.auto_renew is
  'Opt-in to pay-to-renew reminders before current_period_end. This is NOT auto-charge: Pesapal mobile money has no card-on-file or merchant-initiated debit, so every renewal is a checkout the vendor opens themselves.';
comment on column public.subscriptions.last_renewal_reminder_day is
  'The closest day-before-end mark already reminded for this period (7, 3, 1 …). Reset when a payment starts a new period.';
comment on column public.subscriptions.renewal_prompted_at is
  'First moment this period the vendor was told how to pay: a renewal reminder or the grace notice. apply_subscription_state will not hide a vendor whose subscription expired with this null.';
comment on column public.subscriptions.hide_blocked_at is
  'Set when the subscription expired without the vendor ever being prompted to renew. The listing stays public and Finance is notified; cleared by the next successful payment.';

create index if not exists ix_payments_subscription
  on public.payments(subscription_id) where subscription_id is not null;

-- One in-flight subscription payment per subscription, and one live attempt
-- per (subscription, client key) — the same two guards 0903i gave bookings,
-- for the same reasons.
create unique index if not exists ux_payments_in_flight_subscription
  on public.payments (subscription_id)
  where purpose = 'subscription' and status in ('pending', 'processing');

create unique index if not exists ux_payments_client_idem_subscription
  on public.payments (subscription_id, client_idempotency_key)
  where subscription_id is not null
    and client_idempotency_key is not null
    and status in ('pending', 'processing', 'succeeded');

-- ---------------------------------------------------------------------
-- Retire the two generic writers for this aggregate, exactly as 0809d did
-- for escrow. Every status write below goes through `subscription_notify`,
-- which records the acting user, the payment and the context — not just a
-- new status name — and addresses each party explicitly.
-- ---------------------------------------------------------------------
drop trigger if exists trg_subscription_event on public.subscriptions;
drop trigger if exists trg_outbox on public.subscriptions;

-- ---------------------------------------------------------------------
-- NOTIFICATION FAN-OUT — modelled on escrow_notify.
--
-- One append-only subscription_events row (carrying payment_id, so the
-- event stream links to the money) and one outbox row per recipient, all in
-- the caller's transaction: if the state change rolls back, so do the
-- messages. Admin recipients are whoever holds `subscriptions.manage`, the
-- same predicate the RLS read policy uses.
-- ---------------------------------------------------------------------
create or replace function public.subscription_notify(
  p_subscription_id uuid,
  p_event           subscription_event,
  p_trigger         text,
  p_to_vendor       boolean default true,
  p_to_admin        boolean default false,
  p_payment_id      uuid    default null,
  p_amount          numeric default null,
  p_metadata        jsonb   default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  s         public.subscriptions;
  v         public.vendors;
  pl        public.pricing_plans;
  v_payload jsonb;
  r         record;
begin
  select * into s from public.subscriptions where id = p_subscription_id;
  if s.id is null then return; end if;
  select * into v from public.vendors where id = s.vendor_id;
  if s.plan_id is not null then
    select * into pl from public.pricing_plans where id = s.plan_id;
  end if;

  insert into public.subscription_events (subscription_id, event_type, payment_id, actor_id, metadata)
  values (p_subscription_id, p_event, p_payment_id, auth.uid(),
          coalesce(p_metadata, '{}'::jsonb)
            || case when p_amount is null then '{}'::jsonb
                    else jsonb_build_object('amount', p_amount) end);

  v_payload := jsonb_build_object(
    'subscription_id',     s.id,
    'vendor_id',           s.vendor_id,
    'vendor_name',         v.business_name,
    'plan_id',             s.plan_id,
    'plan_name',           pl.name,
    'billing_cycle',       pl.billing_cycle,
    'subscription_status', s.status,
    'period_start',        s.current_period_start,
    'period_end',          s.current_period_end,
    'trial_ends_at',       s.trial_ends_at,
    'grace_until',         s.grace_until,
    'payment_id',          p_payment_id,
    'event_type',          p_event,
    'amount',              p_amount,
    'currency',            coalesce(pl.currency, 'UGX')
  ) || coalesce(p_metadata, '{}'::jsonb);

  if p_to_vendor and v.owner_id is not null then
    insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
    values ('subscriptions', s.id, p_trigger,
            v_payload || jsonb_build_object('recipient_id', v.owner_id, 'audience', 'vendor'),
            'pending', now());
  end if;

  if p_to_admin then
    for r in
      select distinct ur.profile_id
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where p.key = 'subscriptions.manage'
    loop
      insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
      values ('subscriptions', s.id, p_trigger,
              v_payload || jsonb_build_object('recipient_id', r.profile_id, 'audience', 'admin'),
              'pending', now());
    end loop;
  end if;
end;$$;
revoke all on function public.subscription_notify(uuid, subscription_event, text, boolean, boolean, uuid, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.subscription_notify(uuid, subscription_event, text, boolean, boolean, uuid, numeric, jsonb)
  to service_role;

-- ---------------------------------------------------------------------
-- PRICING — the single source of truth for what a subscription costs.
--
-- Two layers. `_subscription_quote` does the arithmetic with no authorization
-- check, so `activate_subscription` can price under the webhook's identity
-- (no auth.uid()) and can honour a plan retired between checkout and IPN.
-- `subscription_price_plan` is the authorised, stable wrapper the portal
-- previews with and the checkout RPC prices with.
--
-- Returns the plan, the amount and currency, the period the payment would
-- buy, what kind of change it is, and the unused days of the current paid
-- period that a plan change forfeits. `psp_fee_amount` is always 0 — see
-- the header — and is returned rather than omitted so a UI cannot assume a
-- fee that is not there.
-- ---------------------------------------------------------------------
create or replace function public._subscription_quote(
  p_vendor_id      uuid,
  p_plan_id        uuid,
  p_allow_inactive boolean default false)
returns table (
  plan_id            uuid,
  plan_key           text,
  plan_name          text,
  billing_cycle      billing_cycle,
  amount             numeric,
  currency           text,
  psp_fee_amount     numeric,
  change_kind        text,
  subscription_id    uuid,
  current_plan_id    uuid,
  current_plan_name  text,
  current_status     subscription_status,
  current_period_end timestamptz,
  period_start       timestamptz,
  period_end         timestamptz,
  unused_days        integer,
  fx_rate_id         uuid,
  base_amount        numeric,
  base_currency      text)
language plpgsql stable security definer set search_path = public as $$
declare
  pl       public.pricing_plans;
  cur      public.pricing_plans;
  s        public.subscriptions;
  v_kind   text;
  v_start  timestamptz;
  v_end    timestamptz;
  v_unused integer := 0;
  v_fx     uuid;
  v_base   numeric;
  v_new_monthly numeric;
  v_cur_monthly numeric;
begin
  select * into pl from public.pricing_plans where id = p_plan_id;
  if pl.id is null then raise exception 'plan_not_found'; end if;
  if not pl.is_active and not p_allow_inactive then raise exception 'plan_inactive'; end if;

  -- The live row if there is one, else the most recent. A vendor has at
  -- most one live row (ux_subscription_active).
  select * into s
    from public.subscriptions
   where vendor_id = p_vendor_id and deleted_at is null
   order by (status in ('trialing','active','past_due','grace')) desc, created_at desc
   limit 1;

  if s.plan_id is not null then
    select * into cur from public.pricing_plans where id = s.plan_id;
  end if;

  if s.id is null then
    v_kind := 'new';
    v_start := now();
  elsif s.status = 'trialing' then
    -- The free days were promised; the paid period runs after them.
    v_kind := 'trial_conversion';
    v_start := greatest(now(), coalesce(s.trial_ends_at, now()));
  elsif s.status = 'active' and s.plan_id = pl.id then
    -- Same plan, paid early: extend, do not restart.
    v_kind := 'renewal';
    v_start := greatest(now(), coalesce(s.current_period_end, now()));
  elsif s.status = 'active' then
    -- A change of plan starts now and credits nothing. Compared on a
    -- monthly-equivalent basis so an annual plan is not "cheaper" than a
    -- monthly one by virtue of its cycle.
    v_new_monthly := case when pl.billing_cycle = 'annual' then pl.price / 12 else pl.price end;
    v_cur_monthly := case when cur.id is null then null
                          when cur.billing_cycle = 'annual' then cur.price / 12 else cur.price end;
    v_kind := case when v_cur_monthly is null or v_new_monthly >= v_cur_monthly
                   then 'upgrade' else 'downgrade' end;
    v_start := now();
    if s.current_period_end is not null and s.current_period_end > now() then
      v_unused := ceil(extract(epoch from (s.current_period_end - now())) / 86400.0)::integer;
    end if;
  else
    -- grace, past_due, expired, suspended, cancelled: nothing to extend.
    v_kind := 'reactivation';
    v_start := now();
  end if;

  v_end := v_start + case when pl.billing_cycle = 'annual' then interval '1 year'
                          else interval '1 month' end;

  if pl.currency <> 'UGX' then
    v_fx   := public.latest_fx_rate_id(pl.currency, 'UGX');
    v_base := round(pl.price * coalesce((select rate from public.exchange_rates where id = v_fx), 1), 2);
  else
    v_base := pl.price;
  end if;

  return query select
    pl.id, pl.key, pl.name, pl.billing_cycle,
    pl.price, pl.currency,
    0::numeric,                       -- platform absorbs the processing fee
    v_kind,
    s.id, s.plan_id, cur.name, s.status, s.current_period_end,
    v_start, v_end,
    v_unused,
    v_fx, v_base, 'UGX'::text;
end;$$;
revoke all on function public._subscription_quote(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public._subscription_quote(uuid, uuid, boolean) to service_role;

create or replace function public.subscription_price_plan(p_vendor_id uuid, p_plan_id uuid)
returns table (
  plan_id            uuid,
  plan_key           text,
  plan_name          text,
  billing_cycle      billing_cycle,
  amount             numeric,
  currency           text,
  psp_fee_amount     numeric,
  change_kind        text,
  subscription_id    uuid,
  current_plan_id    uuid,
  current_plan_name  text,
  current_status     subscription_status,
  current_period_end timestamptz,
  period_start       timestamptz,
  period_end         timestamptz,
  unused_days        integer,
  fx_rate_id         uuid,
  base_amount        numeric,
  base_currency      text)
language plpgsql stable security definer set search_path = public as $$
begin
  -- The vendor's owner and Finance. Plan prices are public, but the period
  -- and the change kind describe a specific vendor's subscription.
  if not (public.is_vendor_owner(p_vendor_id) or public.has_permission('subscriptions.manage')) then
    perform public._forbidden();
  end if;
  return query select * from public._subscription_quote(p_vendor_id, p_plan_id, false);
end;$$;
revoke all on function public.subscription_price_plan(uuid, uuid) from public, anon;
grant execute on function public.subscription_price_plan(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- OPEN A SUBSCRIPTION CHECKOUT — the counterpart of activate_escrow.
--
-- Takes nothing money-shaped from the caller: which vendor, which plan,
-- which rail, and an optional idempotency key. Everything else is derived.
--
--   * per-vendor transaction lock, taken before anything is read
--   * the caller must own the vendor; the vendor must be active
--   * the plan must be active and priced above zero
--   * one in-flight subscription payment at a time, with the checkout TTL
--     and the same 'payment_already_in_flight' error bookings use
--   * a repeat with the same key is handed the payment it already opened
--   * the target plan is written on the payment, never on the subscription
-- ---------------------------------------------------------------------
create or replace function public.activate_subscription_payment(
  p_vendor_id       uuid,
  p_plan_id         uuid,
  p_provider        payment_provider,
  p_method          payment_method,
  p_idempotency_key text default null)
returns table (
  payment_id      uuid,
  subscription_id uuid,
  amount          numeric,
  currency        text,
  plan_name       text,
  billing_cycle   billing_cycle,
  provider_ref    text,
  checkout_url    text)
language plpgsql security definer set search_path = public as $$
declare
  v         public.vendors;
  s         public.subscriptions;
  q         record;
  ip        public.payments;
  v_ttl     integer := coalesce((public.get_setting('payment_checkout_ttl_minutes') #>> '{}')::integer, 30);
  v_idem    text;
  v_payment uuid;
begin
  if not public.is_vendor_owner(p_vendor_id) then perform public._forbidden(); end if;

  perform pg_advisory_xact_lock(hashtextextended('activate_subscription_payment:' || p_vendor_id::text, 0));

  select * into v from public.vendors where id = p_vendor_id and deleted_at is null;
  if v.id is null then raise exception 'not_found'; end if;
  if v.status <> 'active' then raise exception 'vendor_not_active'; end if;

  if p_provider = 'paypal' and p_method <> 'card' then raise exception 'paypal_requires_card'; end if;

  -- Raises plan_not_found / plan_inactive itself.
  select * into q from public._subscription_quote(p_vendor_id, p_plan_id, false);
  if q.amount is null or q.amount <= 0 then raise exception 'plan_is_free'; end if;

  -- The row the payment attaches to. Reused across periods so the event
  -- stream and payment history stay in one place. Every approved vendor has
  -- one from approve_vendor; the insert is the defensive path for a vendor
  -- created some other way, and it starts 'expired' because no paid period
  -- exists yet — activate_subscription is what makes it 'active'.
  if q.subscription_id is not null then
    select * into s from public.subscriptions where id = q.subscription_id for update;
  else
    insert into public.subscriptions (vendor_id, status, created_by)
    values (p_vendor_id, 'expired', auth.uid())
    returning * into s;
  end if;

  -- A replay of an attempt that already succeeded: hand it back rather than
  -- charging again.
  if p_idempotency_key is not null then
    select * into ip from public.payments p
     where p.subscription_id = s.id
       and p.client_idempotency_key = p_idempotency_key
       and p.status = 'succeeded'
     limit 1;
    if ip.id is not null then
      return query select ip.id, s.id, ip.amount, ip.currency, q.plan_name, q.billing_cycle,
                          ip.provider_ref, ip.checkout_url;
      return;
    end if;
  end if;

  select * into ip from public.payments p
   where p.subscription_id = s.id
     and p.purpose = 'subscription'
     and p.status in ('pending', 'processing')
   order by p.created_at desc
   limit 1
   for update;

  if ip.id is not null then
    if p_idempotency_key is not null and ip.client_idempotency_key = p_idempotency_key then
      return query select ip.id, s.id, ip.amount, ip.currency, q.plan_name, q.billing_cycle,
                          ip.provider_ref, ip.checkout_url;
      return;
    end if;
    if ip.created_at > now() - make_interval(mins => v_ttl) then
      raise exception 'payment_already_in_flight';
    end if;
    -- Abandoned. Fail it through the same path a PSP decline takes, so the
    -- vendor and Finance hear about it, then carry on.
    perform public.record_payment_result(ip.id, 'failed', null, 'checkout_expired');
  end if;

  v_idem := 'PM-' || replace(gen_random_uuid()::text, '-', '');

  begin
    insert into public.payments (payer_id, purpose, subscription_id, target_plan_id, provider,
        provider_method, idempotency_key, client_idempotency_key, amount, currency,
        fx_rate_id, base_amount, base_currency, status, created_by)
    values (auth.uid(), 'subscription', s.id, q.plan_id, p_provider, p_method,
        v_idem, p_idempotency_key, q.amount, q.currency,
        q.fx_rate_id, q.base_amount, 'UGX', 'pending', auth.uid())
    returning id into v_payment;
  exception when unique_violation then
    raise exception 'payment_already_in_flight';
  end;

  perform public.subscription_notify(
    s.id, 'payment_pending', 'subscription.payment_pending',
    true, false, v_payment, q.amount,
    jsonb_build_object(
      'plan_id',      q.plan_id,
      'plan_name',    q.plan_name,
      'billing_cycle', q.billing_cycle,
      'change_kind',  q.change_kind,
      'period_start', q.period_start,
      'period_end',   q.period_end,
      'unused_days',  q.unused_days,
      'provider',     p_provider,
      'method',       p_method));

  return query select v_payment, s.id, q.amount, q.currency, q.plan_name, q.billing_cycle,
                      null::text, null::text;
end;$$;
revoke all on function public.activate_subscription_payment(uuid, uuid, payment_provider, payment_method, text)
  from public, anon;
grant execute on function public.activate_subscription_payment(uuid, uuid, payment_provider, payment_method, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- ACTIVATE — same signature as 0014, new rules.
--
-- The plan comes from the payment. The function refuses to run without a
-- succeeded subscription payment for this subscription that names a plan,
-- and it is idempotent on the payment: a redelivered IPN finds the event
-- already written and returns. The period is priced through the same quote
-- the preview used, evaluated now, so a same-plan renewal extends and a
-- trial conversion starts when the trial ends.
--
-- A plan retired between checkout and IPN is still honoured — the vendor
-- paid the price that was shown — which is what `p_allow_inactive` is for.
-- ---------------------------------------------------------------------
create or replace function public.activate_subscription(p_subscription_id uuid, p_payment_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  s      public.subscriptions;
  p      public.payments;
  q      record;
  v_prev subscription_status;
  v_evt  subscription_event;
begin
  if p_payment_id is null then raise exception 'payment_required'; end if;

  select * into s from public.subscriptions where id = p_subscription_id for update;
  if s.id is null then raise exception 'not_found'; end if;

  select * into p from public.payments where id = p_payment_id;
  if p.id is null
     or p.subscription_id is distinct from s.id
     or p.purpose <> 'subscription'
     or p.status <> 'succeeded' then
    raise exception 'payment_not_applicable';
  end if;
  if p.target_plan_id is null then raise exception 'target_plan_missing'; end if;

  -- Idempotent on the payment: one activation per succeeded payment.
  if exists (select 1 from public.subscription_events e
              where e.payment_id = p.id
                and e.event_type in ('activated', 'renewed', 'reactivated')) then
    return;
  end if;

  select * into q from public._subscription_quote(s.vendor_id, p.target_plan_id, true);

  v_prev := s.status;

  update public.subscriptions
     set plan_id                   = p.target_plan_id,
         status                    = 'active',
         current_period_start      = q.period_start,
         current_period_end        = q.period_end,
         grace_until               = null,
         cancelled_at              = null,
         hide_blocked_at           = null,
         last_renewal_reminder_day = null,
         renewal_prompted_at       = null,
         updated_at                = now()
   where id = s.id;

  update public.vendors set visibility = 'public'
   where id = s.vendor_id and status = 'active';

  v_evt := case
    when q.change_kind = 'renewal' then 'renewed'::subscription_event
    when v_prev in ('grace', 'past_due', 'expired', 'suspended', 'cancelled') then 'reactivated'::subscription_event
    else 'activated'::subscription_event end;

  perform public.subscription_notify(
    s.id, v_evt, 'subscription.activated',
    true, true, p.id, p.amount,
    jsonb_build_object(
      'plan_id',         q.plan_id,
      'plan_name',       q.plan_name,
      'billing_cycle',   q.billing_cycle,
      'change_kind',     q.change_kind,
      'previous_status', v_prev,
      'previous_plan_id', s.plan_id,
      'period_start',    q.period_start,
      'period_end',      q.period_end,
      'unused_days',     q.unused_days));
end;$$;

-- ---------------------------------------------------------------------
-- RECORD PAYMENT RESULT — 0903i's body, plus the subscription branches.
--
-- Same signature. A failed subscription checkout now tells the vendor and
-- Finance (it used to notify nobody); a reversed one is filed as a critical
-- exception and both parties are told. The subscription's status is not
-- moved by a reversal: the plan was activated on money the PSP has since
-- taken back, and what to do about that is a person's call.
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

  if p.status in ('succeeded', 'refunded')
     and not (p.status = 'succeeded' and p_status in ('refunded', 'partially_refunded')) then
    return;
  end if;

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
          'payment_id',      p.id,
          'booking_id',      p.booking_id,
          'subscription_id', p.subscription_id,
          'provider',        p.provider,
          'provider_ref',    coalesce(p_provider_ref, p.provider_ref),
          'failure_reason',  p.failure_reason),
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

  elsif p_status = 'failed' and p.purpose = 'subscription' and p.subscription_id is not null then
    perform public.subscription_notify(
      p.subscription_id, 'payment_failed', 'subscription.payment_failed',
      true, true, p.id, p.amount, jsonb_build_object('reason', p_reason));

  elsif p_status = 'refunded' and p.escrow_id is not null then
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

  elsif p_status = 'refunded' and p.purpose = 'subscription' and p.subscription_id is not null then
    perform public.subscription_notify(
      p.subscription_id, 'payment_failed', 'subscription.payment_failed',
      true, true, p.id, p.amount, jsonb_build_object('reason', coalesce(p_reason, 'psp_reversal')));
    perform public.raise_reconciliation_exception(
      'psp_amount_mismatch', 'payment:' || p.id::text || ':reversed',
      'PSP reversed a subscription payment that had already activated a plan. The plan is still active; decide whether to suspend.',
      jsonb_build_object('payment_id', p.id, 'subscription_id', p.subscription_id),
      p.amount, 0, null, p.id, null, 'critical');
  end if;
end;$$;
revoke all on function public.record_payment_result(uuid, payment_status, text, text) from anon, authenticated;
grant execute on function public.record_payment_result(uuid, payment_status, text, text) to service_role;

-- ---------------------------------------------------------------------
-- LIFECYCLE — same signature as 0014, per row, and it tells people.
--
--   trialing/active past their end  -> grace, vendor + Finance told. The
--                                      grace notice links to checkout, so it
--                                      counts as a renewal prompt.
--   grace past grace_until          -> expired, vendor + Finance told.
--   expired + prompted              -> vendor hidden.
--   expired + NEVER prompted        -> hide withheld, `hide_blocked_at` set,
--                                      Finance told. The listing stays up
--                                      until a person decides or the vendor
--                                      pays (which clears the flag).
--   suspended / cancelled           -> hidden as before; those are decisions
--                                      a person already made.
-- ---------------------------------------------------------------------
create or replace function public.apply_subscription_state()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_grace_hours int := coalesce((public.get_setting('subscription_grace_hours') #>> '{}')::int, 24);
  n int := 0;
  r record;
begin
  for r in
    select s.id
      from public.subscriptions s
     where s.status in ('trialing', 'active')
       and s.deleted_at is null
       and coalesce(s.current_period_end, s.trial_ends_at) < now()
     for update skip locked
  loop
    update public.subscriptions
       set status              = 'grace',
           grace_until         = now() + make_interval(hours => v_grace_hours),
           renewal_prompted_at = coalesce(renewal_prompted_at, now()),
           updated_at          = now()
     where id = r.id;
    perform public.subscription_notify(
      r.id, 'grace_entered', 'subscription.grace_entered', true, true, null, null,
      jsonb_build_object('grace_hours', v_grace_hours));
    n := n + 1;
  end loop;

  for r in
    select s.id
      from public.subscriptions s
     where s.status = 'grace'
       and s.deleted_at is null
       and s.grace_until < now()
     for update skip locked
  loop
    update public.subscriptions set status = 'expired', updated_at = now() where id = r.id;
    perform public.subscription_notify(r.id, 'expired', 'subscription.expired', true, true);
    n := n + 1;
  end loop;

  for r in
    select s.id, s.vendor_id, s.status, s.renewal_prompted_at
      from public.subscriptions s
      join public.vendors v on v.id = s.vendor_id
     where s.status in ('expired', 'suspended', 'cancelled')
       and s.deleted_at is null
       and s.hide_blocked_at is null
       and v.visibility = 'public'
     for update of s skip locked
  loop
    if r.status = 'expired' and r.renewal_prompted_at is null then
      update public.subscriptions set hide_blocked_at = now(), updated_at = now() where id = r.id;
      perform public.subscription_notify(r.id, 'hide_blocked', 'subscription.hide_blocked', false, true);
    else
      update public.vendors set visibility = 'hidden' where id = r.vendor_id;
    end if;
  end loop;

  return n;
end;$$;

-- ---------------------------------------------------------------------
-- PAY-TO-RENEW REMINDERS — the RPC the lifecycle sweep calls.
--
-- Re-checks everything under a row lock and stamps once, so a sweep query
-- that went stale between select and call cannot remind a subscription
-- that was just paid, and cannot send the same mark twice. Returns 'sent'
-- or 'noop'. `auto_renew` off means the vendor asked not to be reminded;
-- the grace notice still reaches them.
-- ---------------------------------------------------------------------
create or replace function public.remind_subscription_renewal(p_subscription_id uuid, p_day_mark integer)
returns text language plpgsql security definer set search_path = public as $$
declare
  s          public.subscriptions;
  pl         public.pricing_plans;
  v_end      timestamptz;
  v_days     integer;
begin
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if s.id is null or s.deleted_at is not null then return 'noop'; end if;
  if s.status not in ('trialing', 'active') or not s.auto_renew then return 'noop'; end if;

  v_end := case when s.status = 'trialing'
                then coalesce(s.trial_ends_at, s.current_period_end)
                else s.current_period_end end;
  if v_end is null or v_end <= now() then return 'noop'; end if;

  v_days := ceil(extract(epoch from (v_end - now())) / 86400.0)::integer;
  if p_day_mark < v_days then return 'noop'; end if;                        -- mark not reached
  if s.last_renewal_reminder_day is not null
     and s.last_renewal_reminder_day <= p_day_mark then return 'noop'; end if; -- already sent

  if s.plan_id is not null then
    select * into pl from public.pricing_plans where id = s.plan_id;
  end if;

  update public.subscriptions
     set last_renewal_reminder_day = p_day_mark,
         renewal_prompted_at       = coalesce(renewal_prompted_at, now()),
         updated_at                = now()
   where id = s.id;

  perform public.subscription_notify(
    s.id, 'renewal_reminder_sent',
    case when s.status = 'trialing' then 'subscription.trial_ending' else 'subscription.renewal_due' end,
    true, false, null, pl.price,
    jsonb_build_object('reminder_day', p_day_mark, 'days_left', v_days, 'period_end', v_end));

  return 'sent';
end;$$;
revoke all on function public.remind_subscription_renewal(uuid, integer) from public, anon, authenticated;
grant execute on function public.remind_subscription_renewal(uuid, integer) to service_role;

-- ---------------------------------------------------------------------
-- choose_subscription_plan — gone.
--
-- It granted any plan to any vendor owner for free. There is no scheduled
-- downgrade in its place: every plan change, up or down, is a checkout,
-- priced by subscription_price_plan and applied by activate_subscription
-- from the payment that paid for it. No code path raises a vendor's plan
-- without a succeeded payment behind it.
-- ---------------------------------------------------------------------
drop function if exists public.choose_subscription_plan(uuid, uuid);
