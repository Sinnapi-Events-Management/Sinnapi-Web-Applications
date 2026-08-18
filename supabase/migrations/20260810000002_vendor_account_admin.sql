-- =====================================================================
-- Sinnapi — 0810b Vendor accounts: the People-section read side
--
-- WHAT THIS IS FOR
-- The console had two vendor-shaped pages and neither answered "who are the
-- people we let in?".
--
--   Operations → Applications  the anonymous intake queue: submissions that do
--                              not have an account yet.
--   Operations → Vendors       the LISTING: business name, category, visibility,
--                              rating. A row there is a shopfront.
--
-- Neither is the account. Support's actual questions — did the approved
-- applicant ever manage to sign in, can we get them back in, is this the vendor
-- we barred last month — were unanswerable from either page, and the vendor
-- half of `profiles` was reachable only through the generic Users list, which
-- deliberately scopes itself to staff.
--
-- People → Vendors is that missing view: one row per vendor OWNER ACCOUNT,
-- carrying its lifecycle state (0810a), its credential state, and — as read-only
-- context, not as something to act on — the listing it owns.
--
-- WHAT THIS FILE PROVIDES
--   * search_vendor_accounts          -> one page of rows + exact total_count
--   * count_vendor_accounts_by_status -> per-status counts for the tab badges
--   * expire_vendor_suspensions       -> lifts temporary suspensions that are due
--   * list_blocked_accounts           -> widened for the two new statuses
--
-- WHY THE READS ARE RPCs AND NOT A POSTGREST QUERY
-- The Clients list scopes itself by fetching every client profile id into the
-- browser and passing them back as an `in (…)` filter — two round trips, and a
-- list that grows without bound in a query string. That is survivable at the
-- current size and would not be for vendors once approvals compound. A
-- SECURITY DEFINER function does the role scoping where the data is, and
-- returns the page and its grand total together (the `total_count` window
-- convention from 0717).
--
-- Reads are gated on `users.read`; every write in this domain is an Edge
-- Function gated on `users.manage`, because moving an account between lifecycle
-- states also has to ban or unban the auth login, which only service_role can
-- do (see `manage-vendor-account`).
-- =====================================================================

