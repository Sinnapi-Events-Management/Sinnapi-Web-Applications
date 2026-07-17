-- =====================================================================
-- Sinnapi — 0717 Vendor admin search + filtering
-- Server-side search / filter / sort / paginate for the admin Vendors list.
-- Two SECURITY DEFINER reads, both gated on `vendor.manage` (the same
-- permission the `vendors_owner_read` RLS policy grants admins), following
-- the 0014 RPC convention: fixed search_path + internal authz re-check.
--
--   * search_vendors_admin        -> one page of rows + exact total_count
--   * count_vendors_admin_by_status -> per-status counts for the tab badges
--
-- Text matching combines the existing `search_tsv` (full-word, ranked) with
-- trigram ILIKE so partial / mid-word fragments ("phot" -> "Photography")
-- also match. The trigram GIN indexes below back the ILIKE path.
-- =====================================================================

-- pg_trgm is already installed (see 0001); these indexes make the ILIKE
-- fallback index-assisted instead of a sequential scan.
create index if not exists ix_vendors_business_trgm
  on public.vendors using gin (business_name gin_trgm_ops) where deleted_at is null;
create index if not exists ix_vendors_city_trgm
  on public.vendors using gin (base_city gin_trgm_ops) where deleted_at is null;

-- ---------------------------------------------------------------------
-- search_vendors_admin
-- Null/empty parameters mean "no constraint", so the unfiltered list and a
-- fully-cleared filter set resolve to the same query. `total_count` is a
-- window count over the filtered set (before limit/offset) so the caller can
-- drive server-side pagination from a single round trip.
-- ---------------------------------------------------------------------
create or replace function public.search_vendors_admin(
  p_search      text    default null,
  p_status      text    default null,
  p_visibility  text    default null,
  p_min_rating  numeric default null,
  p_featured    boolean default null,
  p_sort_field  text    default 'created_at',
  p_sort_dir    text    default 'desc',
  p_limit       integer default 25,
  p_offset      integer default 0)
returns table (
  id                uuid,
  business_name     text,
  slug              text,
  status            vendor_status,
  visibility        vendor_visibility,
  avg_rating        numeric,
  review_count      integer,
  profile_image_url text,
  base_city         text,
  created_at        timestamptz,
  total_count       bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('vendor.manage') then perform public._forbidden(); end if;

  -- Whitelist the sort inputs — they are interpolated as identifiers/keywords
  -- into the dynamic query below, so they must never come straight from input.
  v_sort_field := case
    when p_sort_field in ('business_name','avg_rating','review_count','visibility','status','created_at')
      then p_sort_field else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'asc' then 'asc' else 'desc' end;

  return query execute format($q$
    select v.id, v.business_name, v.slug, v.status, v.visibility, v.avg_rating,
           v.review_count, v.profile_image_url, v.base_city, v.created_at,
           count(*) over() as total_count
    from public.vendors v
    where v.deleted_at is null
      and ($1 is null
           or v.search_tsv @@ websearch_to_tsquery('simple', $1)
           or v.business_name ilike '%%' || $1 || '%%'
           or v.base_city ilike '%%' || $1 || '%%')
      and ($2 is null or v.status = $2::vendor_status)
      and ($3 is null or v.visibility = $3::vendor_visibility)
      and ($4 is null or v.avg_rating >= $4)
      and ($5 is null or v.is_featured = $5)
    order by %I %s
    limit $6 offset $7
  $q$, v_sort_field, v_sort_dir)
  using v_search, p_status, p_visibility, p_min_rating, p_featured, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- count_vendors_admin_by_status
-- Row counts grouped by status, honouring every filter EXCEPT status itself
-- (status is what the tabs switch, so each tab's badge must reflect the count
-- it would show once selected). Statuses with no matching rows simply don't
-- appear — the caller defaults those to zero.
-- ---------------------------------------------------------------------
create or replace function public.count_vendors_admin_by_status(
  p_search      text    default null,
  p_visibility  text    default null,
  p_min_rating  numeric default null,
  p_featured    boolean default null)
returns table (status vendor_status, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('vendor.manage') then perform public._forbidden(); end if;

  return query
    select v.status, count(*)
    from public.vendors v
    where v.deleted_at is null
      and (v_search is null
           or v.search_tsv @@ websearch_to_tsquery('simple', v_search)
           or v.business_name ilike '%' || v_search || '%'
           or v.base_city ilike '%' || v_search || '%')
      and (p_visibility is null or v.visibility = p_visibility::vendor_visibility)
      and (p_min_rating is null or v.avg_rating >= p_min_rating)
      and (p_featured is null or v.is_featured = p_featured)
    group by v.status;
end;
$$;

grant execute on function
  public.search_vendors_admin(text, text, text, numeric, boolean, text, text, integer, integer),
  public.count_vendors_admin_by_status(text, text, numeric, boolean)
to authenticated;
