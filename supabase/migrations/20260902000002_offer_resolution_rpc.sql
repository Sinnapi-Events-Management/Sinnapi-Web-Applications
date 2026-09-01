-- =====================================================================
-- Sinnapi — 0902b Offers: resolving them, pricing them, showing them
--
-- 0902a gave an offer a target. This file is how the four apps ask about one.
--
-- THE CODE IS THE ONLY SECRET ON A DISCOUNT ROW
-- Everything else — the saving, the deadline, what it covers, how many uses
-- are left — is marketing, and a platform that hides its marketing behind a
-- login has no marketing. But `discounts.code` is a bearer token: printing it
-- on a page Google indexes means a hundred-use campaign is gone by Tuesday.
--
-- RLS cannot express that, because RLS is row-level and this is one column of
-- one row. So the public path is not the table at all — it is these functions,
-- which return the row with `code` blanked for a caller with no `auth.uid()`.
-- `discounts_read` in 0011 stays `authenticated`-only and is left untouched:
-- there is now exactly one way for a signed-out visitor to learn about an
-- offer, and it is one that cannot hand over a code by accident.
--
-- WHY `is_automatic` IS RETURNED EVEN WHEN THE CODE IS NOT
-- An automatic offer needs no code — the client sees the price already
-- reduced. Telling a signed-out visitor which of the two they are looking at
-- is the difference between "sign in and this price is yours" and "sign in and
-- you will be asked for a code you do not have".
--
-- THE PRICING FUNCTION IS THE ONE THE MONEY USES
-- `resolve_discount_amount` is called by these display functions AND by
-- `send_quotation` in 0902c. Not two implementations that must agree — one, so
-- the saving on the card is the saving on the quote by construction rather
-- than by review.
-- =====================================================================

