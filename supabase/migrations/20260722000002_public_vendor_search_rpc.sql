-- =====================================================================
-- Sinnapi — 0722 Public vendor search
-- Server-side search / facet / sort / paginate for the public /vendors grid,
-- replacing the "fetch 24 rows, filter them in JavaScript" path the site used
-- before. Three anonymous-callable reads:
--
--   * _vendors_public_match      -> internal: the match predicate, once
--   * search_vendors_public      -> one page of cards + exact total_count
--   * count_vendor_facets_public -> per-category / per-region result counts
--
-- WHY THIS EXISTS
-- The old client-side approach could not be correct: category and region live
-- in join tables (vendor_services, vendor_service_regions) that a card row
-- never carries, so those two facets silently did nothing; and price/rating
-- were applied to whichever 24 rows happened to come back first, so narrowing
-- searched a slice rather than the marketplace. Everything now resolves in one
-- indexed query against the whole table.
--
-- THE SHARED PREDICATE
-- All three functions match rows through `_vendors_public_match`. Facet counts
-- must honour every filter EXCEPT the facet being counted (otherwise selecting
-- "Photographer" would report every other category as 0), which is expressed by
-- passing null for that one argument — the same "null means no constraint"
-- convention as `count_vendors_admin_by_status` in 0717. One predicate, three
-- callers, so the counts can never disagree with the grid they label.
--
-- SECURITY
-- SECURITY DEFINER, so each re-states the public visibility predicate that RLS
-- enforces, exactly as 0722_public_home_rpc does:
--
--   vendors_public_read : status='active' and visibility='public' and deleted_at is null
--
-- Keep in lockstep with 0011_rls.sql. Free text reaches the query only as a
-- bound parameter ($1) — never interpolated — and the sort key is whitelisted
-- against a fixed list before it is formatted into the ORDER BY, so neither is
-- an injection surface. `p_limit` is clamped so an anonymous caller cannot ask
-- for an unbounded scan.
--
-- Contacts (email/phone) are deliberately absent from the projection, per the
-- public-discovery rules.
-- =====================================================================

-- Re-runnable: drop by exact signature before recreating, so a changed
-- projection never leaves a stale overload behind. Dependency order matters —
-- the wrappers reference the helper.
drop function if exists public.search_vendors_public(text, text, text, numeric, numeric, numeric, text, boolean, integer, integer);
drop function if exists public.count_vendor_facets_public(text, text, text, numeric, numeric, numeric);
drop function if exists public._vendors_public_match(text, text, text, numeric, numeric, numeric);

-- ---------------------------------------------------------------------
-- _vendors_public_match  (internal)
-- The ids of every publicly-visible vendor matching the supplied filters.
-- Null/empty arguments mean "no constraint", so the unfiltered grid and a
-- fully-cleared filter set resolve to the same query.
--
-- Text matching runs the maintained `search_tsv` as a *prefix* query, plus a
-- trigram ILIKE on name and city. The two cover different things: the tsvector
-- reaches the biography (so "phot" finds a photographer whose name says
-- "Studio"), while the ILIKE catches infixes a prefix query can't ("moments"
-- inside "Mbale Moments" is a whole token, but "bale" is not). Both are
-- index-assisted — GIN on search_tsv, GIN/trgm on the two text columns.
--
-- Category matches the vendor's primary category OR any active service it
-- sells under — a caterer who also lists a decorating service is findable
-- under both, which is what a visitor filtering by "decorator" expects.
--
-- Price: a chosen band excludes unpriced vendors (`starting_price is null`),
-- since "under UGX 1M" cannot honestly include a vendor with no price. A null
-- p_price_max means the band is open-ended ("UGX 8M +").
-- ---------------------------------------------------------------------
create function public._vendors_public_match(
  p_q          text    default null,
  p_category   text    default null,
  p_region     text    default null,
  p_price_min  numeric default null,
  p_price_max  numeric default null,
  p_min_rating numeric default null)
