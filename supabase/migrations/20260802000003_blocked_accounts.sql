-- =====================================================================
-- Sinnapi — 0802c Blocked accounts: the admin view over access control
--
-- WHAT THIS IS FOR
-- Two migrations back, sign-in gained a lockout and an attempt trail. Both were
-- write-only: nothing in the product could read them, so "I can't sign in" had
-- no answer an admin could look up, and a credential-stuffing run against the
-- platform was visible only to whoever thought to query the table by hand.
-- This adds the read side — one aggregate the admin portal's Blocked Accounts
-- page is built on — plus the two actions that resolve a block.
--
-- "BLOCKED" IS TWO DIFFERENT THINGS
-- An account can be unable to sign in because the rate limiter locked it (a
-- transient, self-healing state derived from `portal_access_attempts`) or
-- because an admin suspended it (a durable state on `profiles`). They have
-- almost nothing in common — the first has attempt counts, devices and
-- countries behind it and expires on its own; the second has none of that and
-- expires never — so `list_blocked_accounts` returns them as one shape with a
-- `kind` discriminator rather than pretending they are the same row.
--
-- Locked rows with no matching profile are included on purpose. An address
-- hammered five times that resolves to no account is not a user who needs help,
-- it is an attack in progress, and hiding it would blind the one page built to
-- notice.
--
-- DATA PROTECTION
-- IP, user agent and country are personal data processed under legitimate
-- interest (Art. 6(1)(f)) for detecting unauthorised access — no consent, but
-- minimisation and transparency still bind:
--
--   * Country only, never city. `cf-ipcountry` is free, needs no third-party
--     lookup, and answers "is this login from somewhere unexpected?" without
--     resolving anyone to a neighbourhood.
--   * Reading is gated on its own permission (`security.access.read`), so
--     device and location history can be granted separately from the rest of
--     the console rather than riding along with `audit.read`.
--   * An admin revealing a full IP is itself processing, so it is logged —
--     see `log_security_access`.
--   * Rows still age out on the existing 90-day purge; nothing here retains
--     anything longer.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Country of origin, captured at sign-in from Cloudflare's `cf-ipcountry`.
--
-- Nullable and un-backfillable by design: rows written before this deploy have
-- no country and never will, since deriving one after the fact would mean
-- feeding stored IPs to a geolocation service — more processing, of older data,
-- for a column nobody needs historically.
-- ---------------------------------------------------------------------
alter table public.portal_access_attempts
  add column if not exists country_code text;

comment on column public.portal_access_attempts.country_code is
  'ISO-3166 alpha-2 from cf-ipcountry at request time. Null for rows captured before 0802c, or when the header is absent.';

