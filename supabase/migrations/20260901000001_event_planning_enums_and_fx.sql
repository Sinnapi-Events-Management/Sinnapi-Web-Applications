-- =====================================================================
-- Sinnapi — 0901a EVENT PLANNING: vocabulary and the FX primitive
--
-- WHAT THIS SERIES IS FOR
-- An event has been a dead end for the client who posted it. `events` carries a
-- budget nobody sums against, `event_interests` is written by vendors and read
-- only by admins, and `request_quotation` has taken a `p_event_id` since 0823b
-- that the client portal has never passed — so not one client quotation on the
-- platform is linked to the event it is for.
--
-- The result is that the one number a client actually plans around — "what am I
-- allowed to spend" — exists in the database and is never compared to anything.
-- A client can accept four quotes that together cost twice their budget and the
-- platform will help them do it.
--
-- This series makes the event the workspace: what the event still needs, priced
-- per service type; who is in the running for each; and a running total that
-- says how much of the budget is spoken for before the client commits again.
--
-- FILES IN THIS SERIES
--   0901a  this file — enum values, requirement vocabulary, FX conversion
--   0901b  schema — event_requirements, requirement_id on quotes and bookings
--   0901c  the money — budget rollups and the over-budget check
--   0901d  sourcing — interest, invitation, shortlisting, recommendations
--   0901e  guards — the budget check wired into the three committing RPCs
--   0901f  RLS, grants, notification copy, realtime
--
-- WHY ENUM VALUES LIVE IN THEIR OWN FILE
-- `alter type ... add value` cannot be followed by a use of that value in the
-- same transaction, and each migration file is one transaction. 0809a learned
-- this the hard way; every later file in this series may therefore reference
-- `'invited'` freely.
-- =====================================================================

-- ---------------------------------------------------------------------
-- INTEREST — the client can now start the conversation
--
-- `interest_status` has described one direction since 0005: a vendor sees a
-- public event and puts their hand up. The client's half of that — picking a
-- featured vendor who has not seen the event and asking them to quote — has no
-- value to record, and reusing 'interested' would have the platform claiming a
-- vendor volunteered when they were approached.
--
-- Placed BEFORE 'interested' because it is the earlier moment in the only
-- sequence the two share: invited, then (once they answer) interested. Ordering
-- matters because `order by status` on the client's vendor list should read as
-- a funnel rather than alphabetically.
-- ---------------------------------------------------------------------
alter type interest_status add value if not exists 'invited' before 'interested';

-- ---------------------------------------------------------------------
-- REQUIREMENT PRIORITY — what the client would cut first
--
-- The budget guard's job is not only to refuse; it is to say what to do
-- instead. A client 3m over on a 20m wedding is best served by being shown that
-- their nice-to-haves come to 4m, which is a sentence this column makes
-- possible and nothing else in the schema can express.
--
-- Two values on purpose. A three-point scale invites the client to grade
-- everything "high" and tells the guard nothing.
-- ---------------------------------------------------------------------
do $$ begin
  create type requirement_priority as enum ('must_have', 'nice_to_have');
exception when duplicate_object then null; end $$;

-- =====================================================================
-- FX — one place that knows what a foreign amount is worth
--
-- The event budget carries a currency; every quotation and booking carries its
-- own. A client budgeting in UGX who accepts a quote priced in USD is the case
-- that decides whether the meter tells the truth, and `exchange_rates` has held
-- the rates since 0003 with nothing in the database ever reading them for a
-- conversion. `latest_fx_rate_id` (0014) returns an id, not a number, and is
-- used only to stamp payments.
-- =====================================================================

