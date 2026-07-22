-- =====================================================================
-- Sinnapi — 0722 Public pricing catalogue
-- Backfills the seeded pricing plans with the list prices the marketing site
-- had hard-coded, and adds the two anonymous-callable reads behind /pricing:
--
--   * list_pricing_plans_public  -> the plan cards + billing toggle
--   * list_plan_features_public  -> the feature comparison matrix
--
-- WHY A PIVOT RPC AND NOT A TABLE SELECT
-- `pricing_plans` stores one row per (key, billing_cycle), but the public card
-- is one tier with a monthly⇄annual toggle — two rows, one card. Pivoting in
-- the client means either two round trips and a join written at every call
-- site, or a card whose identity changes when you flip the toggle. Pivoting in
-- the function means one round trip, one reviewed projection, and a toggle that
-- swaps a number without refetching anything.
--
-- ANNUAL PRICE UNITS — READ BEFORE CHANGING
-- An annual row's `price` is the FULL YEARLY CHARGE, not a per-month figure.
-- That is what the rest of the schema already assumes: activate_subscription
-- (0014) advances the period by `interval '1 year'`, and every MRR report
-- (0720/0721) divides by 12 — `case billing_cycle when 'annual' then price/12`.
-- The RPC therefore returns both: `price_annual` as charged, and
-- `price_annual_monthly` as the /mo equivalent the card displays. Storing the
-- per-month figure in `price` instead would silently divide reported revenue
-- by twelve.
--
-- SECURITY
-- Both are SECURITY DEFINER, so they bypass RLS and must re-state the
-- predicates their policies enforce (0011_rls.sql):
--
--   plans_read     : is_active (or admin — not applicable to an anon caller)
--   plan_feat_read : unrestricted, but scoped here to active plans anyway, so
--                    a deactivated plan cannot leak through the matrix after
--                    its card has disappeared from the grid.
--
-- Neither takes a free-text or identifier parameter, so there is no injection
-- surface; the catalogue is small but `p_limit` is still clamped, so an
-- anonymous caller cannot ask for an unbounded scan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Part 1 — backfill the catalogue
--
-- 0012 seeded the three tiers at price 0 with no tagline, highlight or feature
-- bullets, because the real figures lived in the web-public repo
-- (containers/pricing/.../data/plans.ts). That file is now deleted and the page
-- reads from here, so the numbers move into the database — otherwise the
-- refactor ships a pricing page that advertises UGX 0.
--
-- Guarded on `price = 0`: that is the untouched-seed signature. An admin who
-- has already priced a plan through the portal keeps their figures, so this is
-- safe to run against an environment that has been in use.
-- ---------------------------------------------------------------------
update public.pricing_plans p
   set price      = v.price_monthly,
       tagline    = v.tagline,
       highlight  = v.highlight,
       sort_order = v.sort_order,
       features   = v.features
  from (values
    ('starter', 49000::numeric, 'Get discovered and start taking enquiries.', false, 1,
      array[
        'Verified Vendor Badge',
        'Up to 10 portfolio images',
        'Standard search placement',
        'Direct messaging',
        'Quote request system']),
    ('professional', 99000::numeric, 'Stand out and convert more clients.', true, 2,
      array[
        'Verified Vendor Badge',
        'Unlimited portfolio images',
        'Portfolio video',
        'Priority search placement',
        'Direct messaging',
        'Client analytics',
        'Quote request system']),
    ('elite', 199000::numeric, 'Maximum visibility and white-glove support.', false, 3,
      array[
        'Verified Vendor Badge',
        'Unlimited portfolio images',
        'Portfolio video',
        'Top-tier search placement',
        'Direct messaging',
        'Client analytics',
        'Homepage featured spot',
        'Dedicated account manager',
        'Quote request system'])
  ) as v(key, price_monthly, tagline, highlight, sort_order, features)
 where p.key = v.key
   and p.billing_cycle = 'monthly'
   and p.price = 0;

-- The annual counterpart of each tier, priced at the discounted per-month rate
-- the marketing page advertised (39k/79k/159k) × 12. Identity — name, tagline,
-- bullets, emphasis — is copied from the monthly row so the two rows describe
-- one product; from here on the admin portal edits each independently.
insert into public.pricing_plans
  (key, name, description, price, currency, billing_cycle, trial_days, sort_order,
   tagline, highlight, features)
select
  p.key, p.name, p.description, v.price_annual, p.currency, 'annual',
  p.trial_days, p.sort_order, p.tagline, p.highlight, p.features
from public.pricing_plans p
join (values
  ('starter',       468000::numeric),   --  39,000/mo × 12
  ('professional',  948000::numeric),   --  79,000/mo × 12
  ('elite',        1908000::numeric)    -- 159,000/mo × 12
) as v(key, price_annual) on v.key = p.key
where p.billing_cycle = 'monthly'
on conflict (key, billing_cycle) do nothing;

