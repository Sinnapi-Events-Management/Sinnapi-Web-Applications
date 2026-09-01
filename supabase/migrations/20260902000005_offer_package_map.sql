-- =====================================================================
-- Sinnapi — 0902e Offers: every offer on every package, in one read
--
-- WHY THIS EXISTS WHEN `package_offers` ALREADY DOES
-- `package_offers` answers about ONE package, which is the right shape for the
-- one place a single package is on screen alone. Every other surface shows a
-- vendor's whole catalogue: the profile in the client portal, the profile on
-- the marketing site, the console's moderation tab. Calling `package_offers`
-- per card there is one round trip per package — six on a typical profile, and
-- six on every navigation back to it.
--
-- Worse on the marketing site specifically: that page is server-rendered, so
-- six sequential round trips land in the visitor's time-to-first-byte rather
-- than in a spinner they can watch.
--
-- So the fan-out happens once, in SQL, where the join it needs is a join.
--
-- ONE ROW PER (PACKAGE, OFFER), AND `tier_id` IS THE SCOPE
-- A tier-scoped offer returns one row per tier it covers. A package- or
-- vendor-scoped offer returns a single row with `tier_id` null, meaning "every
-- tier of this package". The caller groups by `package_id` and then matches
-- `tier_id` against the tier on screen or null — which is exactly the rule
-- `offer_targets_package` applies, expressed as data so the browser does not
-- have to re-implement it.
--
-- Returning a row per tier for every offer would have been simpler and is
-- wrong: it would multiply a vendor-wide offer across four tiers of six
-- packages and hand the browser 24 rows describing one discount.
-- =====================================================================

create or replace function public.vendor_package_offers(p_vendor_id uuid)
returns table (
  package_id       uuid,
  tier_id          uuid,
  discount_id      uuid,
  promotion_id     uuid,
  promotion_title  text,
  banner_url       text,
  title            text,
  description      text,
  terms            text,
  code             text,
  is_automatic     boolean,
  type             text,
  value            numeric,
  currency         text,
  max_discount_amount numeric,
  min_amount       numeric,
  starts_at        timestamptz,
  ends_at          timestamptz,
  remaining_uses   integer,
  scope            text)
language sql stable security definer set search_path = public as $$
  with live as (
    select d.*, p.title as promo_title, p.banner_url as promo_banner,
           p.description as promo_description, p.terms as promo_terms
      from public.discounts d
      left join public.promotions p on p.id = d.promotion_id
     where (d.vendor_id = p_vendor_id or d.vendor_id is null)
       and public.discount_is_live(d.id)
       and coalesce(public.discount_remaining_uses(d.id), 1) > 0
  ),
  published as (
    select t.id, t.vendor_id
      from public.quote_templates t
     where t.vendor_id = p_vendor_id
       and public.quote_package_is_public(t.id)
  ),
  -- The pairs an offer covers at all. Computed before the tier fan-out so the
  -- expensive predicate runs once per (offer, package) rather than once per
  -- (offer, package, tier).
  pairs as (
    select l.id as discount_id, t.id as package_id,
           exists (select 1 from public.offer_targets ot
                    where ot.discount_id = l.id
                      and ot.kind = 'package_tier'
                      and ot.package_id = t.id) as tier_scoped
      from live l
      cross join published t
     where public.offer_targets_package(null, l.id, t.id, null)
  )
  select
    pr.package_id,
    -- Null means "every tier of this package". A tier-scoped offer names its
    -- tiers instead, one row each.
    case when pr.tier_scoped then ot.tier_id else null end,
    l.id,
    l.promotion_id,
    l.promo_title,
    l.promo_banner,
    coalesce(l.title, l.code, l.promo_title, 'Special offer'),
    coalesce(l.description, l.promo_description),
    coalesce(l.terms, l.promo_terms),
    -- The gate, at the one place a code can leave the database. Identical to
    -- `package_offers` on purpose: two reads of the same rows must not disagree
    -- about who may see a code.
    case when auth.uid() is null then null else l.code end,
    l.is_automatic,
    l.type::text,
    l.value,
    l.currency,
    l.max_discount_amount,
    l.min_amount,
    l.starts_at,
    l.ends_at,
    public.discount_remaining_uses(l.id),
    case
      when pr.tier_scoped then 'tier'
      when exists (select 1 from public.offer_targets t2 where t2.discount_id = l.id)
        then 'package'
      when l.promotion_id is not null
       and exists (select 1 from public.offer_targets t2 where t2.promotion_id = l.promotion_id)
        then 'campaign'
      else 'vendor'
    end
  from pairs pr
  join live l on l.id = pr.discount_id
  -- The lateral join is what turns "this offer is tier-scoped" into one row per
  -- named tier. `left join` on the false branch keeps the single row for every
  -- other offer, which an inner join would drop.
  left join lateral (
    select ot.tier_id from public.offer_targets ot
     where pr.tier_scoped
       and ot.discount_id = pr.discount_id
       and ot.kind = 'package_tier'
       and ot.package_id = pr.package_id
  ) ot on true
 where public.vendor_is_public(p_vendor_id)
 order by pr.package_id, l.ends_at;
$$;

comment on function public.vendor_package_offers(uuid) is
  'Every live offer on every published package of one vendor, one row per (package, offer) — or '
  'per (package, tier, offer) where the offer is tier-scoped. A null tier_id means every tier.';

grant execute on function public.vendor_package_offers(uuid) to anon, authenticated;
