-- =====================================================================
-- Sinnapi — 0721 Admin dashboard overview RPC
-- One round-trip behind the admin landing page. Replaces the five separate
-- head-count queries the dashboard used to fire with a single aggregate that
-- also carries trends, SLA ages, distributions and a recent-activity feed.
--
--   admin_dashboard_overview(p_days, p_granularity) -> jsonb
--
-- SHAPE OF THE PAYLOAD
--   { generated_at, period_days, granularity,
--     queues:  { <key>: { count, inflow, oldest_at, overdue, trend[] } },
--     subscriptions: { mrr, added, churned, active, trialing, mrr_at_risk,
--                      trials{}, trend[], plan_mix[], status_mix[] } | null,
--     finance: { gross, commission, refunds, escrow_held, escrow_count,
--                trend[], payment_mix[] } | null,
--     growth:  { vendors: {...}|null, operations: {...}|null, users: {...}|null },
--     activity: [ { id, action, entity_type, ..., actor_name } ] | null }
--
-- PERMISSIONS
-- The outer gate is `is_admin()` — the same check `AdminGate` makes before the
-- console renders at all. Every *section* is then gated on the exact permission
-- that guards its own full page (`vendor.review` for the applications queue,
-- `finance.read` for the money band, and so on), so the payload only ever
-- carries what this admin could already open directly. A section the caller
-- can't see is simply absent, and the UI reflows around the gap rather than
-- rendering an empty or erroring card.
--
-- Trend buckets are zero-filled via generate_series so a chart keeps a
-- continuous x-axis. numeric/bigint values arrive at the client as JSON numbers
-- (jsonb_build_object casts them), timestamps as ISO strings.
-- =====================================================================

-- ---------------------------------------------------------------------
-- _dashboard_queue
-- One actionable work queue, summarised. `count` is the live backlog (rows
-- currently sitting in one of `p_statuses`), `oldest_at` the arrival time of
-- the longest-waiting item, and `overdue` how many have blown their SLA.
--
-- `inflow` and `trend` deliberately ignore status: they count everything that
-- *entered* the queue in the window, which is what a volume read should show.
-- Filtering those by current status would undercount, because items that were
-- already worked through have since left the backlog.
--
-- `p_age_column` is what "waiting since" means for this queue. For an approval
-- queue that is `created_at`, but a renewal is not overdue from the day the
-- subscription was created — it is overdue from `current_period_end`, so the
-- renewals queue ages and buckets on that instead.
--
-- Both the table and the age column are interpolated, so both are whitelisted
-- against the exact set this dashboard knows about before reaching `format`.
--
-- NOTE ON THE DROP BELOW
-- `create or replace function` cannot change a function's *signature*. This
-- helper gained `p_age_column` after its first release, so on any database that
-- ran the earlier version, a plain `create or replace` leaves the old
-- 6-argument function in place as an overload. Every call site passes 5 or 6
-- arguments and relies on defaults, which then matches both candidates:
--
--   42725  function public._dashboard_queue(unknown, text[], timestamp with
--          time zone, text, interval) is not unique
--
-- So every prior overload is dropped by name first. Doing it by catalogue
-- lookup rather than naming one signature keeps this migration re-runnable no
-- matter which earlier version a given database happens to be on.
-- ---------------------------------------------------------------------
do $drop$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = '_dashboard_queue'
  loop
    execute format('drop function if exists %s', r.signature);
  end loop;
end;
$drop$;

create or replace function public._dashboard_queue(
  p_table    text,
  p_statuses text[],
  p_from     timestamptz,
  p_gran     text,
  p_step     interval,
  -- Only `disputes` carries an SLA column; everything else reports 0 overdue.
  p_sla      boolean default false,
  p_age_column text default 'created_at')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sql    text;
  v_result jsonb;
