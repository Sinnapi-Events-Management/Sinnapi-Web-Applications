-- =====================================================================
-- Sinnapi — 0718 Subscription admin search + filtering
-- Server-side search / filter / sort / paginate for the admin Subscriptions
-- list. Three SECURITY DEFINER reads, all gated on `subscriptions.manage`
-- (the same permission the `subs_read` RLS policy grants admins), following
-- the 0014 RPC convention: fixed search_path + internal authz re-check.
--
--   * search_subscriptions_admin          -> one page of rows + total_count
--   * count_subscriptions_admin_by_status -> per-status counts for the tabs
--   * list_pricing_plan_options           -> plans for the filter dropdown
--
-- Free-text search matches the owning vendor's business name via trigram
-- ILIKE (backed by ix_vendors_business_trgm from the 0717 migration). All
-- reads exclude soft-deleted subscriptions (`deleted_at is null`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- search_subscriptions_admin
-- Null/empty parameters mean "no constraint", so the unfiltered list and a
-- fully-cleared filter set resolve to the same query. `p_plan_id` filters the
-- row's own `plan_id`, so a plan-less subscription (plan_id is null) matches
-- only when no plan is selected. `p_expiring_days`, when set, keeps rows whose
-- period ends within the next N days (and not already lapsed). `total_count`
-- is a window count over the filtered set (before limit/offset) so the caller
-- can drive server-side pagination from a single round trip.
-- ---------------------------------------------------------------------
create or replace function public.search_subscriptions_admin(
  p_search        text    default null,
  p_status        text    default null,
  p_plan_id       uuid    default null,
  p_expiring_days integer default null,
  p_sort_field    text    default 'current_period_end',
  p_sort_dir      text    default 'asc',
  p_limit         integer default 25,
  p_offset        integer default 0)
returns table (
  id                 uuid,
  status             subscription_status,
  current_period_end timestamptz,
  grace_until        timestamptz,
  trial_ends_at      timestamptz,
  business_name      text,
  plan_name          text,
  total_count        bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  -- Whitelist the sort inputs — they are interpolated as identifiers/keywords
  -- into the dynamic query below, so they must never come straight from input.
  -- The field is qualified with the `s` alias (status also exists on vendors).
  v_sort_field := case
    when p_sort_field in ('current_period_end','grace_until','trial_ends_at','status')
      then p_sort_field else 'current_period_end' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'desc' then 'desc' else 'asc' end;

  return query execute format($q$
    select s.id, s.status, s.current_period_end, s.grace_until, s.trial_ends_at,
           v.business_name, p.name as plan_name,
           count(*) over() as total_count
    from public.subscriptions s
    join public.vendors v on v.id = s.vendor_id
    left join public.pricing_plans p on p.id = s.plan_id
    where s.deleted_at is null
      and ($1 is null or v.business_name ilike '%%' || $1 || '%%')
      and ($2 is null or s.status = $2::subscription_status)
      and ($3 is null or s.plan_id = $3)
      and ($4 is null
           or (s.current_period_end >= now()
               and s.current_period_end <= now() + make_interval(days => $4)))
    order by s.%I %s
    limit $5 offset $6
  $q$, v_sort_field, v_sort_dir)
  using v_search, p_status, p_plan_id, p_expiring_days, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- count_subscriptions_admin_by_status
-- Row counts grouped by status, honouring every filter EXCEPT status itself
-- (status is what the tabs switch, so each tab's badge must reflect the count
-- it would show once selected). Statuses with no matching rows simply don't
-- appear — the caller defaults those to zero.
-- ---------------------------------------------------------------------
create or replace function public.count_subscriptions_admin_by_status(
  p_search        text    default null,
  p_plan_id       uuid    default null,
  p_expiring_days integer default null)
returns table (status subscription_status, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  return query
    select s.status, count(*)
    from public.subscriptions s
    join public.vendors v on v.id = s.vendor_id
    where s.deleted_at is null
      and (v_search is null or v.business_name ilike '%' || v_search || '%')
      and (p_plan_id is null or s.plan_id = p_plan_id)
      and (p_expiring_days is null
           or (s.current_period_end >= now()
               and s.current_period_end <= now() + make_interval(days => p_expiring_days)))
    group by s.status;
end;
$$;

-- ---------------------------------------------------------------------
-- list_pricing_plan_options
-- Every pricing plan as an {id, name} option for the list' plan filter —
-- active or not, since a subscription can sit on a since-retired plan and
-- hiding it would make those rows unfilterable. Ordered by the catalogue's
-- own `sort_order`.
-- ---------------------------------------------------------------------
create or replace function public.list_pricing_plan_options()
returns table (id uuid, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  return query
    select pp.id, pp.name
    from public.pricing_plans pp
    order by pp.sort_order asc;
end;
$$;

grant execute on function
  public.search_subscriptions_admin(text, text, uuid, integer, text, text, integer, integer),
  public.count_subscriptions_admin_by_status(text, uuid, integer),
  public.list_pricing_plan_options()
to authenticated;