-- `log_portal_attempt` gains the parameter. Recreated rather than altered:
-- Postgres has no "add a parameter" for functions, and the old 7-arg signature
-- is dropped below so no caller can keep writing rows with no country.
create or replace function public.log_portal_attempt(
  p_portal     text,
  p_email      text default null,
  p_profile_id uuid default null,
  p_outcome    text default 'denied',
  p_reason     text default null,
  p_ip         text default null,
  p_user_agent text default null,
  p_country    text default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_ip inet;
begin
  if p_outcome not in ('granted','denied') then
    raise exception 'invalid_outcome: %', p_outcome using errcode = '22023';
  end if;

  begin
    v_ip := nullif(btrim(split_part(coalesce(p_ip, ''), ',', 1)), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.portal_access_attempts(
    portal, email, profile_id, outcome, reason, ip_address, user_agent, country_code)
  values (
    p_portal::portal_app,
    nullif(btrim(lower(coalesce(p_email, ''))), ''),
    p_profile_id,
    p_outcome,
    p_reason,
    v_ip,
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512),
    -- Cloudflare sends 'XX'/'T1' for unknown and Tor; both are noise as a
    -- location, so they land as null rather than as a fake country.
    nullif(nullif(nullif(upper(btrim(coalesce(p_country, ''))), ''), 'XX'), 'T1'));

  if p_outcome = 'granted' and p_profile_id is not null then
    update public.profiles set last_login_at = now() where id = p_profile_id;
  end if;
end;
$$;

drop function if exists public.log_portal_attempt(text, text, uuid, text, text, text, text);

revoke execute on function
  public.log_portal_attempt(text, text, uuid, text, text, text, text, text)
from public, anon, authenticated;
grant execute on function
  public.log_portal_attempt(text, text, uuid, text, text, text, text, text)
to service_role;

-- ---------------------------------------------------------------------
-- A dedicated permission for the access trail.
--
-- Separate from `audit.read` because they answer to different needs: the audit
-- log is a record of what staff did, this is a record of where and on what
-- device users signed in from. Someone reviewing admin actions does not
-- automatically need the second, and keeping them apart is what lets you grant
-- one without the other.
-- ---------------------------------------------------------------------
insert into public.permissions(key, category, description) values
  ('security.access.read', 'system', 'View blocked accounts and sign-in access history')
on conflict (key) do nothing;

-- Super Admin's blanket grant in 0012 was a one-off cross join, so every
-- permission added later has to be granted explicitly.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.key = 'security.access.read'
where r.key in ('super_admin','compliance','support')
on conflict do nothing;

-- Reading raw attempt rows now answers to either permission: `audit.read` kept
-- so nothing that works today breaks, plus the new key for staff granted the
-- security view alone.
drop policy if exists portal_attempts_read on public.portal_access_attempts;
create policy portal_attempts_read on public.portal_access_attempts
  for select to authenticated
  using (
    public.has_permission('audit.read')
    or public.has_permission('security.access.read')
  );

-- ---------------------------------------------------------------------
-- portal_lockout_active — replaces the 0802a version.
--
-- The only change is the exclusion list. 0802a skipped refusals caused by the
-- lock itself (`locked_out`); it now also skips `cleared_by_admin`, which is
-- the marker `clear_portal_lockout` writes below.
--
-- Without this the admin action would be inert: it rewrites the reason on the
-- denial rows, but `is distinct from 'locked_out'` is still TRUE for any other
-- reason, so every cleared row would keep counting and the account would stay
-- locked with an admin watching a button that appeared to work. The two
-- functions have to agree on what "counts" or the feature is a lie.
-- ---------------------------------------------------------------------
create or replace function public.portal_lockout_active(p_email text, p_portal text)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_threshold    integer := coalesce((public.get_setting('portal_lockout_threshold')      #>> '{}')::integer, 5);
  v_window       integer := coalesce((public.get_setting('portal_lockout_window_minutes') #>> '{}')::integer, 15);
  v_since        timestamptz;
  v_last_success timestamptz;
  v_denials      integer;
  v_portal       portal_app;
  v_email        text;
begin
  if p_email is null or btrim(p_email) = '' then return false; end if;
  v_email  := lower(btrim(p_email));
  v_portal := p_portal::portal_app;
  v_since  := now() - make_interval(mins => greatest(v_window, 1));

  select max(a.attempted_at) into v_last_success
    from public.portal_access_attempts a
   where a.email = v_email
     and a.portal = v_portal
     and a.outcome = 'granted'
     and a.attempted_at >= v_since;

  select count(*) into v_denials
    from public.portal_access_attempts a
   where a.email = v_email
     and a.portal = v_portal
     and a.outcome = 'denied'
     and coalesce(a.reason, '') not in ('locked_out', 'cleared_by_admin')
     and a.attempted_at > coalesce(v_last_success, v_since);

  return v_denials >= greatest(v_threshold, 1);
end;
$$;

revoke execute on function public.portal_lockout_active(text, text) from public, anon, authenticated;
grant execute on function public.portal_lockout_active(text, text) to service_role;

-- ---------------------------------------------------------------------
-- list_blocked_accounts
--
-- One page of "cannot currently sign in", from both sources, with the exact
-- total so the caller can paginate in a single round trip (the `total_count`
-- window convention from 0717).
--
-- The lockout half re-derives exactly what `portal_lockout_active` enforces —
-- denials since the last success inside the sliding window, ignoring refusals
-- caused by the lock itself. It has to: a page that disagreed with the gate
-- about who is locked would send support chasing accounts that are fine, and
-- miss the ones that aren't.
--
-- `locked_until` is computed, not stored. Under a sliding window the lock lifts
-- when the count falls below the threshold, which happens as the (n-threshold+1)th
-- oldest denial ages out — so that stamp plus the window is the moment they can
-- try again. Without it an admin has no way to tell a lock that expires in two
-- minutes from one that expires in fourteen.
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
       -- Same exclusion list as `portal_lockout_active`, and it has to stay the
       -- same: a page that counted rows the gate ignores would show accounts as
       -- locked that can already sign in.
       and coalesce(r.reason, '') not in ('locked_out', 'cleared_by_admin')
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
           p.updated_at,
           null::text,
           null::text,
           null::text
      from public.profiles p
     where p.status = 'suspended' and p.deleted_at is null
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
-- clear_portal_lockout — the only action that actually unblocks a lock.
--
-- Worth being explicit about why this exists as its own operation: a password
-- reset does NOT clear a lockout. The lock counts denied attempts, and mailing
-- somebody a reset link adds none and removes none — an admin who "unblocked"
-- an account that way would watch it stay blocked. This is what lifts it.
--
-- Implemented as a reason rewrite rather than a delete: the attempts still
-- happened, and a security trail that an admin can erase is not a trail. The
-- rows stay, marked as cleared, and stop counting because `portal_lockout_active`
-- and `list_blocked_accounts` both ignore any reason other than a real denial.
-- ---------------------------------------------------------------------
create or replace function public.clear_portal_lockout(p_email text, p_portal text)
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_email   text := nullif(btrim(lower(coalesce(p_email, ''))), '');
  v_cleared integer;
begin
  if not public.has_permission('users.manage') then perform public._forbidden(); end if;
  if v_email is null then raise exception 'invalid_email' using errcode = '22023'; end if;

  update public.portal_access_attempts
     set reason = 'cleared_by_admin'
   where email = v_email
     and portal = p_portal::portal_app
     and outcome = 'denied'
     and reason is distinct from 'cleared_by_admin';
  get diagnostics v_cleared = row_count;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after, occurred_at)
  values (
    auth.uid(),
    'clear_portal_lockout',
    'portal_access_attempts',
    null,
    jsonb_build_object('email', v_email, 'portal', p_portal, 'attempts_cleared', v_cleared),
    now());

  return v_cleared;
end;
$$;

-- ---------------------------------------------------------------------
-- log_security_access — access transparency for the page itself.
--
-- Reading someone's device and location history is processing personal data,
-- and an admin doing it leaves no trace otherwise. This is what makes that
-- reviewable: who looked, at whose record, and when.
--
-- Deliberately not a trigger on SELECT (there is no such thing) and deliberately
-- called by the client rather than inside `list_blocked_accounts`, because the
-- events worth recording are the deliberate ones — opening the page, revealing
-- a full IP — not every re-render or pagination click.
-- ---------------------------------------------------------------------
create or replace function public.log_security_access(
  p_action  text,
  p_subject text default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if not public.has_permission('security.access.read') then perform public._forbidden(); end if;
  if p_action not in ('view_blocked_accounts','reveal_ip_address') then
    raise exception 'invalid_action: %', p_action using errcode = '22023';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, after, occurred_at)
  values (
    auth.uid(),
    p_action,
    'portal_access_attempts',
    null,
    case when p_subject is null then null
         else jsonb_build_object('subject', lower(btrim(p_subject))) end,
    now());
end;
$$;

-- ---------------------------------------------------------------------
-- EXECUTE grants. Each function re-checks its own permission, so `authenticated`
-- is the right grant — the gate is inside, not on the door.
-- ---------------------------------------------------------------------
revoke execute on function
  public.list_blocked_accounts(text, text, text, integer, integer),
  public.clear_portal_lockout(text, text),
  public.log_security_access(text, text)
from public, anon;

grant execute on function
  public.list_blocked_accounts(text, text, text, integer, integer),
  public.clear_portal_lockout(text, text),
  public.log_security_access(text, text)
to authenticated, service_role;