-- ---------------------------------------------------------------------
-- HOW MANY USES ARE LEFT
--
-- Null means uncapped, which is not the same as zero and must not be rendered
-- as one. Counted off `discount_redemptions` rather than trusted from
-- `used_count`: 0902c makes that column a trigger-maintained cache, and a
-- cache is the wrong thing to gate a cap on when the ledger is right there.
--
-- Only live reservations and settled redemptions count. A released one — the
-- client declined, the quote was withdrawn — is a use that did not happen and
-- must return to the pool, or a campaign quietly dies of quotes nobody took.
-- ---------------------------------------------------------------------
create or replace function public.discount_remaining_uses(p_discount_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case
    when d.max_uses is null then null
    else greatest(0, d.max_uses - (
      select count(*)::int from public.discount_redemptions r
       where r.discount_id = d.id
         and r.status in ('reserved', 'redeemed')))
  end
  from public.discounts d
 where d.id = p_discount_id;
$$;

comment on function public.discount_remaining_uses(uuid) is
  'Uses left on a discount, or null when uncapped. Counted from the redemption ledger, not from '
  'the used_count cache.';

-- ---------------------------------------------------------------------
-- HOW MANY TIMES HAS THIS CLIENT USED IT
--
-- `max_per_client` exists because an uncapped-per-person campaign is a
-- campaign one client can drain. Released rows are excluded for the same
-- reason as above: a client who declined a quote has not spent their allowance.
-- ---------------------------------------------------------------------
create or replace function public.discount_client_uses(p_discount_id uuid, p_client_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.discount_redemptions r
   where r.discount_id = p_discount_id
     and r.redeemed_by = p_client_id
     and r.status in ('reserved', 'redeemed');
$$;

-- ---------------------------------------------------------------------
-- WHAT THIS DISCOUNT TAKES OFF A NET
--
-- The single pricing rule, called by the card and by the quote:
--
--     percentage:  amount = round(net × value / 100, 2)
--     fixed:       amount = value
--     both:        amount = least(amount, max_discount_amount)   -- if capped
--     both:        amount = least(amount, net)                   -- never below zero
--
-- `net` is the tier's price AFTER the tier's own `discount_rate` and BEFORE
-- tax, which is stated in 0902a's header and is what `packagePricing.ts` calls
-- `net`. Passing a gross here would quote a saving that does not match the
-- card; passing a tax-inclusive total would discount the tax, which is not the
-- vendor's to give away.
--
-- The cap clamps AFTER the percentage rather than reducing the rate, because
-- "20% off up to UGX 500,000" is a promise about the ceiling, not about the
-- rate — a client on a small booking still gets the full twenty percent.
--
-- Immutable-ish rather than immutable: it reads the discount row, so it is
-- `stable`. That is what lets it be called from a select list per tier.
-- ---------------------------------------------------------------------
create or replace function public.resolve_discount_amount(p_discount_id uuid, p_net numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select case
    when p_net is null or p_net <= 0 then 0
    else least(
      case
        when d.type = 'percentage' then round(p_net * d.value / 100.0, 2)
        else d.value
      end,
      coalesce(d.max_discount_amount, 'infinity'::numeric),
      p_net)
  end
  from public.discounts d
 where d.id = p_discount_id;
$$;

comment on function public.resolve_discount_amount(uuid, numeric) is
  'What a discount takes off a tier net. The one implementation — the package card and '
  'send_quotation both call it, so the advertised saving and the charged saving cannot diverge.';

-- ---------------------------------------------------------------------
-- WHY AN OFFER CANNOT BE USED
--
-- Returns null when it can. Every other value is a reason a client can be
-- shown, which is the entire point of it being a function rather than a
-- boolean: "this offer has been fully claimed" and "this offer does not cover
-- the Silver tier" send a client to two different next actions, and a false
-- sends them to neither.
--
-- Order matters. The checks run from the most general fact about the offer to
-- the most specific fact about this attempt, so a client is told the biggest
-- true thing rather than an incidental one.
-- ---------------------------------------------------------------------
create or replace function public.discount_block_reason(
  p_discount_id uuid,
  p_vendor_id   uuid    default null,
  p_package_id  uuid    default null,
  p_tier_id     uuid    default null,
  p_base        numeric default null,
  p_client_id   uuid    default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  d         public.discounts;
  v_left    integer;
  v_mine    integer;
begin
  select * into d from public.discounts where id = p_discount_id;
  if d.id is null then return 'not_found'; end if;

  if d.deleted_at is not null            then return 'not_found';   end if;
  if d.admin_suspended_at is not null    then return 'suspended';   end if;
  if not d.is_active                     then return 'paused';      end if;
  if d.starts_at > now()                 then return 'not_started'; end if;
  if d.ends_at   < now()                 then return 'expired';     end if;

  -- A code under a campaign that is off is off. Reported as the campaign's
  -- state rather than the code's, because that is the thing a vendor has to
  -- fix and the thing support has to explain.
  if d.promotion_id is not null and not public.promotion_is_live(d.promotion_id) then
    return 'campaign_inactive';
  end if;

  -- A platform-wide discount (`vendor_id is null`) is not tied to a vendor and
  -- skips both of the next two checks.
  if d.vendor_id is not null then
    if not public.vendor_is_public(d.vendor_id) then return 'vendor_unavailable'; end if;
    if p_vendor_id is not null and d.vendor_id <> p_vendor_id then return 'wrong_vendor'; end if;
  end if;

  if p_package_id is not null
     and not public.offer_targets_package(null, d.id, p_package_id, p_tier_id) then
    -- Distinguished so the client portal can say "this code is for the Gold
    -- tier" rather than "this code is not valid", which is what sends a client
    -- who is holding a perfectly good code to support.
    return case when public.offer_targets_package(null, d.id, p_package_id, null)
                then 'wrong_tier' else 'wrong_package' end;
  end if;

  -- Against the pre-discount subtotal: `min_amount` has always meant "minimum
  -- booking amount", and testing it against the discounted figure would let a
  -- discount disqualify itself.
  if d.min_amount is not null and coalesce(p_base, 0) < d.min_amount then
    return 'below_minimum';
  end if;

  v_left := public.discount_remaining_uses(d.id);
  if v_left is not null and v_left <= 0 then return 'exhausted'; end if;

  if d.max_per_client is not null and p_client_id is not null then
    v_mine := public.discount_client_uses(d.id, p_client_id);
    if v_mine >= d.max_per_client then return 'client_limit_reached'; end if;
  end if;

  return null;
end;$$;

comment on function public.discount_block_reason(uuid, uuid, uuid, uuid, numeric, uuid) is
  'Null when a discount may be used for this vendor/package/tier/amount/client, otherwise the '
  'single most general reason it may not. The client portal turns each value into a sentence.';

-- ---------------------------------------------------------------------
-- THE OFFERS ON A PACKAGE
--
-- What every package card in three apps renders its badge from.
--
-- `p_tier_id` null asks the package-level question, which is what a card asks
-- before a tier is chosen. Passing a tier narrows it to offers that actually
-- move that tier's price — the difference between a badge and a number.
--
-- `p_net` is optional and only affects `discount_amount`: a caller that has
-- already priced the tier (every one of them has — `packagePricing.ts` runs
-- first) gets the exact saving back rather than having to re-derive it from
-- `type` and `value` and risk a different rounding.
--
-- Exhausted and out-of-window offers are NOT returned. This is the display
-- path; `discount_block_reason` is the path that explains a specific attempt.
-- A card that renders a dead offer is a card that quotes a price the checkout
-- will refuse.
-- ---------------------------------------------------------------------
create or replace function public.package_offers(
  p_package_id uuid,
  p_tier_id    uuid    default null,
  p_net        numeric default null)
returns table (
  discount_id      uuid,
  promotion_id     uuid,
  promotion_title  text,
  promotion_public_id text,
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
  scope            text,
  discount_amount  numeric)
language sql stable security definer set search_path = public as $$
  select
    d.id,
    d.promotion_id,
    p.title,
    p.public_id,
    p.banner_url,
    coalesce(d.title, d.code, p.title, 'Special offer'),
    coalesce(d.description, p.description),
    coalesce(d.terms, p.terms),
    -- The gate. One expression, at the one place a code can leave the database.
    case when auth.uid() is null then null else d.code end,
    d.is_automatic,
    d.type::text,
    d.value,
    d.currency,
    d.max_discount_amount,
    d.min_amount,
    d.starts_at,
    d.ends_at,
    public.discount_remaining_uses(d.id),
    -- What the client is told this covers. Derived from the targets rather
    -- than stored, so it cannot go stale when a vendor edits the scope.
    case
      when exists (select 1 from public.offer_targets t
                    where t.discount_id = d.id and t.kind = 'package_tier'
                      and t.package_id = p_package_id)
        then 'tier'
      when exists (select 1 from public.offer_targets t where t.discount_id = d.id)
        then 'package'
      when d.promotion_id is not null
       and exists (select 1 from public.offer_targets t where t.promotion_id = d.promotion_id)
        then 'campaign'
      else 'vendor'
    end,
    public.resolve_discount_amount(d.id, p_net)
  from public.discounts d
  left join public.promotions p on p.id = d.promotion_id
 where public.quote_package_is_public(p_package_id)
   and public.discount_is_live(d.id)
   and coalesce(public.discount_remaining_uses(d.id), 1) > 0
   and public.offer_targets_package(null, d.id, p_package_id, p_tier_id)
   -- A platform-wide discount applies to every package. A vendor's applies to
   -- their own, which `offer_targets_package` cannot check on its own because
   -- a vendor-wide offer has no targets to compare.
   and (d.vendor_id is null
        or d.vendor_id = (select t.vendor_id from public.quote_templates t where t.id = p_package_id))
 order by public.resolve_discount_amount(d.id, coalesce(p_net, 1000000)) desc, d.ends_at;
$$;

comment on function public.package_offers(uuid, uuid, numeric) is
  'Live offers that apply to a published package, with the code redacted for signed-out callers. '
  'The one read behind every offer badge in the client portal, the console and the marketing site.';

-- ---------------------------------------------------------------------
-- THE OFFERS A VENDOR IS RUNNING
--
-- The vendor profile's "Current offers" strip, and the console's moderation
-- list for one vendor. Grouped by campaign rather than by code, because that
-- is how a vendor thinks about it and how a client reads it: one banner, the
-- packages it covers, and what it saves.
--
-- `package_ids` comes back as an array rather than as a join, so the caller
-- can highlight the covered packages in a list it already has without a second
-- round trip. Empty array = the offer covers everything this vendor sells.
-- ---------------------------------------------------------------------
create or replace function public.vendor_offers(p_vendor_id uuid)
returns table (
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
  package_ids      uuid[],
  package_names    text[])
language sql stable security definer set search_path = public as $$
  with live as (
    select d.*, p.title as promo_title, p.banner_url as promo_banner,
           p.description as promo_description, p.terms as promo_terms
      from public.discounts d
      left join public.promotions p on p.id = d.promotion_id
     where d.vendor_id = p_vendor_id
       and public.discount_is_live(d.id)
       and coalesce(public.discount_remaining_uses(d.id), 1) > 0
  ),
  covered as (
    select l.id as discount_id, t.id as package_id, t.name as package_name
      from live l
      join public.quote_templates t
        on t.vendor_id = p_vendor_id
       and public.quote_package_is_public(t.id)
       and public.offer_targets_package(null, l.id, t.id, null)
  )
  select
    l.id,
    l.promotion_id,
    l.promo_title,
    l.promo_banner,
    coalesce(l.title, l.code, l.promo_title, 'Special offer'),
    coalesce(l.description, l.promo_description),
    coalesce(l.terms, l.promo_terms),
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
    coalesce((select array_agg(c.package_id order by c.package_name) from covered c
               where c.discount_id = l.id), '{}'::uuid[]),
    coalesce((select array_agg(c.package_name order by c.package_name) from covered c
               where c.discount_id = l.id), '{}'::text[])
  from live l
 where public.vendor_is_public(p_vendor_id)
 order by l.ends_at;
$$;

-- ---------------------------------------------------------------------
-- THE PUBLIC OFFERS DIRECTORY
--
-- One page listing every live offer on the platform, filterable the way the
-- vendor directory already is. This is the acquisition surface: a page of real
-- savings with real deadlines is a page people arrive on from search and share
-- with each other, which is worth more to this platform than another static
-- marketing page.
--
-- Returns one row per DISCOUNT, not per package. A campaign covering four
-- packages is one card with four packages named on it; four cards for one sale
-- is a directory that looks like spam the first week a vendor uses it properly.
--
-- Ordered by the vendor's own weighting first — the same `is_featured` /
-- `search_weight` the vendor directory uses — then by urgency, so the page
-- leads with credible vendors and, among those, with what is about to end.
-- Featured campaigns come first of all: that is the operator's placement, and a
-- placement that does not place anything is not one.
-- ---------------------------------------------------------------------
create or replace function public.search_public_offers(
  p_search      text default null,
  p_category_id uuid default null,
  p_region_id   uuid default null,
  p_limit       integer default 24,
  p_offset      integer default 0)
returns table (
  discount_id       uuid,
  promotion_id      uuid,
  promotion_public_id text,
  vendor_id         uuid,
  vendor_name       text,
  vendor_slug       text,
  vendor_image_url  text,
  vendor_rating     numeric,
  vendor_review_count integer,
  category_id       uuid,
  category_name     text,
  title             text,
  description       text,
  banner_url        text,
  is_automatic      boolean,
  type              text,
  value             numeric,
  currency          text,
  max_discount_amount numeric,
  min_amount        numeric,
  starts_at         timestamptz,
  ends_at           timestamptz,
  remaining_uses    integer,
  is_featured       boolean,
  package_count     integer,
  package_names     text[],
  from_price        numeric,
  total_count       bigint)
language sql stable security definer set search_path = public as $$
  with live as (
    select d.id, d.vendor_id, d.promotion_id, d.type, d.value, d.currency,
           d.max_discount_amount, d.min_amount, d.starts_at, d.ends_at, d.is_automatic,
           coalesce(d.title, d.code, p.title, 'Special offer') as title,
           coalesce(d.description, p.description)              as description,
           p.banner_url, p.public_id as promotion_public_id,
           (p.featured_at is not null)                         as is_featured
      from public.discounts d
      left join public.promotions p on p.id = d.promotion_id
     where d.vendor_id is not null
       and public.discount_is_live(d.id)
       and coalesce(public.discount_remaining_uses(d.id), 1) > 0
  ),
  -- An offer with no published package behind it has nothing a visitor can
  -- click through to, and a directory of unreachable offers is worse than a
  -- shorter directory. `from_price` is the cheapest priced tier the offer
  -- touches, which is what makes the card comparable to a vendor card.
  covered as (
    select l.id as discount_id,
           t.id as package_id,
           t.name as package_name,
           (select min(ti.total) from (
              select sum(i.quantity * i.unit_price)
                     * (1 - coalesce(x.discount_rate, 0) / 100.0) as total
                from public.quote_template_tiers x
                join public.quote_template_items i on i.tier_id = x.id and not i.is_optional
               where x.template_id = t.id
               group by x.id, x.discount_rate) ti) as tier_from
      from live l
      join public.quote_templates t
        on t.vendor_id = l.vendor_id
       and public.quote_package_is_public(t.id)
       and public.offer_targets_package(null, l.id, t.id, null)
  ),
  matched as (
    select l.*, v.business_name, v.slug, v.profile_image_url, v.avg_rating, v.review_count,
           v.is_featured as vendor_featured, v.search_weight,
           v.primary_category_id, c.name as category_name,
           (select count(*)::int from covered x where x.discount_id = l.id)          as package_count,
           (select array_agg(x.package_name order by x.package_name)
              from covered x where x.discount_id = l.id)                             as package_names,
           -- Rounded here rather than at the caller: this is a price on a card,
           -- and `sum(qty × price) × (1 - rate/100)` is a numeric with a long
           -- tail that three apps would each have to trim identically.
           (select round(min(x.tier_from), 2) from covered x where x.discount_id = l.id) as from_price
      from live l
      join public.vendors v on v.id = l.vendor_id
      left join public.service_categories c on c.id = v.primary_category_id
     where exists (select 1 from covered x where x.discount_id = l.id)
       and (p_category_id is null
            or v.primary_category_id = p_category_id
            or exists (select 1 from public.vendor_services s
                        where s.vendor_id = v.id and s.category_id = p_category_id
                          and s.is_active and s.deleted_at is null))
       and (p_region_id is null
            or exists (select 1 from public.vendor_service_regions r
                        where r.vendor_id = v.id and r.region_id = p_region_id))
       and (nullif(btrim(coalesce(p_search, '')), '') is null
            or v.business_name ilike '%' || btrim(p_search) || '%'
            or l.title         ilike '%' || btrim(p_search) || '%'
            or coalesce(l.description, '') ilike '%' || btrim(p_search) || '%')
  )
  select m.id, m.promotion_id, m.promotion_public_id,
         m.vendor_id, m.business_name, m.slug, m.profile_image_url,
         m.avg_rating, m.review_count,
         m.primary_category_id, m.category_name,
         m.title, m.description, m.banner_url, m.is_automatic,
         m.type::text, m.value, m.currency, m.max_discount_amount, m.min_amount,
         m.starts_at, m.ends_at, public.discount_remaining_uses(m.id),
         m.is_featured, m.package_count, m.package_names, m.from_price,
         count(*) over () as total_count
    from matched m
   order by m.is_featured desc, m.vendor_featured desc, m.search_weight desc,
            m.ends_at asc, m.business_name asc
   limit  greatest(1, least(coalesce(p_limit, 24), 60))
  offset greatest(0, coalesce(p_offset, 0));
$$;

comment on function public.search_public_offers(text, uuid, uuid, integer, integer) is
  'The public offers directory. One row per discount, only where a published package stands '
  'behind it, with no code in the result set at all — this one is indexable.';

-- ---------------------------------------------------------------------
-- CAN I USE THIS CODE?
--
-- What the client portal calls when someone types a code into the request
-- form, and what the checkout calls before it shows a reduced figure.
--
-- Takes the code rather than the id, because a code is what a client has.
-- Matched case-insensitively: codes are printed on posters and typed from
-- memory, and `EARLY-BIRD` failing because it was stored `Early-Bird` is a
-- support ticket for nothing. `ux_discounts_code` is case-sensitive, so this
-- can in principle match two rows; `limit 1` on the newest is the honest
-- resolution and the vendor portal refuses the collision at authoring time.
--
-- Returns a row either way. A caller needs the reason as much as the amount:
-- an invalid code has to say WHY on the field, and returning no rows makes
-- "expired" and "never existed" the same thing to the UI.
-- ---------------------------------------------------------------------
create or replace function public.preview_discount(
  p_code       text,
  p_vendor_id  uuid    default null,
  p_package_id uuid    default null,
  p_tier_id    uuid    default null,
  p_base       numeric default null,
  p_net        numeric default null)
returns table (
  discount_id     uuid,
  is_valid        boolean,
  reason          text,
  title           text,
  description     text,
  terms           text,
  type            text,
  value           numeric,
  currency        text,
  min_amount      numeric,
  max_discount_amount numeric,
  ends_at         timestamptz,
  remaining_uses  integer,
  discount_amount numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  d        public.discounts;
  v_reason text;
  v_net    numeric := coalesce(p_net, p_base);
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  if nullif(btrim(coalesce(p_code, '')), '') is null then
    return query select null::uuid, false, 'not_found', null::text, null::text, null::text,
                        null::text, null::numeric, null::text, null::numeric, null::numeric,
                        null::timestamptz, null::integer, 0::numeric;
    return;
  end if;

  select * into d from public.discounts
   where upper(code) = upper(btrim(p_code)) and deleted_at is null
   order by created_at desc
   limit 1;

  if d.id is null then
    return query select null::uuid, false, 'not_found', null::text, null::text, null::text,
                        null::text, null::numeric, null::text, null::numeric, null::numeric,
                        null::timestamptz, null::integer, 0::numeric;
    return;
  end if;

  v_reason := public.discount_block_reason(
    d.id, p_vendor_id, p_package_id, p_tier_id, p_base, auth.uid());

  return query select
    d.id,
    v_reason is null,
    v_reason,
    coalesce(d.title, d.code),
    d.description,
    d.terms,
    d.type::text,
    d.value,
    d.currency,
    d.min_amount,
    d.max_discount_amount,
    d.ends_at,
    public.discount_remaining_uses(d.id),
    -- Zero when it cannot be used, so a caller that renders the amount without
    -- reading `is_valid` shows no saving rather than a saving it will not get.
    case when v_reason is null then public.resolve_discount_amount(d.id, v_net) else 0 end;
end;$$;

comment on function public.preview_discount(text, uuid, uuid, uuid, numeric, numeric) is
  'Validates a typed code against a vendor, package, tier and amount. Always returns exactly one '
  'row: is_valid with the saving, or false with the reason to put on the field.';

-- ---------------------------------------------------------------------
-- THE BEST AUTOMATIC OFFER FOR A TIER
--
-- Automatic offers need no code, so nothing in the UI can select one — the
-- server has to. When two apply, the client gets the larger: a platform that
-- silently picks the cheaper of two offers it is itself advertising has a
-- credibility problem no support reply fixes.
--
-- Ties break on the earlier deadline, so the one about to expire is the one
-- spent. Returns null when nothing applies, which is the common case.
-- ---------------------------------------------------------------------
create or replace function public.best_automatic_discount(
  p_package_id uuid,
  p_tier_id    uuid,
  p_net        numeric,
  p_base       numeric default null,
  p_client_id  uuid    default null)
returns uuid language sql stable security definer set search_path = public as $$
  select d.id
    from public.discounts d
   where d.is_automatic
     and public.discount_is_live(d.id)
     and public.discount_block_reason(
           d.id,
           (select t.vendor_id from public.quote_templates t where t.id = p_package_id),
           p_package_id, p_tier_id, coalesce(p_base, p_net), p_client_id) is null
   order by public.resolve_discount_amount(d.id, p_net) desc, d.ends_at asc
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- GRANTS
--
-- The three display functions are granted to `anon`: they are the signed-out
-- path, and they redact the code themselves rather than relying on the caller
-- to. `preview_discount` is not — it resolves a code to an offer, which is the
-- one thing a signed-out caller must not be able to do, and it refuses on its
-- own terms as well as being ungranted.
-- ---------------------------------------------------------------------
grant execute on function
  public.discount_remaining_uses(uuid),
  public.resolve_discount_amount(uuid, numeric),
  public.package_offers(uuid, uuid, numeric),
  public.vendor_offers(uuid),
  public.search_public_offers(text, uuid, uuid, integer, integer)
to anon, authenticated;

grant execute on function
  public.discount_client_uses(uuid, uuid),
  public.discount_block_reason(uuid, uuid, uuid, uuid, numeric, uuid),
  public.preview_discount(text, uuid, uuid, uuid, numeric, numeric),
  public.best_automatic_discount(uuid, uuid, numeric, numeric, uuid)
to authenticated;