returns table (id uuid)
language sql stable security definer set search_path = public as $$
  with args as (
    select
      nullif(btrim(coalesce(p_q, '')), '')        as q,
      nullif(btrim(coalesce(p_category, '')), '') as category,
      nullif(btrim(coalesce(p_region, '')), '')   as region
  ), tsq as (
    -- Every token becomes a prefix term ANDed together: "kampala phot" ->
    -- 'kampala:* & phot:*'. The grid re-queries as the visitor types, so a
    -- half-typed word has to match — `websearch_to_tsquery` only matches whole
    -- words, which made the results vanish mid-word and reappear at the end.
    --
    -- Input is stripped to alphanumerics first, so nothing a visitor types can
    -- reach `to_tsquery` as syntax (it throws on operators like `&` or `!`,
    -- which would otherwise turn a stray character in a search box into an
    -- error page).
    select a.q,
           nullif((
             select string_agg(token || ':*', ' & ')
             from unnest(
               string_to_array(btrim(regexp_replace(lower(a.q), '[^a-z0-9]+', ' ', 'g')), ' ')
             ) as token
             where token <> ''
           ), '') as prefix_query
    from args a
  )
  select v.id
  from public.vendors v, args a, tsq t
  where v.status = 'active'
    and v.visibility = 'public'
    and v.deleted_at is null
    and (a.q is null
         or (t.prefix_query is not null and v.search_tsv @@ to_tsquery('simple', t.prefix_query))
         or v.business_name ilike '%' || a.q || '%'
         or v.base_city ilike '%' || a.q || '%')
    and (a.category is null or exists (
      select 1
      from public.service_categories sc
      where sc.key = a.category
        and sc.is_active
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
    ))
    and (a.region is null or exists (
      select 1
      from public.vendor_service_regions vsr
      join public.service_regions sr on sr.id = vsr.region_id
      where vsr.vendor_id = v.id
        and sr.key = a.region
        and sr.is_active
    ))
    and (p_price_min  is null or (v.starting_price is not null and v.starting_price >= p_price_min))
    and (p_price_max  is null or (v.starting_price is not null and v.starting_price <= p_price_max))
    and (p_min_rating is null or v.avg_rating >= p_min_rating);
$$;

-- Internal helper: reachable only from the two wrappers below, which run as
-- the function owner. No client ever calls it directly.
revoke execute on function
  public._vendors_public_match(text, text, text, numeric, numeric, numeric)
from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- search_vendors_public
-- One page of vendor cards for the public grid.
--
-- `categories` is the vendor's primary category plus every active service
-- category it sells under, de-duplicated and alphabetised — the same shape
-- `list_featured_vendors_public` returns, so one VendorCard renders both the
-- home rail and this grid. Empty array (never null) when a vendor has no
-- category yet.
--
-- `total_count` is a window count over the *filtered* set before limit/offset,
-- so "N of M vendors" is the real total rather than the length of the page the
-- caller happens to be holding.
--
-- `p_exclude_featured` drops paid placements from the grid on the default view,
-- where they already occupy the spotlight rail above it (fed by
-- `list_featured_vendors_public`). As soon as a visitor searches or filters the
-- caller passes false, so every match — featured or not — flows into the grid
-- and nothing relevant is hidden behind a rail that is no longer shown.
--
-- Pagination is limit/offset rather than keyset: the sort key is user-chosen
-- and non-unique (rating, price), which keyset cannot page over without
-- carrying a composite cursor, and offset also gives us the window count above
-- for free. Every ordering ends in `business_name, id` so equal rows have a
-- total order and a row can never appear on two pages or be skipped between
-- them.
-- ---------------------------------------------------------------------
create function public.search_vendors_public(
  p_q                text    default null,
  p_category         text    default null,
  p_region           text    default null,
  p_price_min        numeric default null,
  p_price_max        numeric default null,
  p_min_rating       numeric default null,
  p_sort             text    default 'recommended',
  p_exclude_featured boolean default false,
  p_limit            integer default 24,
  p_offset           integer default 0)
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
  categories              text[],
  total_count             bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_order text;