-- Two capabilities every tier includes were on the marketing comparison table
-- but never in `plan_features`, so a DB-driven matrix would have dropped them.
-- Added for the monthly rows only — the read below resolves features per plan
-- *key*, preferring the monthly row, so the annual rows inherit them without a
-- duplicate set that could drift.
insert into public.plan_features(plan_id, feature_key, value)
select p.id, f.feature_key, 'true'::jsonb
from public.pricing_plans p
cross join (values ('direct_messaging'), ('quote_requests')) as f(feature_key)
where p.billing_cycle = 'monthly'
on conflict (plan_id, feature_key) do nothing;

-- ---------------------------------------------------------------------
-- Part 2 — public reads
-- Re-runnable: drop by exact signature before recreating, so a changed
-- projection never leaves a stale overload behind.
-- ---------------------------------------------------------------------
drop function if exists public.list_pricing_plans_public(integer);
drop function if exists public.list_plan_features_public();

-- ---------------------------------------------------------------------
-- list_pricing_plans_public
-- The active catalogue as one row per tier, with both billing cycles resolved.
--
-- The monthly row is the tier's identity when it exists, with the annual row as
-- the fallback — so an annual-only plan still renders a complete card instead
-- of vanishing, and a monthly-only plan (the shape of the catalogue before this
-- migration) returns null annual prices, which the page reads as "this tier has
-- no yearly option" and degrades the toggle accordingly.
--
-- `price_annual_monthly` is derived, not stored: the card advertises a /mo
-- figure while the vendor is charged yearly, and computing it here means the
-- two can never disagree by a rounding rule applied in one place and not the
-- other. Rounded to whole currency units — a half-shilling in a headline price
-- is noise.
-- ---------------------------------------------------------------------
create function public.list_pricing_plans_public(p_limit integer default 12)
returns table (
  key                  text,
  name                 text,
  tagline              text,
  description          text,
  highlight            boolean,
  sort_order           integer,
  currency             text,
  trial_days           integer,
  features             text[],
  price_monthly        numeric,
  price_annual         numeric,
  price_annual_monthly numeric)
language sql stable security definer set search_path = public as $$
  select
    k.key,
    coalesce(m.name, a.name),
    coalesce(m.tagline, a.tagline),
    coalesce(m.description, a.description),
    coalesce(m.highlight, a.highlight, false),
    coalesce(m.sort_order, a.sort_order, 0),
    coalesce(m.currency, a.currency),
    coalesce(m.trial_days, a.trial_days, 0),
    coalesce(m.features, a.features, array[]::text[]),
    m.price,
    a.price,
    round(a.price / 12)
  from (
    select distinct pp.key from public.pricing_plans pp where pp.is_active
  ) k
  -- `unique (key, billing_cycle)` makes each side at most one row; the limit is
  -- belt-and-braces so a future constraint change can't fan this out.
  left join lateral (
    select * from public.pricing_plans p
    where p.key = k.key and p.billing_cycle = 'monthly' and p.is_active
    limit 1
  ) m on true
  left join lateral (
    select * from public.pricing_plans p
    where p.key = k.key and p.billing_cycle = 'annual' and p.is_active
    limit 1
  ) a on true
  -- Admin-authored order first, then name — a stable tie-break, so two plans
  -- sharing a sort_order don't swap places between ISR snapshots.
  order by coalesce(m.sort_order, a.sort_order, 0), coalesce(m.name, a.name)
  limit greatest(1, least(coalesce(p_limit, 12), 24));
$$;

-- ---------------------------------------------------------------------
-- list_plan_features_public
-- The structured capability flags behind the comparison matrix, keyed by plan
-- key so they line up with the cards above them.
--
-- Values stay raw jsonb (true, 10, -1, "priority") rather than display strings:
-- these are machine-readable flags, and how "-1" becomes "Unlimited" or
-- "top_tier" becomes "Top-tier" is a presentation rule that belongs with the
-- table that renders it, not baked into the API for every future consumer.
--
-- `distinct on` collapses the monthly and annual rows of a tier to one feature
-- set, preferring monthly — billing cadence doesn't change what a plan can do,
-- and `billing_cycle`'s enum declaration order ('monthly','annual') is what
-- makes that ordering mean what it reads like.
-- ---------------------------------------------------------------------
create function public.list_plan_features_public()
returns table (
  plan_key    text,
  feature_key text,
  value       jsonb)
language sql stable security definer set search_path = public as $$
  select distinct on (p.key, f.feature_key)
    p.key, f.feature_key, f.value
  from public.pricing_plans p
  join public.plan_features f on f.plan_id = p.id
  where p.is_active
  order by p.key, f.feature_key, p.billing_cycle;
$$;

-- Public site is anonymous: like the 0722 home/search reads, these are
-- reachable by `anon`. Safe because both restate the `is_active` predicate
-- above and expose only catalogue columns — no subscriber or vendor data.
grant execute on function
  public.list_pricing_plans_public(integer),
  public.list_plan_features_public()
to anon, authenticated;
