-- =====================================================================
-- Sinnapi — 0802 Portal access control
--
-- THE DEFECT THIS CLOSES
-- All three portals (client / vendor / admin) authenticate against the same
-- Supabase project with the same anon key, and each one's sign-in did nothing
-- but `signInWithPassword` + "did I get a session?". Any account that could
-- authenticate could therefore open ANY portal shell — admin credentials typed
-- into the client portal signed in successfully. RLS still refused the data
-- (every admin policy goes through `has_permission()` / `is_admin()`), so this
-- was not a data breach; it was a missing portal boundary, and it meant admin
-- credentials were being typed into a public, client-facing login form.
--
-- THE MODEL — STRICT SEPARATION
-- An account holding ANY `roles.is_admin` role is staff. Staff may open the
-- admin portal and nothing else; a staff member who also wants to plan an event
-- uses a separate personal account. Conversely a client/vendor account can
-- never open the admin portal. This is deliberate: it keeps the blast radius of
-- a phished credential inside one portal, and it means the credential typed
-- into a public login form is never a credential that can move money.
--
--   client portal : role in (client, event_planner)  AND NOT staff
--   vendor portal : role vendor                      AND NOT staff
--   admin portal  : any is_admin role
--
-- A vendor legitimately holds BOTH `vendor` and `client` (that is what
-- `approve_vendor` grants when it promotes an existing client), so the same
-- credentials open the client and vendor portals. That is intended and is the
-- one cross-portal case the model allows.
--
-- All three additionally require `profiles.status = 'active'` and a live (not
-- soft-deleted) profile, so suspending an account now actually locks it out —
-- previously `profiles.status` was decorative at sign-in.
--
-- WHAT THIS FILE PROVIDES
--   * portal_access_client() / _vendor() / _admin()  — three independent, pure
--     entry points, one per app, each answering only "may the CURRENT session
--     be in MY portal?". They share one private evaluator so the three rules
--     cannot silently drift apart.
--   * log_portal_attempt() / portal_lockout_active() — service_role-only, used
--     by the `portal-sign-in` Edge Function, which is the single audited
--     chokepoint for password sign-in across all three portals.
--   * portal_access_attempts — the forensic trail and the lockout counter.
--
-- WHY THE DECISION IS NOT RETURNED AS A MESSAGE
-- `deny_reason` is a machine code for operators; it is written to
-- portal_access_attempts and MUST NOT be rendered to the user. Every refusal —
-- wrong password, unknown email, suspended account, staff account in the client
-- portal, locked out — surfaces as the identical "Invalid email or password."
-- An attacker holding a leaked admin credential learns nothing from the client
-- portal about whether that credential is valid, or that it is privileged.
--
-- HONEST LIMIT
-- These functions run AFTER GoTrue has verified a password, so they cannot be
-- the only defence: the anon key is public, and anyone can call
-- `signInWithPassword` directly and hold a JWT. That is why this is layered —
-- the Edge Function stops a token ever reaching an ineligible browser on the
-- normal path, these RPCs re-check on every session restore and eject, and RLS
-- remains the actual data boundary underneath both.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Portal identity
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'portal_app') then
    create type portal_app as enum ('client','vendor','admin');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- portal_access_attempts
-- One row per password sign-in decision, written by the Edge Function via
-- `log_portal_attempt` — including attempts that never produced a session
-- (unknown email, wrong password). Those rows are the whole point: a failed
-- password never reaches an `auth.uid()`-scoped RPC, so the DB would otherwise
-- be blind to exactly the traffic worth counting.
--
-- `email` is NOT a foreign key — an attempt against an address with no account
-- is still evidence. It is plain `text` holding an already-lower-cased address,
-- rather than the `citext` used elsewhere in the schema: every function here
-- runs with `search_path = public`, and `citext` may live in the `extensions`
-- schema, so an unqualified `::citext` cast would fail to resolve at runtime.
-- `portal_lockout_active` is on the critical path of every single sign-in, so
-- that failure would not be a degraded lookup — it would be a total auth
-- outage. Case-insensitivity is done explicitly with `lower()` on both the read
-- and the write instead, which depends on nothing.
-- ---------------------------------------------------------------------
create table if not exists public.portal_access_attempts (
  id           uuid primary key default gen_random_uuid(),
  portal       portal_app not null,
  email        text,
  profile_id   uuid references public.profiles(id) on delete set null,
  outcome      text not null check (outcome in ('granted','denied')),
  reason       text,
  ip_address   inet,
  user_agent   text,
  attempted_at timestamptz not null default now()
);

-- Serves the lockout counter (email + portal, newest first).
create index if not exists ix_portal_attempts_email_portal
  on public.portal_access_attempts(email, portal, attempted_at desc);
-- Serves "show me this account's sign-in history" in the admin portal.
create index if not exists ix_portal_attempts_profile
  on public.portal_access_attempts(profile_id, attempted_at desc);
-- Serves the retention purge and any time-ranged operator query.
create index if not exists ix_portal_attempts_time
  on public.portal_access_attempts(attempted_at desc);

