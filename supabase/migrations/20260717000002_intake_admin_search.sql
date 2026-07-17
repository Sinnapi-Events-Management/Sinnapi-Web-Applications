-- =====================================================================
-- Sinnapi — 0717b Intake (vendor applications) admin search + filtering
-- Server-side search / status filter / sort / paginate for the admin
-- Applications queue, mirroring `search_vendors_admin` (0717). Two SECURITY
-- DEFINER reads gated on `vendor.review` — the same permission the
-- `intake_read` RLS policy requires — with a fixed search_path.
--
--   * search_intake_admin          -> one page of rows + exact total_count
--   * count_intake_admin_by_status -> per-status counts for the tab badges
--
-- `vendor_application_intake` has no tsvector column, so text matching is
-- trigram ILIKE across business name, owner name, owner email and city. The
-- GIN indexes below make that index-assisted rather than a sequential scan.
-- =====================================================================

create index if not exists ix_intake_business_trgm
  on public.vendor_application_intake using gin (business_name gin_trgm_ops);
create index if not exists ix_intake_owner_name_trgm
  on public.vendor_application_intake using gin (owner_full_name gin_trgm_ops);
create index if not exists ix_intake_owner_email_trgm
  on public.vendor_application_intake using gin ((owner_email::text) gin_trgm_ops);
create index if not exists ix_intake_city_trgm
  on public.vendor_application_intake using gin (base_city gin_trgm_ops);

-- ---------------------------------------------------------------------
-- search_intake_admin
-- Null/empty parameters mean "no constraint". `total_count` is a window count
-- over the filtered set (before limit/offset) so a page + its grand total come
-- back in one round trip.
-- ---------------------------------------------------------------------
create or replace function public.search_intake_admin(
  p_search     text    default null,
  p_status     text    default null,
  p_sort_field text    default 'created_at',
  p_sort_dir   text    default 'desc',
  p_limit      integer default 25,
  p_offset     integer default 0)
returns table (
  id              uuid,
  business_name   text,
  status          text,
  owner_full_name text,
  owner_email     text,
  created_at      timestamptz,
  total_count     bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('vendor.review') then perform public._forbidden(); end if;

  -- Whitelist the sort inputs — interpolated as identifier/keyword below.
  v_sort_field := case
    when p_sort_field in ('business_name','status','owner_full_name','owner_email','created_at')
      then p_sort_field else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'asc' then 'asc' else 'desc' end;

  return query execute format($q$
    select i.id, i.business_name, i.status, i.owner_full_name, i.owner_email::text,
           i.created_at, count(*) over() as total_count
    from public.vendor_application_intake i
    where ($1 is null
           or i.business_name ilike '%%' || $1 || '%%'
           or i.owner_full_name ilike '%%' || $1 || '%%'
           or i.owner_email::text ilike '%%' || $1 || '%%'
           or i.base_city ilike '%%' || $1 || '%%')
      and ($2 is null or i.status = $2)
    order by %I %s
    limit $3 offset $4
  $q$, v_sort_field, v_sort_dir)
  using v_search, p_status, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- count_intake_admin_by_status
-- Row counts grouped by status, honouring the search but NOT status itself, so
-- each tab's badge reflects the count it would show once selected. Statuses
-- with no matching rows are absent; the caller defaults those to zero.
-- ---------------------------------------------------------------------
create or replace function public.count_intake_admin_by_status(
  p_search text default null)
returns table (status text, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('vendor.review') then perform public._forbidden(); end if;

  return query
    select i.status, count(*)
    from public.vendor_application_intake i
    where (v_search is null
           or i.business_name ilike '%' || v_search || '%'
           or i.owner_full_name ilike '%' || v_search || '%'
           or i.owner_email::text ilike '%' || v_search || '%'
           or i.base_city ilike '%' || v_search || '%')
    group by i.status;
end;
$$;

grant execute on function
  public.search_intake_admin(text, text, text, text, integer, integer),
  public.count_intake_admin_by_status(text)
to authenticated;
