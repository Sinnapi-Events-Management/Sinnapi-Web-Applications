-- =====================================================================
-- Sinnapi — 0720 Vendor / Subscription / Operations reporting RPCs
-- Server-side aggregation for the remaining admin Reports panels, replacing
-- their placeholder mock series with live reads. All SECURITY DEFINER, each
-- gated on the same permission its subject list uses, following the 0014 RPC
-- convention: fixed search_path + internal authz re-check + EXECUTE grant.
--
--   Vendors (vendor.manage)
--     * report_vendor_growth        -> signups + cumulative total per bucket
--     * report_vendor_status        -> vendor counts by lifecycle status
--   Subscriptions (subscriptions.manage)
--     * report_subscription_metrics -> added / churned / MRR per bucket
--     * report_subscription_status  -> subscription counts by status
--   Operations (bookings.read)
--     * report_operations_trend     -> bookings / quotations / disputes flow
--     * report_operations_snapshot  -> current bookings / escrow / dispute counts
--     * report_booking_status       -> booking counts by status
--
-- Time-series windows are the last `p_days` days bucketed by day|week|month.
-- Buckets are zero-filled (via generate_series) so charts keep a continuous
-- axis. numeric/bigint columns arrive at the client as strings (Number()).
-- =====================================================================

-- =====================================================================
-- VENDORS
-- =====================================================================

-- Signups counts vendors created within each bucket; cumulative is the running
-- total of all non-deleted vendors as of each bucket's end (baseline = vendors
-- that already existed before the window + running signups).
create or replace function public.report_vendor_growth(
  p_days        integer default 30,
  p_granularity text    default 'day')
returns table (
  bucket_start timestamptz,
  signups      bigint,
  cumulative   bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_gran text := case when lower(coalesce(p_granularity, '')) in ('day','week','month')
    then lower(p_granularity) else 'day' end;
  v_step interval := case v_gran when 'day' then interval '1 day'
    when 'week' then interval '1 week' else interval '1 month' end;
  v_from timestamptz := date_trunc(v_gran, now()) - make_interval(days => greatest(coalesce(p_days,30),1));
begin
  if not public.has_permission('vendor.manage') then perform public._forbidden(); end if;

  return query
  with buckets as (
    select b as bstart from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
  ),
  signups_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.vendors
    where deleted_at is null and created_at >= v_from
    group by 1
  ),
  baseline as (
    select count(*) as c from public.vendors
    where deleted_at is null and created_at < date_trunc(v_gran, v_from)
  )
  select bk.bstart,
         coalesce(s.c, 0)::bigint,
         ((select c from baseline) + coalesce(sum(coalesce(s.c, 0)) over (order by bk.bstart), 0))::bigint
  from buckets bk
  left join signups_by s on s.b = bk.bstart
  order by bk.bstart;
end;
$$;

