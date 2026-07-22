-- =====================================================================
-- Sinnapi — 0722 Public home-page reads
-- Two anonymous-callable reads behind the marketing home page, replacing the
-- ad-hoc PostgREST table selects the site used before:
--
--   * list_featured_vendors_public -> the featured spotlight rail
--   * list_public_events           -> the "Events & inspiration" feed
--
-- WHY RPCs AND NOT TABLE SELECTS
-- The featured rail wants a category chip per vendor, which spans three tables
-- (vendors -> vendor_services -> service_categories). Over PostgREST that is
-- either an embedded select the anon client has to shape correctly on every
-- call site, or N+1 round trips. As a function it is one round trip with a
-- fixed, reviewed projection, and the public column list lives in exactly one
-- place — so vendor contact fields cannot leak by someone widening a `select`.
--
-- SECURITY
-- Both are SECURITY DEFINER, which bypasses RLS — so each one re-states the
-- public visibility predicate that the corresponding RLS policy enforces:
--
--   vendors_public_read : status='active' and visibility='public' and deleted_at is null
--   events_public_read  : status='published' and is_public and deleted_at is null
--
-- Keep those two in lockstep with 0011_rls.sql. Neither function takes a
-- free-text or identifier parameter, so there is no injection surface; `p_limit`
-- is clamped so an anonymous caller cannot ask for an unbounded scan.
--
-- Contacts (email/phone) are deliberately absent from both projections, per the
-- public-discovery rules.
-- =====================================================================

-- Re-runnable: drop by exact signature before recreating, so a changed
-- projection never leaves a stale overload behind.
drop function if exists public.list_featured_vendors_public(integer);
drop function if exists public.list_public_events(integer);

-- ---------------------------------------------------------------------
-- list_featured_vendors_public
-- Every currently-featured (paid placement) vendor that is publicly visible,
-- ordered the way the marketplace ranks them: editorial weight first, then
-- rating, then review volume, with business_name as a stable tie-break so
-- pagination and ISR snapshots don't reshuffle equal rows.
--
-- `categories` is the vendor's primary category plus every active service
-- category it sells under, de-duplicated and alphabetised — it powers the chip
-- row on the card. Empty array (never null) when a vendor has no category yet,
-- so the client can map over it unconditionally.
--
-- The rail scrolls, so the caller can safely ask for far more than fits on
-- screen; 60 is the hard ceiling.
-- ---------------------------------------------------------------------
create function public.list_featured_vendors_public(p_limit integer default 24)
returns table (
  id                      uuid,
  slug                    text,
  business_name           text,
  base_city               text,
  biography               text,
  primary_image_url       text,
  profile_image_url       text,
  starting_price          numeric,
  starting_price_currency text,
  avg_rating              numeric,
  review_count            integer,
  is_featured             boolean,
  categories              text[])
language sql stable security definer set search_path = public as $$
  select
    v.id,
    v.slug,
    v.business_name,
    v.base_city,
    v.biography,
    v.primary_image_url,
    v.profile_image_url,
    v.starting_price,
    v.starting_price_currency,
    v.avg_rating,
    v.review_count,
    v.is_featured,
    coalesce(cat.names, array[]::text[]) as categories
  from public.vendors v
  left join lateral (
    select array_agg(c.name order by c.name) as names
    from (
      select distinct sc.name
      from public.service_categories sc
      where sc.is_active
        and (
          sc.id = v.primary_category_id
          or exists (
            select 1
            from public.vendor_services vs
            where vs.vendor_id = v.id
              and vs.category_id = sc.id
              and vs.is_active
              and vs.deleted_at is null
          )
        )
    ) c
  ) cat on true
  where v.status = 'active'
    and v.visibility = 'public'
    and v.deleted_at is null
    and v.is_featured
  order by v.search_weight desc, v.avg_rating desc, v.review_count desc, v.business_name asc
  limit greatest(1, least(coalesce(p_limit, 24), 60));
$$;

-- ---------------------------------------------------------------------
-- list_public_events
-- The published, public event feed. Ordered upcoming-soonest-first, then the
-- most recent past events, then undated ones — an inspiration feed leads with
-- what a visitor can still act on, which a plain `event_date desc` gets exactly
-- backwards once the calendar rolls past the newest entry.
--
-- `source` is cast to text so the client keeps a plain string union rather than
-- depending on the event_source enum's wire form.
-- ---------------------------------------------------------------------
create function public.list_public_events(p_limit integer default 6)
returns table (
  id              uuid,
  title           text,
  description     text,
  event_type      text,
  event_date      date,
  location        text,
  budget_min      numeric,
  budget_max      numeric,
  currency        text,
  cover_image_url text,
  source          text)
language sql stable security definer set search_path = public as $$
  select
    e.id,
    e.title,
    e.description,
    e.event_type,
    e.event_date,
    e.location,
    e.budget_min,
    e.budget_max,
    e.currency,
    e.cover_image_url,
    e.source::text
  from public.events e
  where e.status = 'published'
    and e.is_public
    and e.deleted_at is null
  order by
    (e.event_date is not null and e.event_date >= current_date) desc,
    case when e.event_date >= current_date then e.event_date end asc nulls last,
    e.event_date desc nulls last,
    e.created_at desc
  limit greatest(1, least(coalesce(p_limit, 6), 60));
$$;

-- Public site is anonymous: unlike every other RPC in this schema these two are
-- reachable by `anon`. That is safe only because both re-state the public
-- visibility predicate above and expose no contact columns.
grant execute on function
  public.list_featured_vendors_public(integer),
  public.list_public_events(integer)
to anon, authenticated;