-- This table is created after 0011_rls.sql's "enable RLS on everything" loop,
-- so it must arm its own. Read is audit-grade; there is deliberately NO insert,
-- update or delete policy — only service_role (which bypasses RLS) writes here,
-- so the trail cannot be edited from a portal even by a super admin.
alter table public.portal_access_attempts enable row level security;

drop policy if exists portal_attempts_read on public.portal_access_attempts;
create policy portal_attempts_read on public.portal_access_attempts
  for select to authenticated
  using (public.has_permission('audit.read'));

-- ---------------------------------------------------------------------
-- Tunables. Operators change lockout behaviour without a deploy, and the
-- defaults below apply if a row is ever missing.
-- ---------------------------------------------------------------------
insert into public.platform_settings(key, value, data_type, description) values
  ('portal_lockout_threshold', '5'::jsonb, 'number',
   'Denied portal sign-in attempts (per email+portal, since the last success) before lockout'),
  ('portal_lockout_window_minutes', '15'::jsonb, 'number',
   'Sliding window for the lockout counter; doubles as the cooldown, since attempts age out of it'),
  ('portal_attempt_retention_days', '90'::jsonb, 'number',
   'How long portal_access_attempts rows are kept before the nightly purge removes them')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- _evaluate_portal_access — the single source of truth for the rules above.
--
-- Private on purpose: it takes an arbitrary profile id, so exposing it would
-- let any signed-in user enumerate other accounts' portal eligibility (and
-- therefore who is staff). The three public wrappers below can only ever ask
-- about `auth.uid()`.
--
-- Returns exactly one row. `deny_reason` is null iff `allowed`.
-- ---------------------------------------------------------------------
create or replace function public._evaluate_portal_access(
  p_profile_id uuid,
  p_portal     portal_app
)
returns table (
  allowed        boolean,
  deny_reason    text,
  role_keys      text[],
  full_name      text,
  account_status profile_status
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_profile  public.profiles;
  v_roles    text[];
  v_is_staff boolean;
  v_reason   text;
begin
  if p_profile_id is null then
    return query select false, 'no_session'::text, '{}'::text[], null::text, null::profile_status;
    return;
  end if;

  select * into v_profile from public.profiles p where p.id = p_profile_id;

  -- Account state gates first: they apply to every portal, and an inactive
  -- account should never have its roles inspected at all.
  if v_profile.id is null then
    v_reason := 'no_profile';
  elsif v_profile.deleted_at is not null then
    v_reason := 'profile_deleted';
  elsif v_profile.status <> 'active' then
    -- profile_suspended / profile_pending
    v_reason := 'profile_' || v_profile.status::text;
  end if;

  select coalesce(array_agg(r.key order by r.key), '{}'::text[]),
         coalesce(bool_or(r.is_admin), false)
    into v_roles, v_is_staff
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
   where ur.profile_id = p_profile_id;

  if v_reason is null then
    case p_portal
      when 'admin' then
        -- Staff only. Holding a client/vendor role alongside is irrelevant here:
        -- what the admin portal needs is an is_admin role, and nothing else.
        if not v_is_staff then
          v_reason := 'not_staff';
        end if;

      when 'client' then
        -- Strict separation: staff are refused even when the account also holds
        -- a client role. Checked BEFORE the role test so a staff account never
        -- passes on the strength of an incidental client grant.
        if v_is_staff then
          v_reason := 'staff_account_in_user_portal';
        elsif not (v_roles && array['client','event_planner']::text[]) then
          v_reason := 'missing_client_role';
        end if;

      when 'vendor' then
        if v_is_staff then
          v_reason := 'staff_account_in_user_portal';
        elsif not ('vendor' = any(v_roles)) then
          -- Vendors are provisioned by `approve_vendor` / promote-intake; there
          -- is no self-service path to this role, by design.
          v_reason := 'missing_vendor_role';
        end if;

      else
        -- Unreachable through the three wrappers, and a bare CASE would raise
        -- CASE_NOT_FOUND on a null portal. Refusing is the only safe answer to
        -- "which portal?" when we do not know.
        v_reason := 'unknown_portal';
    end case;
  end if;

  return query select
    v_reason is null,
    v_reason,
    v_roles,
    v_profile.full_name,
    v_profile.status;
end;
$$;

-- ---------------------------------------------------------------------
-- The three per-app entry points.
--
-- Independent by design: each portal calls only its own, so a portal can never
-- accidentally ask the wrong question, and the admin portal's rule can be
-- tightened later without touching the two public portals. They are pure reads
-- — safe to call on every session restore and token refresh, which is exactly
-- how the SPAs use them.
-- ---------------------------------------------------------------------
create or replace function public.portal_access_client()
returns table (
  allowed        boolean,
  deny_reason    text,
  role_keys      text[],
  full_name      text,
  account_status profile_status
)
language sql stable security definer set search_path = public
as $$ select * from public._evaluate_portal_access(auth.uid(), 'client'::portal_app); $$;

create or replace function public.portal_access_vendor()
returns table (
  allowed        boolean,
  deny_reason    text,
  role_keys      text[],
  full_name      text,
  account_status profile_status
)
language sql stable security definer set search_path = public
as $$ select * from public._evaluate_portal_access(auth.uid(), 'vendor'::portal_app); $$;

create or replace function public.portal_access_admin()
returns table (
  allowed        boolean,
  deny_reason    text,
  role_keys      text[],
  full_name      text,
  account_status profile_status
)
language sql stable security definer set search_path = public
as $$ select * from public._evaluate_portal_access(auth.uid(), 'admin'::portal_app); $$;

-- ---------------------------------------------------------------------
-- portal_lockout_active — brute-force / credential-stuffing brake.
--
-- Counts denials for this email+portal since the LAST SUCCESS inside the
-- window, so a user who fumbles their password four times, succeeds, then
-- fumbles once more is not locked out by stale failures. Sliding window, so it
-- doubles as the cooldown: attempts simply age out.
--
-- Keyed on the submitted email rather than the profile, because the attempts
-- worth throttling are precisely the ones that never resolve to an account.
--
-- Refusals that were themselves caused by the lock (`reason = 'locked_out'`) are
-- excluded from the count. They are still recorded — an attacker hammering a
-- locked account is exactly what an operator wants to see — but counting them
-- would let each rejected attempt push the window forward, so anyone who knew a
-- staff member's address could keep them locked out indefinitely just by
-- retrying. Ignoring them gives the lock a definite expiry: stop for the window
-- and it lifts, whatever the attacker is doing in the meantime.
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
  -- Normalised the same way `log_portal_attempt` normalises on the way in, so
  -- the counter cannot be sidestepped by varying the capitalisation.
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
     and a.reason is distinct from 'locked_out'
     and a.attempted_at > coalesce(v_last_success, v_since);

  return v_denials >= greatest(v_threshold, 1);
end;
$$;

-- ---------------------------------------------------------------------
-- log_portal_attempt — the only writer of the trail.
--
-- Also stamps `profiles.last_login_at` on a granted attempt: the column has
-- existed since 0003 and nothing has ever set it, so "when did this account
-- last actually get in" was unanswerable.
--
-- `p_ip` arrives as a raw X-Forwarded-For, which is a comma-separated list and
-- can be junk; the first hop is taken and a bad value degrades to null rather
-- than aborting the sign-in — losing an IP must never cost a user their login.
-- ---------------------------------------------------------------------
create or replace function public.log_portal_attempt(
  p_portal     text,
  p_email      text default null,
  p_profile_id uuid default null,
  p_outcome    text default 'denied',
  p_reason     text default null,
  p_ip         text default null,
  p_user_agent text default null
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
    portal, email, profile_id, outcome, reason, ip_address, user_agent)
  values (
    p_portal::portal_app,
    nullif(btrim(lower(coalesce(p_email, ''))), ''),
    p_profile_id,
    p_outcome,
    p_reason,
    v_ip,
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512));

  if p_outcome = 'granted' and p_profile_id is not null then
    update public.profiles set last_login_at = now() where id = p_profile_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Retention. The trail is security telemetry, not a permanent record, and it