-- Vendor counts by lifecycle status (non-deleted). No date filter — a snapshot.
create or replace function public.report_vendor_status()
returns table (status vendor_status, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('vendor.manage') then perform public._forbidden(); end if;
  return query
    select v.status, count(*)::bigint
    from public.vendors v
    where v.deleted_at is null
    group by v.status
    order by count(*) desc;
end;
$$;

-- =====================================================================
-- SUBSCRIPTIONS
-- =====================================================================

-- Added = subscriptions created in the bucket; churned = subscriptions cancelled
-- in the bucket; mrr = monthly-normalised plan price of every subscription active
-- as of the bucket's end (created on/before it and not yet cancelled/deleted).
-- Annual plans are divided by 12 so MRR is comparable across billing cycles.
create or replace function public.report_subscription_metrics(
  p_days        integer default 30,
  p_granularity text    default 'day')
returns table (
  bucket_start timestamptz,
  added        bigint,
  churned      bigint,
  mrr          numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  v_gran text := case when lower(coalesce(p_granularity, '')) in ('day','week','month')
    then lower(p_granularity) else 'day' end;
  v_step interval := case v_gran when 'day' then interval '1 day'
    when 'week' then interval '1 week' else interval '1 month' end;
  v_from timestamptz := date_trunc(v_gran, now()) - make_interval(days => greatest(coalesce(p_days,30),1));
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;

  return query
  with buckets as (
    select b as bstart, b + v_step as bend
    from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
  ),
  added_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.subscriptions
    where deleted_at is null and created_at >= v_from
    group by 1
  ),
  churned_by as (
    select date_trunc(v_gran, cancelled_at) as b, count(*) as c
    from public.subscriptions
    where deleted_at is null and cancelled_at is not null and cancelled_at >= v_from
    group by 1
  )
  select bk.bstart,
         coalesce(a.c, 0)::bigint,
         coalesce(ch.c, 0)::bigint,
         coalesce((
           select sum(case pp.billing_cycle when 'annual' then pp.price / 12 else pp.price end)
           from public.subscriptions su
           join public.pricing_plans pp on pp.id = su.plan_id
           where su.deleted_at is null
             and su.created_at <= bk.bend
             and (su.cancelled_at is null or su.cancelled_at > bk.bend)
         ), 0)::numeric
  from buckets bk
  left join added_by a   on a.b = bk.bstart
  left join churned_by ch on ch.b = bk.bstart
  order by bk.bstart;
end;
$$;

-- Subscription counts by status (non-deleted). Snapshot, no date filter.
create or replace function public.report_subscription_status()
returns table (status subscription_status, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('subscriptions.manage') then perform public._forbidden(); end if;
  return query
    select s.status, count(*)::bigint
    from public.subscriptions s
    where s.deleted_at is null
    group by s.status
    order by count(*) desc;
end;
$$;

-- =====================================================================
-- OPERATIONS
-- =====================================================================

-- Volume + dispute flow per bucket: bookings/quotations created (non-deleted)
-- and disputes opened (created_at) vs resolved (resolved_at).
create or replace function public.report_operations_trend(
  p_days        integer default 30,
  p_granularity text    default 'day')
returns table (
  bucket_start timestamptz,
  bookings     bigint,
  quotations   bigint,
  opened       bigint,
  resolved     bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_gran text := case when lower(coalesce(p_granularity, '')) in ('day','week','month')
    then lower(p_granularity) else 'day' end;
  v_step interval := case v_gran when 'day' then interval '1 day'
    when 'week' then interval '1 week' else interval '1 month' end;
  v_from timestamptz := date_trunc(v_gran, now()) - make_interval(days => greatest(coalesce(p_days,30),1));
begin
  if not public.has_permission('bookings.read') then perform public._forbidden(); end if;

  return query
  with buckets as (
    select b as bstart from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
  ),
  bookings_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.bookings where deleted_at is null and created_at >= v_from group by 1
  ),
  quotations_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.quotations where deleted_at is null and created_at >= v_from group by 1
  ),
  opened_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.disputes where created_at >= v_from group by 1
  ),
  resolved_by as (
    select date_trunc(v_gran, resolved_at) as b, count(*) as c
    from public.disputes where resolved_at is not null and resolved_at >= v_from group by 1
  )
  select bk.bstart,
         coalesce(bo.c, 0)::bigint,
         coalesce(qu.c, 0)::bigint,
         coalesce(op.c, 0)::bigint,
         coalesce(re.c, 0)::bigint
  from buckets bk
  left join bookings_by bo   on bo.b = bk.bstart
  left join quotations_by qu on qu.b = bk.bstart
  left join opened_by op     on op.b = bk.bstart
  left join resolved_by re    on re.b = bk.bstart
  order by bk.bstart;
end;
$$;

-- Current operational scalars for the KPI row.
create or replace function public.report_operations_snapshot()
returns table (
  bookings_total   bigint,
  escrow_in_flight bigint,
  open_disputes    bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('bookings.read') then perform public._forbidden(); end if;
  return query
    select
      (select count(*) from public.bookings where deleted_at is null)::bigint,
      (select count(*) from public.escrow_transactions
         where status in ('held','release_requested','admin_review'))::bigint,
      (select count(*) from public.disputes
         where status in ('open','under_review','awaiting_evidence'))::bigint;
end;
$$;

-- Booking counts by status (non-deleted). Snapshot, no date filter.
create or replace function public.report_booking_status()
returns table (status booking_status, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('bookings.read') then perform public._forbidden(); end if;
  return query
    select b.status, count(*)::bigint
    from public.bookings b
    where b.deleted_at is null
    group by b.status
    order by count(*) desc;
end;
$$;

grant execute on function
  public.report_vendor_growth(integer, text),
  public.report_vendor_status(),
  public.report_subscription_metrics(integer, text),
  public.report_subscription_status(),
  public.report_operations_trend(integer, text),
  public.report_operations_snapshot(),
  public.report_booking_status()
to authenticated;
