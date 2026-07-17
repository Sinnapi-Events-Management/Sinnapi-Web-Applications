-- =====================================================================
-- Sinnapi — 0717 Events admin search + filtering
-- Server-side search / filter / sort / paginate for the admin Events list.
-- Two SECURITY DEFINER reads, both gated on `events.manage` (the same
-- permission the `events_owner_write` RLS policy grants admins), following
-- the 0014 RPC convention: fixed search_path + internal authz re-check.
--
--   * search_events_admin          -> one page of rows + exact total_count
--   * count_events_admin_by_status -> per-status counts for the tab badges
--
-- Events have no `search_tsv`, so text matching is trigram ILIKE over the
-- title and location. The GIN indexes below back that path instead of a
-- sequential scan.
-- =====================================================================

-- pg_trgm is already installed (see 0001); these indexes make the ILIKE
-- search index-assisted. Partial on live rows only — the admin list never
-- shows tombstoned events.
create index if not exists ix_events_title_trgm
  on public.events using gin (title gin_trgm_ops) where deleted_at is null;
create index if not exists ix_events_location_trgm
  on public.events using gin (location gin_trgm_ops) where deleted_at is null;

-- ---------------------------------------------------------------------
-- search_events_admin
-- Null/empty parameters mean "no constraint", so the unfiltered list and a
-- fully-cleared filter set resolve to the same query. `total_count` is a
-- window count over the filtered set (before limit/offset) so the caller can
-- drive server-side pagination from a single round trip.
-- ---------------------------------------------------------------------
create or replace function public.search_events_admin(
  p_search     text    default null,
  p_status     text    default null,
  p_source     text    default null,
  p_is_public  boolean default null,
  p_date_from  date    default null,
  p_date_to    date    default null,
  p_sort_field text    default 'created_at',
  p_sort_dir   text    default 'desc',
  p_limit      integer default 25,
  p_offset     integer default 0)
returns table (
  id          uuid,
  title       text,
  source      event_source,
  status      event_status,
  event_date  date,
  is_public   boolean,
  created_at  timestamptz,
  total_count bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;

  -- Whitelist the sort inputs — they are interpolated as identifiers/keywords
  -- into the dynamic query below, so they must never come straight from input.
  v_sort_field := case
    when p_sort_field in ('title','source','status','event_date','is_public','created_at')
      then p_sort_field else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'asc' then 'asc' else 'desc' end;

  return query execute format($q$
    select e.id, e.title, e.source, e.status, e.event_date, e.is_public, e.created_at,
           count(*) over() as total_count
    from public.events e
    where e.deleted_at is null
      and ($1 is null
           or e.title ilike '%%' || $1 || '%%'
           or e.location ilike '%%' || $1 || '%%')
      and ($2 is null or e.status = $2::event_status)
      and ($3 is null or e.source = $3::event_source)
      and ($4 is null or e.is_public = $4)
      and ($5 is null or e.event_date >= $5)
      and ($6 is null or e.event_date <= $6)
    order by %I %s
    limit $7 offset $8
  $q$, v_sort_field, v_sort_dir)
  using v_search, p_status, p_source, p_is_public, p_date_from, p_date_to, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- count_events_admin_by_status
-- Row counts grouped by status, honouring every filter EXCEPT status itself
-- (status is what the tabs switch, so each tab's badge must reflect the count
-- it would show once selected). Statuses with no matching rows simply don't
-- appear — the caller defaults those to zero.
-- ---------------------------------------------------------------------
create or replace function public.count_events_admin_by_status(
  p_search    text    default null,
  p_source    text    default null,
  p_is_public boolean default null,
  p_date_from date    default null,
  p_date_to   date    default null)
returns table (status event_status, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('events.manage') then perform public._forbidden(); end if;

  return query
    select e.status, count(*)
    from public.events e
    where e.deleted_at is null
      and (v_search is null
           or e.title ilike '%' || v_search || '%'
           or e.location ilike '%' || v_search || '%')
      and (p_source is null or e.source = p_source::event_source)
      and (p_is_public is null or e.is_public = p_is_public)
      and (p_date_from is null or e.event_date >= p_date_from)
      and (p_date_to is null or e.event_date <= p_date_to)
    group by e.status;
end;
$$;

grant execute on function
  public.search_events_admin(text, text, text, boolean, date, date, text, text, integer, integer),
  public.count_events_admin_by_status(text, text, boolean, date, date)
to authenticated;
