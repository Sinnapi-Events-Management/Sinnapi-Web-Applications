-- =====================================================================
-- Sinnapi — 0720 Revenue reporting RPCs
-- Server-side aggregation for the admin Reports → "Revenue & payments"
-- panel, replacing the panel's placeholder mock series with live reads.
-- Two SECURITY DEFINER reads, gated on `finance.read` (the same permission
-- the Ledger/finance reads use), following the 0014 RPC convention:
-- fixed search_path + internal authz re-check + explicit EXECUTE grant.
--
--   * report_revenue_trend       -> zero-filled gross / commission / refund
--                                   series bucketed by day | week | month
--   * report_payment_status_mix  -> payment counts by status in the window
--
-- Money columns are numeric and therefore arrive at the client as strings;
-- the caller coerces with Number(). All windows are relative to now().
-- =====================================================================

-- ---------------------------------------------------------------------
-- report_revenue_trend
-- Buckets the last `p_days` days at `p_granularity` (day/week/month) and
-- returns one row per bucket — including empty buckets — so the chart has a
-- continuous x-axis. `gross` sums succeeded payments (recognised at
-- paid_at, falling back to created_at); `commission` sums the snapshotted
-- escrow commission accrued in the bucket; `refunds` sums approved/in-flight
-- /completed refunds. The bucket window is truncated to the granularity so
-- weekly/monthly buckets align to week/month starts.
-- ---------------------------------------------------------------------
create or replace function public.report_revenue_trend(
  p_days        integer default 30,
  p_granularity text    default 'day')
returns table (
  bucket_start timestamptz,
  gross        numeric,
  commission   numeric,
  refunds      numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  -- Whitelist the granularity — it is interpolated into date_trunc/interval.
  v_gran text := case
    when lower(coalesce(p_granularity, '')) in ('day', 'week', 'month')
      then lower(p_granularity) else 'day' end;
  v_step interval := case v_gran
    when 'day' then interval '1 day'
    when 'week' then interval '1 week'
    else interval '1 month' end;
  v_from timestamptz := date_trunc(v_gran, now()) - make_interval(days => greatest(coalesce(p_days, 30), 1));
begin
  if not public.has_permission('finance.read') then perform public._forbidden(); end if;

  return query
  with buckets as (
    select generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) as b
  ),
  gross_by as (
    select date_trunc(v_gran, coalesce(paid_at, created_at)) as b, sum(amount) as amt
    from public.payments
    where status = 'succeeded'
      and coalesce(paid_at, created_at) >= v_from
    group by 1
  ),
  commission_by as (
    select date_trunc(v_gran, created_at) as b, sum(commission_amount) as amt
    from public.escrow_transactions
    where created_at >= v_from
    group by 1
  ),
  refunds_by as (
    select date_trunc(v_gran, created_at) as b, sum(amount) as amt
    from public.refunds
    where status in ('approved', 'processing', 'completed')
      and created_at >= v_from
    group by 1
  )
  select bk.b,
         coalesce(g.amt, 0)::numeric,
         coalesce(c.amt, 0)::numeric,
         coalesce(r.amt, 0)::numeric
  from buckets bk
  left join gross_by g      on g.b = bk.b
  left join commission_by c on c.b = bk.b
  left join refunds_by r    on r.b = bk.b
  order by bk.b;
end;
$$;

-- ---------------------------------------------------------------------
-- report_payment_status_mix
-- Payment counts grouped by status within the last `p_days` days — drives
-- the panel's "Payment status mix" donut. Statuses with no payments in the
-- window are simply absent from the result (the caller drops zero slices).
-- ---------------------------------------------------------------------
create or replace function public.report_payment_status_mix(
  p_days integer default 30)
returns table (
  status payment_status,
  total  bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
begin
  if not public.has_permission('finance.read') then perform public._forbidden(); end if;

  return query
    select p.status, count(*)::bigint
    from public.payments p
    where p.created_at >= v_from
    group by p.status
    order by count(*) desc;
end;
$$;

grant execute on function
  public.report_revenue_trend(integer, text),
  public.report_payment_status_mix(integer)
to authenticated;