begin
  if p_table not in
     ('vendor_application_intake', 'payouts', 'refunds', 'disputes', 'escrow_transactions',
      'subscriptions')
  then
    raise exception 'unsupported dashboard queue table %', p_table;
  end if;

  if p_age_column not in ('created_at', 'current_period_end') then
    raise exception 'unsupported dashboard queue age column %', p_age_column;
  end if;

  -- Every placeholder is cast explicitly: inside EXECUTE, Postgres has to infer
  -- parameter types from context, and an un-cast interval in generate_series is
  -- exactly the case it cannot resolve.
  v_sql := format($f$
    with backlog as (
      select %I as aged_at, %s as sla_due
      from public.%I
      where status::text = any($1::text[])
    ),
    buckets as (
      select b as bstart
      from generate_series(
        date_trunc(%L, $2::timestamptz), date_trunc(%L, now()), $3::interval) b
    ),
    inflow as (
      select date_trunc(%L, %I) as b, count(*) as c
      from public.%I
      -- Bounded at now() so `inflow` always equals the sum of `trend`: an age
      -- column can hold future dates (a renewal not yet due), which fall
      -- outside every bucket.
      where %I >= $2::timestamptz and %I <= now()
      group by 1
    )
    select jsonb_build_object(
      'count',     (select count(*) from backlog),
      'inflow',    (select coalesce(sum(c), 0) from inflow),
      'oldest_at', (select min(aged_at) from backlog),
      'overdue',   (select count(*) from backlog where sla_due is not null and sla_due < now()),
      'trend',     coalesce((
                     select jsonb_agg(
                              jsonb_build_object('bucket_start', bk.bstart, 'value', coalesce(i.c, 0))
                              order by bk.bstart)
                     from buckets bk
                     left join inflow i on i.b = bk.bstart), '[]'::jsonb)
    )
  $f$,
  p_age_column,
  case when p_sla then 'sla_due_at' else 'null::timestamptz' end,
  p_table, p_gran, p_gran, p_gran, p_age_column, p_table, p_age_column, p_age_column);

  execute v_sql into v_result using p_statuses, p_from, p_step;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- admin_dashboard_overview
-- ---------------------------------------------------------------------
create or replace function public.admin_dashboard_overview(
  p_days        integer default 30,
  p_granularity text    default 'day')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  -- Whitelist the granularity — it is interpolated into date_trunc/interval.
  v_gran text := case when lower(coalesce(p_granularity, '')) in ('day', 'week', 'month')
    then lower(p_granularity) else 'day' end;
  v_step interval := case v_gran when 'day' then interval '1 day'
    when 'week' then interval '1 week' else interval '1 month' end;
  v_days integer := greatest(coalesce(p_days, 30), 1);
  v_from timestamptz := date_trunc(v_gran, now()) - make_interval(days => v_days);

  v_queues        jsonb := '{}'::jsonb;
  v_finance       jsonb := null;
  v_subscriptions jsonb := null;
  v_growth     jsonb := '{}'::jsonb;
  v_vendors    jsonb := null;
  v_operations jsonb := null;
  v_users      jsonb := null;
  v_activity   jsonb := null;