-- grows with every sign-in — so it is purged on the same schedule discipline as
-- the rest of the platform's housekeeping.
-- ---------------------------------------------------------------------
create or replace function public.purge_portal_access_attempts()
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_days    integer := coalesce((public.get_setting('portal_attempt_retention_days') #>> '{}')::integer, 90);
  v_deleted integer;
begin
  delete from public.portal_access_attempts
   where attempted_at < now() - make_interval(days => greatest(v_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------
-- EXECUTE grants.
--
-- Postgres grants EXECUTE to PUBLIC on every new function, so each one below is
-- revoked first and then granted only to the role that must call it. Getting
-- this wrong would hand `anon` a way to probe accounts or forge the audit
-- trail, so it is spelled out per function rather than done in bulk.
-- ---------------------------------------------------------------------

-- Private evaluator + the service-role surface: never callable from a browser.
revoke execute on function
  public._evaluate_portal_access(uuid, portal_app),
  public.portal_lockout_active(text, text),
  public.log_portal_attempt(text, text, uuid, text, text, text, text),
  public.purge_portal_access_attempts()
from public, anon, authenticated;

grant execute on function
  public.portal_lockout_active(text, text),
  public.log_portal_attempt(text, text, uuid, text, text, text, text),
  public.purge_portal_access_attempts()
to service_role;

-- The three portal gates: a signed-in user may ask about their own session,
-- and only about their own. `anon` has nothing to ask.
revoke execute on function
  public.portal_access_client(),
  public.portal_access_vendor(),
  public.portal_access_admin()
from public, anon;

grant execute on function
  public.portal_access_client(),
  public.portal_access_vendor(),
  public.portal_access_admin()
to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Nightly purge. Skipped cleanly when pg_cron is not installed (local dev),
-- mirroring 0016_cron.sql.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping portal attempt purge schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_portal_attempt_purge';

  perform cron.schedule('sinnapi_portal_attempt_purge', '30 3 * * *', $f$
    select public.purge_portal_access_attempts();
  $f$);
end$$;
