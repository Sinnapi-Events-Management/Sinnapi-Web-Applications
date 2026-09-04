-- =====================================================================
-- Sinnapi — 0903m Subscription payments, step 3: the console and the copy.
--
--   * get_subscription_admin        one subscription with its payments and
--                                   its event stream, for /subscriptions/:id
--   * search_subscriptions_admin    now carries the ids the detail page
--                                   links through and the review flag
--   * count_subscriptions_admin_by_status  honours the review filter
--   * notification templates for every subscription.* trigger 0903l emits
--
-- SIGNATURES
-- The two search functions change their return type and argument list, so
-- they are dropped explicitly: `create or replace` with a different argument
-- list ADDS an overload, and PostgREST then refuses the call as ambiguous.
-- =====================================================================

-- ---------------------------------------------------------------------
-- get_subscription_admin
--
-- One RPC rather than four PostgREST reads: the owner's name and email are
-- not something a `subscriptions.manage` holder can read from `profiles`
-- directly, and the payments a subscription has had are the point of the
-- page. Null for an unknown id — the page renders an empty state.
-- ---------------------------------------------------------------------
create or replace function public.get_subscription_admin(p_subscription_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_doc jsonb;
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  select jsonb_build_object(
    'id',                        s.id,
    'status',                    s.status,
    'current_period_start',      s.current_period_start,
    'current_period_end',        s.current_period_end,
    'trial_ends_at',             s.trial_ends_at,
    'grace_until',               s.grace_until,
    'auto_renew',                s.auto_renew,
    'cancelled_at',              s.cancelled_at,
    'last_renewal_reminder_day', s.last_renewal_reminder_day,
    'renewal_prompted_at',       s.renewal_prompted_at,
    'hide_blocked_at',           s.hide_blocked_at,
    'created_at',                s.created_at,
    'updated_at',                s.updated_at,

    'plan', case when pp.id is null then null else jsonb_build_object(
      'id',            pp.id,
      'key',           pp.key,
      'name',          pp.name,
      'billing_cycle', pp.billing_cycle,
      'price',         pp.price,
      'currency',      pp.currency,
      'is_active',     pp.is_active) end,

    'vendor', jsonb_build_object(
      'id',            v.id,
      'business_name', v.business_name,
      'status',        v.status,
      'visibility',    v.visibility,
      'owner', jsonb_build_object(
        'id',    o.id,
        'name',  o.full_name,
        'email', o.email)),

    -- Newest first: the payment Finance is asking about is almost always
    -- the latest one.
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',               p.id,
               'status',           p.status,
               'amount',           p.amount,
               'currency',         p.currency,
               'provider',         p.provider,
               'provider_method',  p.provider_method,
               'provider_ref',     p.provider_ref,
               'target_plan_name', tp.name,
               'failure_reason',   p.failure_reason,
               'paid_at',          p.paid_at,
               'created_at',       p.created_at)
             order by p.created_at desc)
        from public.payments p
        left join public.pricing_plans tp on tp.id = p.target_plan_id
       where p.subscription_id = s.id), '[]'::jsonb),

    -- Oldest first: the order the story reads in.
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',          e.id,
               'event_type',  e.event_type,
               'payment_id',  e.payment_id,
               'actor_name',  a.full_name,
               'metadata',    e.metadata,
               'occurred_at', e.occurred_at)
             order by e.occurred_at asc)
        from public.subscription_events e
        left join public.profiles a on a.id = e.actor_id
       where e.subscription_id = s.id), '[]'::jsonb)
  )
  into v_doc
  from public.subscriptions s
  join public.vendors v on v.id = s.vendor_id
  left join public.profiles o on o.id = v.owner_id
  left join public.pricing_plans pp on pp.id = s.plan_id
  where s.id = p_subscription_id
    and s.deleted_at is null;

  return v_doc;