begin
  if not public.is_admin() then perform public._forbidden(); end if;

  -- ---------------- Action queues ----------------
  -- Each queue mirrors the status filter its own admin page uses, so the tile
  -- count and the list the tile links to can never disagree.
  if public.has_permission('vendor.review') then
    v_queues := v_queues || jsonb_build_object('applications',
      public._dashboard_queue('vendor_application_intake',
        array['submitted', 'reviewing'], v_from, v_gran, v_step));
  end if;

  if public.has_permission('payout.approve') then
    v_queues := v_queues || jsonb_build_object('payouts',
      public._dashboard_queue('payouts',
        array['requested', 'approved', 'processing'], v_from, v_gran, v_step));
  end if;

  if public.has_permission('dispute.manage') then
    v_queues := v_queues || jsonb_build_object('disputes',
      public._dashboard_queue('disputes',
        array['open', 'under_review', 'awaiting_evidence'], v_from, v_gran, v_step, true));
  end if;

  if public.has_permission('escrow.read') then
    v_queues := v_queues || jsonb_build_object('escrow',
      public._dashboard_queue('escrow_transactions',
        array['held', 'release_requested', 'admin_review'], v_from, v_gran, v_step));
  end if;

  if public.has_permission('refund.approve') then
    v_queues := v_queues || jsonb_build_object('refunds',
      public._dashboard_queue('refunds',
        array['requested'], v_from, v_gran, v_step));
  end if;

  -- Recurring revenue actively at risk. Only the recoverable states count:
  -- `past_due` and `grace` can still be saved, whereas `suspended`/`expired`
  -- have already lapsed and belong to churn, not to a work queue. Ages on
  -- `current_period_end` — the renewal date that passed, not the signup date.
  if public.has_permission('subscriptions.manage') then
    v_queues := v_queues || jsonb_build_object('renewals',
      public._dashboard_queue('subscriptions',
        array['past_due', 'grace'], v_from, v_gran, v_step, false, 'current_period_end'));
  end if;

  -- ---------------- Financial health ----------------
  -- Mirrors `report_revenue_trend`: gross is recognised at paid_at (falling back
  -- to created_at), commission is the snapshotted escrow cut, refunds are the
  -- approved-or-later ones. Escrow held is the balance currently in custody.
  if public.has_permission('finance.read') then
    with buckets as (
      select b as bstart
      from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
    ),
    gross_by as (
      select date_trunc(v_gran, coalesce(paid_at, created_at)) as b, sum(amount) as amt
      from public.payments
      where status = 'succeeded' and coalesce(paid_at, created_at) >= v_from
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
      where status in ('approved', 'processing', 'completed') and created_at >= v_from
      group by 1
    ),
    series as (
      select bk.bstart,
             coalesce(g.amt, 0)::numeric as gross,
             coalesce(c.amt, 0)::numeric as commission,
             coalesce(r.amt, 0)::numeric as refunds
      from buckets bk
      left join gross_by g      on g.b = bk.bstart
      left join commission_by c on c.b = bk.bstart
      left join refunds_by r    on r.b = bk.bstart
    ),
    held as (
      select coalesce(sum(gross_amount), 0)::numeric as amount, count(*)::bigint as n
      from public.escrow_transactions
      where status in ('held', 'release_requested', 'admin_review')
    ),
    mix as (
      select p.status::text as name, count(*)::bigint as value
      from public.payments p
      where p.created_at >= v_from
      group by p.status
    )
    select jsonb_build_object(
      'gross',        (select coalesce(sum(gross), 0) from series),
      'commission',   (select coalesce(sum(commission), 0) from series),
      'refunds',      (select coalesce(sum(refunds), 0) from series),
      'escrow_held',  (select amount from held),
      'escrow_count', (select n from held),
      'trend', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'bucket_start', bstart, 'gross', gross,
                 'commission', commission, 'refunds', refunds) order by bstart)
        from series), '[]'::jsonb),
      'payment_mix', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc)
        from mix), '[]'::jsonb)
    ) into v_finance;
  end if;

  -- ---------------- Subscription revenue ----------------
  -- The platform's recurring income. MRR is monthly-normalised (annual plans
  -- divided by 12) and counts every subscription live as of a bucket's end —
  -- deliberately the *same* definition as `report_subscription_metrics`, so the
  -- dashboard and the Reports panel can never quote different MRR figures.
  if public.has_permission('subscriptions.manage') then
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
    ),
    series as (
      select bk.bstart,
             coalesce(a.c, 0)::bigint  as added,
             coalesce(ch.c, 0)::bigint as churned,
             coalesce((
               select sum(case pp.billing_cycle when 'annual' then pp.price / 12 else pp.price end)
               from public.subscriptions su
               join public.pricing_plans pp on pp.id = su.plan_id
               where su.deleted_at is null
                 and su.created_at <= bk.bend
                 and (su.cancelled_at is null or su.cancelled_at > bk.bend)
             ), 0)::numeric as mrr
      from buckets bk
      left join added_by a    on a.b  = bk.bstart
      left join churned_by ch on ch.b = bk.bstart
    ),
    status_mix as (
      select s.status::text as name, count(*)::bigint as value
      from public.subscriptions s
      where s.deleted_at is null
      group by s.status
    ),
    -- Which plans actually earn: current MRR split by plan, same live-as-of-now
    -- predicate the trend uses at each bucket end.
    plan_mix as (
      select pp.name as name,
             sum(case pp.billing_cycle when 'annual' then pp.price / 12 else pp.price end)::numeric
               as value
      from public.subscriptions su
      join public.pricing_plans pp on pp.id = su.plan_id
      where su.deleted_at is null
        and (su.cancelled_at is null or su.cancelled_at > now())
      group by pp.name
    ),
    -- MRR sitting in a recoverable failure state right now.
    at_risk as (
      select coalesce(sum(
               case pp.billing_cycle when 'annual' then pp.price / 12 else pp.price end), 0)::numeric
               as amount
      from public.subscriptions su
      join public.pricing_plans pp on pp.id = su.plan_id
      where su.deleted_at is null and su.status in ('past_due', 'grace')
    ),
    -- Trial conversion, measured on trials that *finished* inside the window:
    -- of those, how many are now on a paying plan. `ongoing` is every trial
    -- still running, which has no outcome yet and so is reported separately
    -- rather than counted as a failure.
    trials as (
      select
        count(*) filter (
          where trial_ends_at >= v_from and trial_ends_at <= now()) as ended,
        count(*) filter (
          where trial_ends_at >= v_from and trial_ends_at <= now()
            and status in ('active', 'past_due', 'grace')) as converted,
        count(*) filter (where status = 'trialing') as ongoing
      from public.subscriptions
      where deleted_at is null
    )
    select jsonb_build_object(
      -- The newest bucket is the current MRR level; earlier buckets are history.
      'mrr',         (select coalesce(mrr, 0) from series order by bstart desc limit 1),
      'added',       (select coalesce(sum(added), 0) from series),
      'churned',     (select coalesce(sum(churned), 0) from series),
      'active',      (select count(*) from public.subscriptions
                        where deleted_at is null and status = 'active'),
      'trialing',    (select ongoing from trials),
      'mrr_at_risk', (select amount from at_risk),
      'trials', jsonb_build_object(
        'ended',     (select ended from trials),
        'converted', (select converted from trials),
        'ongoing',   (select ongoing from trials)),
      'trend', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'bucket_start', bstart, 'mrr', mrr,
                 'added', added, 'churned', churned) order by bstart)
        from series), '[]'::jsonb),
      'plan_mix', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc)
        from plan_mix where value > 0), '[]'::jsonb),
      'status_mix', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc)
        from status_mix), '[]'::jsonb)
    ) into v_subscriptions;
  end if;

  -- ---------------- Marketplace growth ----------------
  if public.has_permission('vendor.manage') then
    with buckets as (
      select b as bstart
      from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
    ),
    signups_by as (
      select date_trunc(v_gran, created_at) as b, count(*) as c
      from public.vendors
      where deleted_at is null and created_at >= v_from
      group by 1
    ),
    series as (
      select bk.bstart, coalesce(s.c, 0)::bigint as signups
      from buckets bk left join signups_by s on s.b = bk.bstart
    ),
    status_mix as (
      select v.status::text as name, count(*)::bigint as value
      from public.vendors v
      where v.deleted_at is null
      group by v.status
    )
    select jsonb_build_object(
      'active', (select count(*) from public.vendors
                  where deleted_at is null and status = 'active'),
      'new',    (select coalesce(sum(signups), 0) from series),
      'trend',  coalesce((
        select jsonb_agg(jsonb_build_object('bucket_start', bstart, 'signups', signups)
               order by bstart) from series), '[]'::jsonb),
      'status_mix', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc)
        from status_mix), '[]'::jsonb)
    ) into v_vendors;
  end if;

  if public.has_permission('bookings.read') then
    with buckets as (
      select b as bstart
      from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
    ),
    bookings_by as (
      select date_trunc(v_gran, created_at) as b, count(*) as c
      from public.bookings where deleted_at is null and created_at >= v_from group by 1
    ),
    quotations_by as (
      select date_trunc(v_gran, created_at) as b, count(*) as c
      from public.quotations where deleted_at is null and created_at >= v_from group by 1
    ),
    series as (
      select bk.bstart,
             coalesce(bo.c, 0)::bigint as bookings,
             coalesce(qu.c, 0)::bigint as quotations
      from buckets bk
      left join bookings_by bo   on bo.b = bk.bstart
      left join quotations_by qu on qu.b = bk.bstart
    ),
    status_mix as (
      select b.status::text as name, count(*)::bigint as value
      from public.bookings b
      where b.deleted_at is null
      group by b.status
    )
    select jsonb_build_object(
      'bookings',   (select coalesce(sum(bookings), 0) from series),
      'quotations', (select coalesce(sum(quotations), 0) from series),
      'trend', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'bucket_start', bstart, 'bookings', bookings, 'quotations', quotations)
               order by bstart) from series), '[]'::jsonb),
      'status_mix', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc)
        from status_mix), '[]'::jsonb)
    ) into v_operations;
  end if;

  if public.has_permission('users.read') then
    select jsonb_build_object(
      'total', count(*) filter (where deleted_at is null),
      'new',   count(*) filter (where deleted_at is null and created_at >= v_from)
    ) into v_users
    from public.profiles;
  end if;

  v_growth := jsonb_build_object(
    'vendors', v_vendors, 'operations', v_operations, 'users', v_users);

  -- ---------------- Recent activity ----------------
  -- The audit trail's newest entries. `entity_summary` is resolved here from the
  -- stored row snapshot rather than shipping the whole `before`/`after` blobs to
  -- a feed that only ever shows one line per entry.
  if public.has_permission('audit.read') then
    select coalesce(jsonb_agg(to_jsonb(t) order by t.occurred_at desc), '[]'::jsonb)
    into v_activity
    from (
      select a.id,
             a.action,
             a.entity_type,
             a.entity_id,
             a.occurred_at,
             (a.actor_id is null) as is_system,
             coalesce(p.full_name, p.email) as actor_name,
             coalesce(
               nullif(s.snap->>'name', ''),          nullif(s.snap->>'title', ''),
               nullif(s.snap->>'full_name', ''),     nullif(s.snap->>'display_name', ''),
               nullif(s.snap->>'business_name', ''), nullif(s.snap->>'plan_name', ''),
               nullif(s.snap->>'reference_no', ''),  nullif(s.snap->>'reference', ''),
               nullif(s.snap->>'key', ''),           nullif(s.snap->>'email', '')
             ) as entity_summary
      from public.audit_logs a
      left join public.profiles p on p.id = a.actor_id
      cross join lateral (select coalesce(a.after, a.before) as snap) s
      order by a.occurred_at desc
      limit 8
    ) t;
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'period_days',  v_days,
    'granularity',  v_gran,
    'queues',        v_queues,
    'subscriptions', v_subscriptions,
    'finance',       v_finance,
    'growth',       v_growth,
    'activity',     v_activity
  );
end;
$$;

-- `_dashboard_queue` is an internal helper: it is only ever reached through
-- `admin_dashboard_overview`, which does the permission gating, so it is not
-- granted to clients.
revoke execute on function
  public._dashboard_queue(text, text[], timestamptz, text, interval, boolean, text)
  from public, anon, authenticated;

grant execute on function
  public.admin_dashboard_overview(integer, text)
to authenticated;
