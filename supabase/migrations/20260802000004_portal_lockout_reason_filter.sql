-- =====================================================================
-- Sinnapi — 0802d Lockout counts credential verdicts only
--
-- THE DEFECT THIS CLOSES
-- `portal_lockout_active` counted every denial row for an email+portal except
-- the two markers it knew about (`locked_out`, `cleared_by_admin`). But
-- `portal-sign-in` writes denial rows for refusals that never examined a
-- password:
--
--   captcha:<code>        the Turnstile token was missing, spent or invalid
--   malformed_submission  no address, or no password, in the body
--   unavailable:<code>    GoTrue or the gate was unreachable / misconfigured
--
-- Counting those inverts what the lockout is for.
--
--   * DENIAL OF SERVICE. The first two need no account, no password and no
--     solved challenge — a token-less POST produces `captcha:missing-input-
--     response` and is refused, but the row lands anyway. Five of them against
--     a known address locked its owner out of that portal for the window, and
--     the attacker could repeat it indefinitely, from anywhere, for free.
--     `portal-sign-in` now verifies the challenge before it records anything,
--     which closes the hole for new rows; this makes the counter itself
--     indifferent to them, so neither half depends on the other being perfect.
--
--   * SELF-INFLICTED OUTAGE. `unavailable:*` rows mean OUR side failed. Under
--     the old counter a GoTrue blip did not just fail five sign-ins, it then
--     locked those accounts out for fifteen minutes after service returned.
--
-- What remains counted is exactly what the brake was built for: a password
-- tested against an account and refused (`bad_credentials*`,
-- `email_not_confirmed`), and an account that authenticated but does not belong
-- in the portal it asked for (`not_staff`, `missing_client_role`,
-- `staff_account_in_user_portal`, `profile_suspended`, …). Those are attempts
-- against a real account by someone who had to get that far.
--
-- The rule lives in `_portal_denial_counts` rather than being spelled out in
-- each query, because it is now a two-part rule with prefixes, and the gate and
-- the admin page must never disagree about it — 0802c already had to fix that
-- exact class of drift once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Does this denial reason represent a real credential verdict?
--
-- IMMUTABLE and STRICT-ish by hand: it is pure text inspection, so the planner
-- may inline it into the scans below. A null reason counts — an unlabelled
-- denial is old data or a caller that forgot to say why, and the safe reading
-- of "we refused someone and did not record why" is that it was a refusal.
-- ---------------------------------------------------------------------
create or replace function public._portal_denial_counts(p_reason text)
returns boolean
language sql immutable parallel safe
as $$
  select coalesce(p_reason, '') not in ('locked_out', 'cleared_by_admin')
     and coalesce(p_reason, '') <> 'malformed_submission'
     and coalesce(p_reason, '') not like 'captcha:%'
     and coalesce(p_reason, '') not like 'unavailable:%';
$$;

comment on function public._portal_denial_counts(text) is
  'True when a portal_access_attempts denial reason is a verdict about the account, and so belongs in the lockout tally. Shared by portal_lockout_active and list_blocked_accounts.';

-- ---------------------------------------------------------------------
-- portal_lockout_active — replaces the 0802c version. The counting window,
-- threshold and "since the last success" semantics are unchanged; only the
-- exclusion predicate moves out into the function above.
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
     and public._portal_denial_counts(a.reason)
     and a.attempted_at > coalesce(v_last_success, v_since);

  return v_denials >= greatest(v_threshold, 1);
end;
$$;

-- ---------------------------------------------------------------------
-- list_blocked_accounts — replaces the 0802c version. Byte-for-byte the same
-- apart from the one predicate, for the reason 0802c gives: a page that counts
-- rows the gate ignores shows accounts as locked that can already sign in.
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
       -- shows accounts as locked that can already sign in. Both now defer to
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
-- EXECUTE grants. `create or replace` keeps the existing ACL, but these are
-- restated rather than assumed: the whole point of this file is that the two
-- readers of the trail must not drift, and a grant that is implied is a grant
-- nobody checks.
-- ---------------------------------------------------------------------
-- The helper is called only from inside the two SECURITY DEFINER functions
-- above, which run as the owner — so nothing outside needs it, and a predicate
-- that decides what counts as a failed login is not something to leave callable
-- from a browser.
revoke execute on function
  public._portal_denial_counts(text),
  public.portal_lockout_active(text, text)
from public, anon, authenticated;

revoke execute on function
  public.list_blocked_accounts(text, text, text, integer, integer)
from public, anon;

grant execute on function public.portal_lockout_active(text, text) to service_role;
grant execute on function
  public.list_blocked_accounts(text, text, text, integer, integer)
to authenticated, service_role;