end;$$;
revoke all on function public.get_subscription_admin(uuid) from public, anon;
grant execute on function public.get_subscription_admin(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- search_subscriptions_admin — 0718's query plus vendor_id, plan_id,
-- auto_renew and hide_blocked_at on the row, and a review filter.
-- ---------------------------------------------------------------------
drop function if exists public.search_subscriptions_admin(text, text, uuid, integer, text, text, integer, integer);

create function public.search_subscriptions_admin(
  p_search        text    default null,
  p_status        text    default null,
  p_plan_id       uuid    default null,
  p_expiring_days integer default null,
  p_needs_review  boolean default null,
  p_sort_field    text    default 'current_period_end',
  p_sort_dir      text    default 'asc',
  p_limit         integer default 25,
  p_offset        integer default 0)
returns table (
  id                 uuid,
  vendor_id          uuid,
  plan_id            uuid,
  status             subscription_status,
  current_period_end timestamptz,
  grace_until        timestamptz,
  trial_ends_at      timestamptz,
  auto_renew         boolean,
  hide_blocked_at    timestamptz,
  business_name      text,
  plan_name          text,
  total_count        bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  v_sort_field := case
    when p_sort_field in ('current_period_end','grace_until','trial_ends_at','status')
      then p_sort_field else 'current_period_end' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'desc' then 'desc' else 'asc' end;

  return query execute format($q$
    select s.id, s.vendor_id, s.plan_id, s.status, s.current_period_end, s.grace_until,
           s.trial_ends_at, s.auto_renew, s.hide_blocked_at,
           v.business_name, p.name as plan_name,
           count(*) over() as total_count
    from public.subscriptions s
    join public.vendors v on v.id = s.vendor_id
    left join public.pricing_plans p on p.id = s.plan_id
    where s.deleted_at is null
      and ($1 is null or v.business_name ilike '%%' || $1 || '%%')
      and ($2 is null or s.status = $2::subscription_status)
      and ($3 is null or s.plan_id = $3)
      and ($4 is null
           or (s.current_period_end >= now()
               and s.current_period_end <= now() + make_interval(days => $4)))
      and ($5 is not true or s.hide_blocked_at is not null)
    order by s.%I %s
    limit $6 offset $7
  $q$, v_sort_field, v_sort_dir)
  using v_search, p_status, p_plan_id, p_expiring_days, p_needs_review, p_limit, p_offset;
end;
$$;
revoke all on function public.search_subscriptions_admin(text, text, uuid, integer, boolean, text, text, integer, integer)
  from public, anon;
grant execute on function public.search_subscriptions_admin(text, text, uuid, integer, boolean, text, text, integer, integer)
  to authenticated, service_role;

drop function if exists public.count_subscriptions_admin_by_status(text, uuid, integer);

create function public.count_subscriptions_admin_by_status(
  p_search        text    default null,
  p_plan_id       uuid    default null,
  p_expiring_days integer default null,
  p_needs_review  boolean default null)
returns table (status subscription_status, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  return query
    select s.status, count(*)
    from public.subscriptions s
    join public.vendors v on v.id = s.vendor_id
    where s.deleted_at is null
      and (v_search is null or v.business_name ilike '%' || v_search || '%')
      and (p_plan_id is null or s.plan_id = p_plan_id)
      and (p_expiring_days is null
           or (s.current_period_end >= now()
               and s.current_period_end <= now() + make_interval(days => p_expiring_days)))
      and (p_needs_review is not true or s.hide_blocked_at is not null)
    group by s.status;
end;
$$;
revoke all on function public.count_subscriptions_admin_by_status(text, uuid, integer, boolean) from public, anon;
grant execute on function public.count_subscriptions_admin_by_status(text, uuid, integer, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Templates. `{{placeholders}}` resolve against the outbox payload built by
-- subscription_notify: vendor_name, plan_name, billing_cycle, amount,
-- currency, period_start, period_end, grace_until, days_left, reason,
-- change_kind. Seeded as data so Support can reword without a deploy.
-- Action-required and terminal outcomes get mail; progress steps do not.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values

-- ---------- checkout opened ----------
('subscription.payment_pending.vendor', 'in_app', 'Complete your {{plan_name}} payment',
 'Pay {{currency}} {{amount}} to activate the {{plan_name}} plan. Your listing updates the moment the payment clears.', 'en'),

-- ---------- activated / renewed / reactivated ----------
('subscription.activated.vendor', 'in_app', '{{plan_name}} plan is active',
 'Your {{plan_name}} plan runs until {{period_end}}. Your public listing is live.', 'en'),
('subscription.activated.vendor', 'email', 'Your {{plan_name}} plan is active — Sinnapi',
 'Thank you — we have received {{currency}} {{amount}} for the {{plan_name}} plan ({{billing_cycle}}).\n\nThis period runs from {{period_start}} to {{period_end}}.\n\nYour public listing is live. We will remind you before the period ends so you can renew in time; there is no automatic charge.', 'en'),
('subscription.activated.admin', 'in_app', 'Subscription paid — {{vendor_name}}',
 '{{vendor_name}} paid {{currency}} {{amount}} for {{plan_name}} ({{change_kind}}). Period ends {{period_end}}.', 'en'),

-- ---------- payment problems ----------
('subscription.payment_failed.vendor', 'in_app', 'Subscription payment did not go through',
 'Your payment for the {{plan_name}} plan failed: {{reason}}. Your current plan is unchanged; you can try again from your subscription page.', 'en'),
('subscription.payment_failed.vendor', 'email', 'Subscription payment failed — Sinnapi',
 'We could not complete your payment for the {{plan_name}} plan.\n\nReason: {{reason}}\n\nNo money has been taken and your current plan is unchanged. You can retry with the same or a different payment method from your subscription page.', 'en'),
('subscription.payment_failed.admin', 'in_app', 'Subscription payment failed — {{vendor_name}}',
 '{{plan_name}} payment of {{currency}} {{amount}} failed for {{vendor_name}}: {{reason}}.', 'en'),

-- ---------- renewal reminders ----------
('subscription.renewal_due.vendor', 'in_app', 'Your {{plan_name}} plan ends in {{days_left}} days',
 'Renew before {{period_end}} to keep your listing live. Paying early extends your current period — no days are lost.', 'en'),
('subscription.renewal_due.vendor', 'email', 'Your {{plan_name}} plan ends on {{period_end}}',
 'Your {{plan_name}} plan ends on {{period_end}} — {{days_left}} days from now.\n\nRenewal: {{currency}} {{amount}} for another {{billing_cycle}} period.\n\nWe do not charge automatically. Renew from your subscription page whenever you are ready; paying early extends the current period rather than restarting it. If the period lapses you get a short grace window before your listing is hidden.', 'en'),
('subscription.trial_ending.vendor', 'in_app', 'Your trial ends in {{days_left}} days',
 'Choose a plan before {{period_end}} to keep your listing live. The paid period starts when the trial ends.', 'en'),
('subscription.trial_ending.vendor', 'email', 'Your Sinnapi trial ends on {{period_end}}',
 'Your free trial ends on {{period_end}} — {{days_left}} days from now.\n\nChoose a plan from your subscription page to keep your listing live. The paid period starts when the trial ends, so paying now costs you none of your remaining free days.\n\nIf the trial lapses you get a short grace window before your listing is hidden.', 'en'),

-- ---------- grace ----------
('subscription.grace_entered.vendor', 'in_app', 'Your subscription has lapsed',
 'Your period ended. You have until {{grace_until}} to pay before your listing is hidden.', 'en'),
('subscription.grace_entered.vendor', 'email', 'Action needed: your Sinnapi subscription has lapsed',
 'Your subscription period has ended and your account is now in its grace window.\n\nPay for a plan before {{grace_until}} to keep your public listing live. After that your listing is hidden from search until you pay; existing bookings are not affected.\n\nRenew from your subscription page — it takes a minute.', 'en'),
('subscription.grace_entered.admin', 'in_app', 'Subscription in grace — {{vendor_name}}',
 '{{vendor_name}} lapsed and is in grace until {{grace_until}}.', 'en'),

-- ---------- expired ----------
('subscription.expired.vendor', 'in_app', 'Your listing is no longer visible',
 'Your subscription has expired and your public listing is hidden. Pay for a plan to be listed again immediately.', 'en'),
('subscription.expired.vendor', 'email', 'Your Sinnapi listing is hidden',
 'Your subscription has expired and your public listing has been hidden from search.\n\nExisting bookings and conversations continue as normal. To be listed again, pay for a plan from your subscription page — your listing comes back the moment the payment clears.', 'en'),
('subscription.expired.admin', 'in_app', 'Subscription expired — {{vendor_name}}',
 '{{vendor_name}} expired without renewing.', 'en'),

-- ---------- hide withheld ----------
('subscription.hide_blocked.admin', 'in_app', 'Review: {{vendor_name}} expired without a renewal prompt',
 '{{vendor_name}} expired but was never reminded to renew, so their listing has NOT been hidden. Check the subscription and decide.', 'en'),
('subscription.hide_blocked.admin', 'email', 'Review needed: {{vendor_name}} expired without a renewal prompt',
 '{{vendor_name}}''s subscription expired, but no renewal reminder or grace notice was ever sent to them — so the platform has not hidden their listing.\n\nOpen the subscription in the console to see its history and decide whether to hide the vendor or reach out. The flag clears itself if the vendor pays.', 'en')

on conflict (trigger_key, channel, locale) do nothing;