begin
  -- Whitelisted: `v_order` is formatted into the statement below, so it must
  -- never be built from caller input. Anything unrecognised falls back to the
  -- marketplace's default ranking.
  v_order := case p_sort
    when 'rating'     then 'v.avg_rating desc, v.review_count desc'
    when 'reviews'    then 'v.review_count desc, v.avg_rating desc'
    when 'price_asc'  then 'v.starting_price asc nulls last'
    when 'price_desc' then 'v.starting_price desc nulls last'
    when 'newest'     then 'v.created_at desc'
    else 'v.is_featured desc, v.search_weight desc, v.avg_rating desc, v.review_count desc'
  end;

  -- The page is cut first, then decorated. Joining categories before the LIMIT
  -- would run the lateral once per *matching* vendor — the whole marketplace on
  -- an unfiltered first page — to build arrays for rows that are about to be
  -- discarded. Behind the CTE it runs once per row actually returned.
  --
  -- The CTE is re-aliased to `v` so one `v_order` string serves both ORDER BYs;
  -- the outer one is not redundant, because a CTE's ordering is not preserved
  -- through a join.
  return query execute format($q$
    with page as (
      select
        v.id, v.slug, v.business_name, v.base_city, v.biography,
        v.primary_image_url, v.profile_image_url,
        v.starting_price, v.starting_price_currency,
        v.avg_rating, v.review_count, v.is_featured,
        v.primary_category_id, v.search_weight, v.created_at,
        count(*) over() as total_count
      from public._vendors_public_match($1, $2, $3, $4, $5, $6) m
      join public.vendors v on v.id = m.id
      where not ($7 and v.is_featured)
      order by %1$s, v.business_name asc, v.id asc
      limit $8 offset $9
    )
    select
      v.id, v.slug, v.business_name, v.base_city, v.biography,
      v.primary_image_url, v.profile_image_url,
      v.starting_price, v.starting_price_currency,
      v.avg_rating, v.review_count, v.is_featured,
      coalesce(cat.names, array[]::text[]) as categories,
      v.total_count
    from page v
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
    order by %1$s, v.business_name asc, v.id asc
  $q$, v_order)
  using p_q, p_category, p_region, p_price_min, p_price_max, p_min_rating,
        coalesce(p_exclude_featured, false),
        greatest(1, least(coalesce(p_limit, 24), 48)),
        greatest(0, coalesce(p_offset, 0));
end;
$$;

-- ---------------------------------------------------------------------
-- count_vendor_facets_public
-- How many vendors each category / region option would yield, so the filter
-- controls can label themselves ("Photographer (24)") and disable the options
-- that lead nowhere — the difference between a filter bar a visitor explores
-- and one that keeps dead-ending them in an empty grid.
--
-- Each facet honours every filter except its own selection, so the counts
-- answer "what would I get if I switched to this option", not "what am I
-- already looking at". Options with no matches are simply absent; the caller
-- defaults those to zero.
--
-- Featured vendors are always counted here, even when the grid excludes them,
-- because the moment a visitor picks a facet the grid stops excluding them.
-- ---------------------------------------------------------------------
create function public.count_vendor_facets_public(
  p_q          text    default null,
  p_category   text    default null,
  p_region     text    default null,
  p_price_min  numeric default null,
  p_price_max  numeric default null,
  p_min_rating numeric default null)
returns table (facet text, key text, count bigint)
language sql stable security definer set search_path = public as $$
  -- Categories: own selection released, every other filter still applied.
  select 'category'::text, sc.key, count(distinct m.id)
  from public._vendors_public_match(p_q, null, p_region, p_price_min, p_price_max, p_min_rating) m
  join public.vendors v on v.id = m.id
  join public.service_categories sc
    on sc.is_active
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
  group by sc.key

  union all

  -- Regions: own selection released, every other filter still applied.
  select 'region'::text, sr.key, count(distinct m.id)
  from public._vendors_public_match(p_q, p_category, null, p_price_min, p_price_max, p_min_rating) m
  join public.vendor_service_regions vsr on vsr.vendor_id = m.id
  join public.service_regions sr on sr.id = vsr.region_id and sr.is_active
  group by sr.key;
$$;

-- Public site is anonymous: like the two 0722 home reads, these are reachable
-- by `anon`. Safe only because the shared predicate re-states the public
-- visibility rules above and the projection exposes no contact columns.
grant execute on function
  public.search_vendors_public(text, text, text, numeric, numeric, numeric, text, boolean, integer, integer),
  public.count_vendor_facets_public(text, text, text, numeric, numeric, numeric)
to anon, authenticated;
