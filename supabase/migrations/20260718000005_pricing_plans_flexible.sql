-- =====================================================================
-- Sinnapi — 0718 Flexible pricing plans
-- Opens the pricing catalogue up so admins can author arbitrary plans from
-- the portal, instead of being pinned to the three seeded tiers.
--
--   * key: plan_key enum ('starter','professional','elite') -> text (slug).
--     The enum capped the catalogue at three keys (six rows, given the
--     (key, billing_cycle) unique); a free-form slug lets a new plan be
--     created with any key. The unique (key, billing_cycle) pair is kept, so
--     a plan is still identified by its slug + cycle and duplicates are
--     rejected. The `plan_key` type is left defined but unused — nothing else
--     references it, and dropping it buys nothing.
--
--   * tagline / highlight / features: three columns added to bring the admin
--     record to parity with the marketing catalogue in web-public's
--     containers/pricing (data/plans.ts): the one-line positioning, the
--     "most popular" emphasis flag, and the bullet list rendered on the
--     public card. `features` is a text[] of display strings — the same shape
--     as the mock's `features: string[]` — kept distinct from the structured
--     `plan_features` table, which encodes machine-readable capability flags.
--
-- RLS, the updated_at trigger and the audit trigger already cover
-- pricing_plans (0010/0011), so the new columns inherit them with no extra
-- wiring.
-- =====================================================================

-- Slug is interpolated into public URLs and used as the stable plan key, so
-- constrain it the same way vendor slugs are: lowercase, digits, single
-- separators. The three seeded keys ('starter', …) already satisfy this.
alter table public.pricing_plans
  alter column key type text using key::text;

alter table public.pricing_plans
  add constraint pricing_plans_key_format
    check (key ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$');

alter table public.pricing_plans
  add column if not exists tagline   text,
  add column if not exists highlight boolean not null default false,
  add column if not exists features  text[] not null default '{}';

comment on column public.pricing_plans.key is
  'Stable URL-safe plan slug (was the plan_key enum). Unique per billing_cycle.';
comment on column public.pricing_plans.tagline is
  'One-line positioning shown under the plan name on the public card.';
comment on column public.pricing_plans.highlight is
  'Marks the recommended/"most popular" plan for emphasis on the pricing page.';
comment on column public.pricing_plans.features is
  'Display bullet list for the marketing card. Distinct from plan_features, '
  'which holds structured capability flags.';
