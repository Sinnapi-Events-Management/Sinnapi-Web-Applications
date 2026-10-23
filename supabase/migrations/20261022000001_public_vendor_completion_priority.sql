-- =====================================================================
-- Sinnapi — completed vendor profiles lead public search results
--
-- Public search already restricts results to active, public, non-deleted
-- vendors. `approve_vendor` creates that row at approval time, so `vendors.created_at`
-- records when the vendor was approved. Vendor portal onboarding records profile
-- completion in `onboarding_completed_at`.
--
-- Keep every approved public vendor discoverable, but rank completed profiles
-- first. Within completed profiles, the most recently finished onboarding leads;
-- the approval timestamp is the next tie-break. The visitor's selected sort and
-- the existing deterministic business-name/id tie-break remain in effect after
-- that priority. The projection, filters, limits, grants and RPC signature stay
-- unchanged.
-- =====================================================================

-- Remove the deployed definition before recreating it. Dropping a function
-- clears its ACL, so the public execute grants are restored below.
drop function if exists public.search_vendors_public(
  text, text, text, numeric, numeric, numeric, text, boolean, integer, integer
);

create or replace function public.search_vendors_public(
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
  -- This sort expression is built only from fixed strings. It is formatted
  -- into the query below, so caller input must never be interpolated here.
  v_order := case p_sort
    when 'rating'     then 'v.avg_rating desc, v.review_count desc'
    when 'reviews'    then 'v.review_count desc, v.avg_rating desc'
    when 'price_asc'  then 'v.starting_price asc nulls last'
    when 'price_desc' then 'v.starting_price desc nulls last'
    when 'newest'     then 'v.created_at desc'
    else 'v.is_featured desc, v.search_weight desc, v.avg_rating desc, v.review_count desc'
  end;

  return query execute format($q$
    with page as (
      select
        v.id, v.slug, v.business_name, v.base_city, v.biography,
        v.primary_image_url, v.profile_image_url,
        v.starting_price, v.starting_price_currency,
        v.avg_rating, v.review_count, v.is_featured,
        v.primary_category_id, v.search_weight, v.created_at,
        v.onboarding_completed_at,
        count(*) over() as total_count
      from public._vendors_public_match($1, $2, $3, $4, $5, $6) m
      join public.vendors v on v.id = m.id
      where not ($7 and v.is_featured)
      order by
        v.onboarding_completed_at desc nulls last,
        v.created_at desc,
        %1$s,
        v.business_name asc,
        v.id asc
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
    order by
      v.onboarding_completed_at desc nulls last,
      v.created_at desc,
      %1$s,
      v.business_name asc,
      v.id asc
  $q$, v_order)
  using p_q, p_category, p_region, p_price_min, p_price_max, p_min_rating,
        coalesce(p_exclude_featured, false),
        greatest(1, least(coalesce(p_limit, 24), 48)),
        greatest(0, coalesce(p_offset, 0));
end;
$$;

comment on function public.search_vendors_public(text, text, text, numeric, numeric, numeric, text, boolean, integer, integer) is
  'Searches active public vendors. Profiles with completed onboarding rank first, newest completion and approval first, then the selected visitor sort.';

grant execute on function public.search_vendors_public(
  text, text, text, numeric, numeric, numeric, text, boolean, integer, integer
) to anon, authenticated;