-- Matching on the business name is the search an operator actually types, and
-- `vendors` had trigram coverage only through the listing search's own indexes.
create index if not exists ix_vendors_business_name_trgm
  on public.vendors using gin (business_name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- search_vendor_accounts
--
-- Scope: live profiles holding the `vendor` role. `exists` rather than a join
-- to `user_roles` so an account that somehow holds the role twice appears once
-- — a duplicated row here would double-count in `total_count` and desynchronise
-- the pager from the table.
--
-- The listing and the application are LATERAL, and both are optional. An
-- account can legitimately have neither: a promotion that provisioned the
-- account and then failed before `approve_vendor` leaves exactly that, and it
-- is the single most useful row on the page — an applicant stuck in a state no
-- other screen shows. Inner-joining the listing would have hidden it.
--
-- `applied_at` is reached the long way round (listing → application → intake)
-- because that chain is the only link back to the public submission. Null for
-- vendors created by any route that did not start as an intake.
-- ---------------------------------------------------------------------
create or replace function public.search_vendor_accounts(
  p_search     text    default null,
  p_status     text    default null,
  p_sort_field text    default 'created_at',
  p_sort_dir   text    default 'desc',
  p_limit      integer default 25,
  p_offset     integer default 0)
returns table (
  profile_id        uuid,
  full_name         text,
  email             text,
  phone             text,
  account_status    profile_status,
  status_reason     text,
  status_changed_at timestamptz,
  suspended_until   timestamptz,
  last_login_at     timestamptz,
  created_at        timestamptz,
  vendor_id         uuid,
  business_name     text,
  vendor_status     text,
  vendor_visibility text,
  applied_at        timestamptz,
  total_count       bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit      integer := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_offset     integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.has_permission('users.read') then perform public._forbidden(); end if;

  -- Whitelisted: both are interpolated as an identifier / keyword below, so
  -- anything unrecognised falls back rather than reaching the planner.
  v_sort_field := case
    when p_sort_field in ('full_name','email','account_status','last_login_at',
                          'created_at','business_name')
      then p_sort_field else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir,'')) = 'asc' then 'asc' else 'desc' end;

  -- ILIKE metacharacters would silently widen the match, so the pattern is
  -- built here rather than taken from the caller (same treatment as 0802c).
  if v_search is not null then
    v_search := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query execute format($q$
    with base as (
      select p.id                        as profile_id,
             p.full_name                 as full_name,
             p.email::text               as email,
             p.phone                     as phone,
             p.status                    as account_status,
             p.status_reason             as status_reason,
             p.status_changed_at         as status_changed_at,
             p.suspended_until           as suspended_until,
             p.last_login_at             as last_login_at,
             p.created_at                as created_at,
             v.id                        as vendor_id,
             v.business_name             as business_name,
             v.status::text              as vendor_status,
             v.visibility::text          as vendor_visibility,
             i.created_at                as applied_at
        from public.profiles p
        left join lateral (
          select v2.id, v2.business_name, v2.status, v2.visibility, v2.application_id
            from public.vendors v2
           where v2.owner_id = p.id and v2.deleted_at is null
           order by v2.created_at asc
           limit 1
        ) v on true
        left join lateral (
          select k.created_at
            from public.vendor_application_intake k
           where k.promoted_application_id = v.application_id
           limit 1
        ) i on true
       where p.deleted_at is null
         and exists (
           select 1
             from public.user_roles ur
             join public.roles r on r.id = ur.role_id
            where ur.profile_id = p.id and r.key = 'vendor'
         )
         and ($2 is null or p.status = $2::profile_status)
         and ($1 is null
              or p.full_name ilike $1 escape '\'
              or p.email::text ilike $1 escape '\'
              or coalesce(p.phone, '') ilike $1 escape '\'
              or coalesce(v.business_name, '') ilike $1 escape '\')
    )
    select b.profile_id, b.full_name, b.email, b.phone, b.account_status,
           b.status_reason, b.status_changed_at, b.suspended_until,
           b.last_login_at, b.created_at, b.vendor_id, b.business_name,
           b.vendor_status, b.vendor_visibility, b.applied_at,
           count(*) over() as total_count
      from base b
     -- `profile_id` breaks ties so paging is stable: without it two accounts
     -- sharing a sort value can swap places between pages and one of them is
     -- then never shown.
     order by %I %s nulls last, profile_id asc
     limit $3 offset $4
  $q$, v_sort_field, v_sort_dir)
  using v_search, p_status, v_limit, v_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- count_vendor_accounts_by_status
-- Honours the active search but NOT the status filter, so each badge shows what
-- its tab would show once selected. Statuses with no rows are absent; the caller
-- defaults them to zero.
-- ---------------------------------------------------------------------
create or replace function public.count_vendor_accounts_by_status(
  p_search text default null)
returns table (status text, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.has_permission('users.read') then perform public._forbidden(); end if;

  if v_search is not null then
    v_search := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
    select p.status::text, count(*)
      from public.profiles p
      left join lateral (
        select v2.business_name
          from public.vendors v2
         where v2.owner_id = p.id and v2.deleted_at is null
         order by v2.created_at asc
         limit 1
      ) v on true
     where p.deleted_at is null
       and exists (
         select 1
           from public.user_roles ur
           join public.roles r on r.id = ur.role_id
          where ur.profile_id = p.id and r.key = 'vendor'
       )
       and (v_search is null
            or p.full_name ilike v_search escape '\'
            or p.email::text ilike v_search escape '\'
            or coalesce(p.phone, '') ilike v_search escape '\'
            or coalesce(v.business_name, '') ilike v_search escape '\')
     group by p.status;
end;
$$;

-- ---------------------------------------------------------------------
-- expire_vendor_suspensions — the half of a temporary suspension that Postgres
-- owns.
--
-- A suspension is enforced in two places: `profiles.status`, which the portal
-- gates read, and the GoTrue ban, which stops a token being minted at all.
-- `manage-vendor-account` sets the ban to expire at the same instant as
-- `suspended_until`, so GoTrue lifts its half unaided — but nothing would ever
-- move the profile back to `active`, and the gate would keep refusing an
-- account whose suspension ended weeks ago. This is what closes that.
--
-- Deliberately NOT modelled as "treat an expired suspension as active at read
-- time". That would leave the stored status permanently lying about the account,
-- and every future reader — an export, a report, a support query typed by hand —
-- would have to know to re-derive it. The sweep makes the row true instead.
--
-- Each lift is audited with a null actor: nobody performed it, and attributing
-- it to the admin who originally suspended would put an action in the log they
-- did not take.
-- ---------------------------------------------------------------------
create or replace function public.expire_vendor_suspensions()
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare v_count integer;
begin
  -- `due` is selected BEFORE the update, not derived from its RETURNING clause.
  -- RETURNING hands back post-update values, and the update nulls
  -- `suspended_until` — so reading the end date from it would record every
  -- expiry as having no end date, which is the one fact the audit row exists to
  -- carry. `for update` makes two overlapping sweeps safe: the second blocks,
  -- then finds the rows already active and does nothing.
  with due as (
    select p.id, p.suspended_until
      from public.profiles p
     where p.status = 'suspended'
       and p.suspended_until is not null
       and p.suspended_until <= now()
     for update
  ),
  lifted as (
    update public.profiles p
       set status            = 'active',
           suspended_until   = null,
           status_reason     = null,
           status_changed_at = now(),
           status_changed_by = null
      from due d
     where p.id = d.id
    returning p.id
  ),
  logged as (
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, after, occurred_at)
    select null,
           'vendor_account_suspension_expired',
           'profiles',
           d.id,
           jsonb_build_object('status', 'active', 'suspension_ended_at', d.suspended_until),
           now()
      from due d
    returning 1
  )
  select count(*)::int into v_count from logged;

  return coalesce(v_count, 0);
end;
$$;

-- ---------------------------------------------------------------------
-- list_blocked_accounts — replaces the 0802d version.
--
-- One predicate changes. `suspended_rows` selected `status = 'suspended'`
-- because that was the only way an admin could switch an account off; 0810a
-- added two more, and a page whose entire job is "who cannot sign in" would
-- have silently stopped listing every account blocked or deactivated after this
-- deploy.
--
-- `kind` stays 'suspended' for all three rather than gaining two new values.
-- The discriminator answers "did this expire on its own, or did a human do it",
-- which is what decides whether an operator waits or acts — and that answer is
-- the same for all three. Which one it is, is already carried precisely by
-- `account_status`, which the page renders. Two new `kind` values would have
-- meant a third filter option for a distinction the page already shows.
--
-- `state_since` now prefers `status_changed_at`: `updated_at` moves for any
-- edit to the row, so a suspended account whose phone number was corrected
-- looked like it had just been suspended.
-- ---------------------------------------------------------------------
create or replace function public.list_blocked_accounts(
  p_kind   text    default null,   -- 'locked_out' | 'suspended' | null = both
  p_role   text    default null,   -- 'client' | 'event_planner' | 'vendor' | 'admin' | null
  p_search text    default null,   -- matches email or full name
  p_limit  integer default 25,
  p_offset integer default 0
)
returns table (
  kind             text,
  profile_id       uuid,
  email            text,
  full_name        text,
  account_status   profile_status,
  role_keys        text[],
  portal           text,
  attempt_count    integer,
  first_attempt_at timestamptz,
  last_attempt_at  timestamptz,
  locked_until     timestamptz,
  state_since      timestamptz,
  last_ip          text,
  last_user_agent  text,
  last_country     text,
  total_count      bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit  integer := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.has_permission('security.access.read') then perform public._forbidden(); end if;

  -- ILIKE metacharacters in user input would silently widen the match, so they
  -- are escaped and the pattern is built here rather than by the caller.
  if v_search is not null then
    v_search := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  with cfg as (
    select greatest(coalesce((public.get_setting('portal_lockout_threshold') #>> '{}')::int, 5), 1)       as threshold,
           greatest(coalesce((public.get_setting('portal_lockout_window_minutes') #>> '{}')::int, 15), 1) as win
  ),
  bounds as (
    select threshold, win, now() - make_interval(mins => win) as since from cfg
  ),
  recent as (
    select a.* from public.portal_access_attempts a, bounds b
     where a.attempted_at >= b.since and a.email is not null
  ),
  last_ok as (
    select r.email, r.portal, max(r.attempted_at) as at
      from recent r where r.outcome = 'granted'
     group by r.email, r.portal
  ),
  counted as (
    select r.email,
           r.portal,
           count(*)::int                                as attempt_count,
           min(r.attempted_at)                          as first_at,
           max(r.attempted_at)                          as last_at,
           array_agg(r.attempted_at order by r.attempted_at) as stamps
      from recent r
      cross join bounds b
      left join last_ok s on s.email = r.email and s.portal = r.portal
     where r.outcome = 'denied'
       -- The gate and this page have to agree on what counts, or the page
       -- shows accounts as locked that can already sign in. Both defer to
       -- `_portal_denial_counts`, so there is one list and it lives in one
       -- place.
       and public._portal_denial_counts(r.reason)
       and r.attempted_at > coalesce(s.at, b.since)
     group by r.email, r.portal
  ),
  locked as (
    select c.email,
           c.portal,
           c.attempt_count,
           c.first_at,
           c.last_at,
           c.stamps[c.attempt_count - b.threshold + 1] + make_interval(mins => b.win) as locked_until
      from counted c cross join bounds b
     where c.attempt_count >= b.threshold
  ),
  -- The device/country shown is the most recent attempt for that pair, which is
  -- the one an admin is being asked about.
  latest as (
    select distinct on (a.email, a.portal)
           a.email, a.portal, a.ip_address, a.user_agent, a.country_code
      from public.portal_access_attempts a
      join locked l on l.email = a.email and l.portal = a.portal
     order by a.email, a.portal, a.attempted_at desc
  ),
  locked_rows as (
    select 'locked_out'::text          as kind,
           p.id                        as profile_id,
           l.email                     as email,
           p.full_name                 as full_name,
           p.status                    as account_status,
           l.portal::text              as portal,
           l.attempt_count             as attempt_count,
           l.first_at                  as first_attempt_at,
           l.last_at                   as last_attempt_at,
           l.locked_until              as locked_until,
           l.last_at                   as state_since,
           host(lt.ip_address)         as last_ip,
           lt.user_agent               as last_user_agent,
           lt.country_code             as last_country
      from locked l
      left join latest lt on lt.email = l.email and lt.portal = l.portal
      left join public.profiles p
             on lower(p.email::text) = l.email and p.deleted_at is null
  ),
  suspended_rows as (
    select 'suspended'::text,
           p.id,
           lower(p.email::text),
           p.full_name,
           p.status,
           null::text,
           null::int,
           null::timestamptz,
           null::timestamptz,
           null::timestamptz,
           coalesce(p.status_changed_at, p.updated_at),
           null::text,
           null::text,
           null::text
      from public.profiles p
     where p.status in ('suspended', 'deactivated', 'blocked')
       and p.deleted_at is null
  ),
  unioned as (
    select * from locked_rows
    union all
    select * from suspended_rows
  ),
  with_roles as (
    select u.*,
           coalesce(rr.keys, '{}'::text[]) as role_keys,
           coalesce(rr.admin, false)       as is_admin
      from unioned u
      left join lateral (
        select array_agg(ro.key order by ro.key) as keys, bool_or(ro.is_admin) as admin
          from public.user_roles ur
          join public.roles ro on ro.id = ur.role_id
         where ur.profile_id = u.profile_id
      ) rr on true
  )
  select w.kind,
         w.profile_id,
         w.email,
         w.full_name,
         w.account_status,
         w.role_keys,
         w.portal,
         w.attempt_count,
         w.first_attempt_at,
         w.last_attempt_at,
         w.locked_until,
         w.state_since,
         w.last_ip,
         w.last_user_agent,
         w.last_country,
         count(*) over () as total_count
    from with_roles w
   where (p_kind is null or w.kind = p_kind)
     and (
       p_role is null
       or (p_role = 'admin' and w.is_admin)
       or (p_role <> 'admin' and p_role = any(w.role_keys))
     )
     and (
       v_search is null
       or w.email ilike v_search escape '\'
       or coalesce(w.full_name, '') ilike v_search escape '\'
     )
   -- Locked first: it is the state that expires, so it is the one where acting
   -- promptly changes the outcome.
   order by w.kind asc, w.state_since desc nulls last, w.email asc
   limit v_limit offset v_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants. The two console reads are callable by any signed-in session — the
-- permission check is inside them, so an unprivileged caller gets a refusal
-- rather than data. The expiry sweep is service_role only: it is a scheduled
-- job, and nothing about it should be reachable from a browser.
-- ---------------------------------------------------------------------
grant execute on function
  public.search_vendor_accounts(text, text, text, text, integer, integer),
  public.count_vendor_accounts_by_status(text)
to authenticated;

revoke execute on function public.expire_vendor_suspensions()
from public, anon, authenticated;
grant execute on function public.expire_vendor_suspensions() to service_role;

-- ---------------------------------------------------------------------
-- Hourly sweep. Skipped cleanly when pg_cron is absent (local dev), mirroring
-- 0016_cron.sql.
--
-- Hourly, not per-minute: a suspension is measured in days, and an account
-- coming back up to an hour after its stated time is not a defect worth a
-- wake-up every sixty seconds. An admin who needs it back sooner reactivates it
-- by hand, which is instant.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping vendor suspension expiry schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_suspension_expiry';

  perform cron.schedule('sinnapi_suspension_expiry', '20 * * * *', $f$
    select public.expire_vendor_suspensions();
  $f$);
end$$;