-- ---------------------------------------------------------------------
-- fx_rate — the rate to multiply a `p_base` amount by to get `p_quote`.
--
-- Three ways to answer, in descending order of directness:
--   1. same currency               → 1, without touching the table
--   2. a direct row  base→quote    → its rate
--   3. an inverse row quote→base   → 1/rate
--
-- The inverse is worth having because a feed is normally stored one way round.
-- A pair with no row either way returns NULL rather than 1: a missing rate is
-- not parity, and returning 1 would quietly add a USD amount to a UGX budget as
-- though 1 dollar were 1 shilling — an error of three orders of magnitude,
-- presented as a fact. Every caller in this series treats NULL as "cannot be
-- counted" and reports the row separately.
--
-- `valid_to` is respected so a rate that has been explicitly closed off stops
-- being used; rows have always been written open-ended, so in practice this
-- selects the newest by `fetched_at` — which is what `ix_exchange_rates_pair`
-- is ordered for.
-- ---------------------------------------------------------------------
create or replace function public.fx_rate(p_base text, p_quote text)
returns numeric language sql stable security definer set search_path = public as $$
  select case
    when p_base is null or p_quote is null then null
    when p_base = p_quote then 1::numeric
    else coalesce(
      (select r.rate
         from public.exchange_rates r
        where r.base_currency = p_base and r.quote_currency = p_quote
          and (r.valid_to is null or r.valid_to > now())
        order by r.fetched_at desc
        limit 1),
      (select 1 / r.rate
         from public.exchange_rates r
        where r.base_currency = p_quote and r.quote_currency = p_base
          and (r.valid_to is null or r.valid_to > now())
          and r.rate > 0
        order by r.fetched_at desc
        limit 1))
  end;
$$;

comment on function public.fx_rate(text, text) is
  'Multiplier taking an amount in p_base to p_quote, using the newest live row in exchange_rates '
  '(direct, else inverted). NULL when no rate exists for the pair — never 1.';

-- ---------------------------------------------------------------------
-- fx_convert — the amount itself, rounded to two places.
--
-- Two decimals because every money column in the schema is `numeric(14,2)` and
-- a figure that cannot be stored in one is a figure that will be rounded later
-- by something that does not say so.
-- ---------------------------------------------------------------------
create or replace function public.fx_convert(p_amount numeric, p_from text, p_to text)
returns numeric language sql stable security definer set search_path = public as $$
  select case
    when p_amount is null then null
    else round(p_amount * public.fx_rate(p_from, p_to), 2)
  end;
$$;

comment on function public.fx_convert(numeric, text, text) is
  'p_amount restated in p_to. NULL when the pair has no rate, so callers can count what they '
  'could not convert rather than silently under-reporting a total.';

-- Read-only and self-contained; both are called from RLS-visible reads and from
-- the SECURITY DEFINER rollups in 0901c.
grant execute on function
  public.fx_rate(text, text),
  public.fx_convert(numeric, text, text)
to anon, authenticated;

-- ---------------------------------------------------------------------
-- SETTINGS
--
-- `event_budget_warn_threshold` is the point at which the meter changes colour
-- and the page starts saying something. Deliberately below 100: the research
-- behind this screen is consistent that a warning arriving at the moment of
-- overspend is a receipt, not a warning. 80% leaves a client room to act.
--
-- `event_budget_enforce` exists so the guard can be turned off platform-wide
-- without a deploy if it ever refuses something it should not. It does not
-- weaken the guard — the override in 0901e is per-call and recorded; this is
-- the operational kill switch, and it is on by default.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('event_budget_warn_threshold', '80'::jsonb, 'number',
   'Percentage of an event budget at which the client is warned they are approaching it. Below 100 on purpose: a warning that arrives at the moment of overspend is a receipt, not a warning.'),

  ('event_budget_enforce', 'true'::jsonb, 'boolean',
   'Whether committing RPCs refuse an over-budget booking or quote acceptance unless the client explicitly acknowledges the overage. The per-call acknowledgement is always recorded; this is the platform-wide off switch for the refusal itself.'),

  ('event_recommendation_limit', '12'::jsonb, 'number',
   'How many vendors recommend_vendors_for_event returns per requirement by default. Enough to choose from, few enough to read.')
on conflict (key) do nothing;
