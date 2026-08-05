-- =====================================================================
-- Sinnapi — 0802e Authentication events in the audit trail
--
-- WHAT WAS MISSING
-- Three separate gaps, all of them the same gap seen from different angles:
--
--   1. `audit_logs` has carried `ip_address` and `user_agent` since 0009 and
--      NOTHING HAS EVER WRITTEN THEM. `tg_write_audit` does not set them, and
--      neither do the two explicit inserts in 0802c. Every row in the table has
--      both columns null, which is worse than not having them: the Audit page
--      looks like it answers "where from?" and silently never does.
--   2. Authentication is absent from `audit_logs` entirely. Sign-in decisions
--      live in `portal_access_attempts`, signup and confirmation mail in
--      `signup_attempts`, and an admin reading the audit trail sees every row a
--      user touched but never the sign-in that let them touch it.
--   3. Signing out was invisible everywhere. The portals call
--      `supabase.auth.signOut()` in the browser and no server code runs at all,
--      so "when did this session end" had no answer — not in the audit trail,
--      not in the attempt trail, nowhere.
--
-- WHY A TRIGGER COULD NOT HAVE FIXED (1)
-- A Postgres trigger sees no HTTP request. Supabase exposes the PostgREST one
-- through `current_setting('request.headers')`, which is enough for a browser
-- calling an RPC directly — and useless for anything an Edge Function writes,
-- because there the headers belong to the FUNCTION's call to PostgREST: the
-- user agent would read `supabase-js`, and the IP would be Supabase's own
-- infrastructure. So the request context has to be carried explicitly by the
-- caller that actually holds it. `log_portal_attempt` and `log_signup_attempt`
-- already took `p_ip` and `p_user_agent` for exactly this reason; they now take
-- the parsed device fields too, and `log_sign_out` — which IS called straight
-- from the browser — reads the header GUC itself.
--
-- ONE EVENT, TWO TABLES, ONE WRITER
-- Auth events land in both places, and the split is deliberate:
--
--   portal_access_attempts / signup_attempts — operational. They drive the
--     lockout counter and the signup throttles, they are queried per address on
--     the critical path of every sign-in, and they purge at 90 days.
--   audit_logs — the narrative. One row per event, joined to the actor, read by
--     the admin Audit page alongside everything else that happened.
--
-- Rather than making the Edge Functions write both (two round trips, and a
-- caller free to write one without the other), the existing log functions now
-- mirror into `audit_logs` themselves through `_auth_audit`. One call, one
-- transaction, and no way to record an attempt that the audit trail misses.
--
-- RETENTION — AND WHY AUTH ROWS NEEDED THEIR OWN RULE
-- `audit_logs` is a 7-year retention under legal hold (see 0012's
-- `data_retention_policies`), which is right for "who changed this payout" and
-- indefensible for "an unknown address failed to log in from this IP on a
-- device running Android 14". Storing every failed sign-in for seven years is
-- not the same processing as storing a financial change, so auth rows purge on
-- their own, shorter clock — 180 days by default, tunable, with its own
-- retention-policy row so the choice is visible where the others are.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Request context on the audit trail.
--
-- `ip_address` and `user_agent` already exist. What is added is the parsed
-- shape of the same user-agent string plus the country, so the trail can be
-- filtered and grouped in SQL — "every admin action from a device we have not
-- seen before", "sign-ins from outside the countries we operate in" — instead
-- of every consumer re-parsing a raw string it has to fetch first.
--
-- Parsed at WRITE time by the caller that received the header, never derived
-- here. A user-agent string is a museum of compatibility lies (every Chromium
-- browser claims to be Safari; iPadOS claims to be a Mac), so the parse lives
-- in one reviewed implementation per runtime and the raw string is kept
-- alongside it — if the parse is ever wrong, the evidence is still on the row.
-- ---------------------------------------------------------------------
alter table public.audit_logs
  add column if not exists device       text,
  add column if not exists os           text,
  add column if not exists browser      text,
  add column if not exists country_code text;

comment on column public.audit_logs.ip_address is
  'Caller IP, first hop of X-Forwarded-For. Null for rows written before 0802e and for anything with no HTTP request behind it (cron, triggers fired by other triggers).';
comment on column public.audit_logs.device is
  'Rough form factor parsed from the user agent: mobile | tablet | desktop | bot | unknown.';
comment on column public.audit_logs.os is
  'Operating system parsed from the user agent, e.g. "Windows 10/11", "iOS 17", "macOS".';
comment on column public.audit_logs.browser is
  'Browser parsed from the user agent, e.g. "Chrome 141". Null when the caller is not a browser.';
comment on column public.audit_logs.country_code is
  'ISO-3166 alpha-2 from cf-ipcountry at request time. Country granularity only, deliberately — see the data-protection note in 0802c.';

-- Auth rows are read as their own stream (newest first) by the purge and by any
-- "sign-in history" query, and they will soon outnumber entity changes. The
-- partial index keeps that scan off the main action index.
create index if not exists ix_audit_auth_events
  on public.audit_logs(occurred_at desc)
  where entity_type = 'auth';

-- `signup_attempts` gains the country its sibling table already had. Same
-- source, same granularity, same reasoning — it was simply missed in 0802b.
alter table public.signup_attempts
  add column if not exists country_code text;

-- ---------------------------------------------------------------------
-- _auth_audit — the single mirror into `audit_logs` for authentication.
--
-- Private: it writes an append-only trail with an arbitrary actor id, so the
-- only callers are the three logging functions below, all of which establish
-- who the actor actually is before they call it.
--
-- `actor_id` is null whenever the event cannot be attributed to a real profile
-- — an unknown address, a wrong password, a signup for an account that does not
-- exist yet. That is not a defect in the row: the attempted address is on it,
-- in `after`, and inventing an actor for an attempt that never authenticated
-- would be a lie the Audit page would then render as a person.
--
-- The detail goes in `after` because that is what the existing readers already
-- render: `tg_write_audit` puts the post-change snapshot there, `clear_portal_lockout`
-- in 0802c puts an action payload there, and the audit drawer shows it either
-- way. A new column per auth attribute would be invisible to all of them.
--
-- Never raises. This is telemetry hanging off the side of a sign-in; a failure
-- to describe an event must not become a failure to perform it.
-- ---------------------------------------------------------------------
create or replace function public._auth_audit(
  p_action     text,
  p_actor_id   uuid    default null,
  p_email      text    default null,
  p_portal     text    default null,
  p_outcome    text    default null,
  p_reason     text    default null,
  p_ip         inet    default null,
  p_user_agent text    default null,
  p_device     text    default null,
  p_os         text    default null,
  p_browser    text    default null,
  p_country    text    default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  insert into public.audit_logs(
    actor_id, action, entity_type, entity_id, before, after,
    ip_address, user_agent, device, os, browser, country_code, occurred_at)
  values (
    p_actor_id,
    p_action,
    'auth',
    -- The subject of an auth event is the account itself, so the entity is the
    -- profile when we know it. Unknown for a failed attempt, by definition.
    p_actor_id,
    null,
    -- Nulls are stripped so the drawer does not render a wall of empty fields
    -- on the rows that carry the least detail.
    jsonb_strip_nulls(jsonb_build_object(
      'email',   nullif(btrim(lower(coalesce(p_email, ''))), ''),
      'portal',  p_portal,
      'outcome', p_outcome,
      'reason',  p_reason,
      'device',  p_device,
      'os',      p_os,
      'browser', p_browser,
      'country', p_country
    )),
    p_ip,
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512),
    p_device,
    p_os,
    p_browser,
    p_country,
    now());
exception when others then
  -- Loud, and swallowed. The attempt row is the one that must land.
  raise warning 'auth_audit_failed action=% sqlstate=%', p_action, sqlstate;
end;
$$;

-- ---------------------------------------------------------------------
-- Normalisers shared by every writer below.
--
-- `_clean_device` exists because one caller — `log_sign_out` — is reached
-- directly from a browser, so its device/os/browser arguments are user input.
-- The user agent they were parsed from is user input too, so nothing is lost by
-- trusting them; what is not acceptable is letting an arbitrary string into a
-- column the admin UI groups and filters on. The form factor is therefore
-- clamped to the five values the parsers can produce, and the free-text fields
-- are length-capped.
-- ---------------------------------------------------------------------
create or replace function public._clean_device(p_device text)
returns text
language sql immutable parallel safe
as $$
  select case
    when lower(btrim(coalesce(p_device, ''))) in ('mobile','tablet','desktop','bot','unknown')
      then lower(btrim(p_device))
    else null
  end;
$$;

create or replace function public._clean_ua_field(p_value text)
returns text
language sql immutable parallel safe
as $$ select left(nullif(btrim(coalesce(p_value, '')), ''), 60); $$;

-- ---------------------------------------------------------------------
-- log_portal_attempt — replaces the 0802c version.
--
-- Same contract as before plus the three parsed device fields, and it now
-- mirrors every decision into `audit_logs`. Recreated rather than altered:
-- Postgres has no "add a parameter", and the old 8-arg signature is dropped
-- below so no caller can keep writing rows with no device context.
--
-- The action names are deliberately outside the `${op}_${table}` shape the
-- audit trigger generates — `login_succeeded`, not `insert_portal_access_attempts`
-- — because they are not table changes. The admin portal's `operationOf` falls
-- through to its `other` bucket for these and titleises the action, which reads
-- correctly with no UI change: "Login Succeeded", "Login Failed".
-- ---------------------------------------------------------------------
create or replace function public.log_portal_attempt(
  p_portal     text,
  p_email      text default null,
  p_profile_id uuid default null,
  p_outcome    text default 'denied',
  p_reason     text default null,
  p_ip         text default null,
  p_user_agent text default null,
  p_country    text default null,
  p_device     text default null,
  p_os         text default null,
  p_browser    text default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_ip      inet;
  v_country text;
  v_device  text := public._clean_device(p_device);
  v_os      text := public._clean_ua_field(p_os);
  v_browser text := public._clean_ua_field(p_browser);
  v_email   text := nullif(btrim(lower(coalesce(p_email, ''))), '');
  v_ua      text := left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512);
  v_profile uuid;
begin
  if p_outcome not in ('granted','denied') then
    raise exception 'invalid_outcome: %', p_outcome using errcode = '22023';
  end if;

  -- Both `portal_access_attempts.profile_id` and `audit_logs.actor_id` are
  -- foreign keys to `profiles`, and the caller passes the id from the JWT — an
  -- `auth.users` id, which is USUALLY also a profile id and is not one in the
  -- exact case this trail most needs to record. `portal_access_client()` returns
  -- `no_profile` for an auth user whose profile row is missing (a failed
  -- `handle_new_user`, a manually deleted profile), and `portal-sign-in` then
  -- logs the refusal with that same id. Passing it straight through raises a FK
  -- violation, so the one event that says "this account is broken" is the one
  -- event that never gets written. Resolved to null instead: the row lands, the
  -- reason is on it, and the address identifies the account.
  if p_profile_id is not null then
    select p.id into v_profile from public.profiles p where p.id = p_profile_id;
  end if;

  begin
    v_ip := nullif(btrim(split_part(coalesce(p_ip, ''), ',', 1)), '')::inet;
  exception when others then
    v_ip := null;
  end;

  -- 'XX' and 'T1' are Cloudflare's "unknown" and "Tor exit node" — neither is a
  -- location, so they land as null rather than as a fake country.
  v_country := nullif(nullif(nullif(upper(btrim(coalesce(p_country, ''))), ''), 'XX'), 'T1');

  insert into public.portal_access_attempts(
    portal, email, profile_id, outcome, reason, ip_address, user_agent, country_code)
  values (
    p_portal::portal_app, v_email, v_profile, p_outcome, p_reason, v_ip, v_ua, v_country);

  if p_outcome = 'granted' and v_profile is not null then
    update public.profiles set last_login_at = now() where id = v_profile;
  end if;

  perform public._auth_audit(
    p_action     => case when p_outcome = 'granted' then 'login_succeeded' else 'login_failed' end,
    p_actor_id   => v_profile,
    p_email      => v_email,
    p_portal     => p_portal,
    p_outcome    => p_outcome,
    p_reason     => p_reason,
    p_ip         => v_ip,
    p_user_agent => v_ua,
    p_device     => v_device,
    p_os         => v_os,
    p_browser    => v_browser,
    p_country    => v_country);
end;
$$;

-- ---------------------------------------------------------------------
-- log_signup_attempt — replaces the 0802b version.
--
-- Gains the country it never had and the three parsed fields, and mirrors into
-- `audit_logs` on the same terms as sign-in. `kind` (signup / resend /
-- admin_resend) rides in the payload rather than the action, so all
-- registration traffic reads as one stream on the Audit page and stays
-- filterable by kind in the drawer.
-- ---------------------------------------------------------------------
create or replace function public.log_signup_attempt(
  p_kind       text,
  p_outcome    text,
  p_email      text default null,
  p_profile_id uuid default null,
  p_reason     text default null,
  p_ip         text default null,
  p_user_agent text default null,
  p_country    text default null,
  p_device     text default null,
  p_os         text default null,
  p_browser    text default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_ip      inet;
  v_country text;
  v_device  text := public._clean_device(p_device);
  v_os      text := public._clean_ua_field(p_os);
  v_browser text := public._clean_ua_field(p_browser);
  v_email   text := nullif(btrim(lower(coalesce(p_email, ''))), '');
  v_ua      text := left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512);
  v_profile uuid;
begin
  -- Same FK guard as `log_portal_attempt`, for the same reason: a signup logged
  -- against a profile row that no longer exists — a rolled-back registration,
  -- a purge that landed between the lookup and the log — must degrade to an
  -- unattributed row, not to a lost one.
  if p_profile_id is not null then
    select p.id into v_profile from public.profiles p where p.id = p_profile_id;
  end if;

  begin
    v_ip := nullif(btrim(split_part(coalesce(p_ip, ''), ',', 1)), '')::inet;
  exception when others then
    v_ip := null;
  end;

  v_country := nullif(nullif(nullif(upper(btrim(coalesce(p_country, ''))), ''), 'XX'), 'T1');

  insert into public.signup_attempts(
    kind, outcome, email, profile_id, reason, ip_address, user_agent, country_code)
  values (
    p_kind, p_outcome, v_email, v_profile, p_reason, v_ip, v_ua, v_country);

  perform public._auth_audit(
    p_action     => 'signup_' || p_outcome,
    p_actor_id   => v_profile,
    p_email      => v_email,
    -- Registration is a client-portal act; naming the portal keeps the audit
    -- payload the same shape as a sign-in's.
    p_portal     => 'client',
    p_outcome    => p_outcome,
    -- `kind` is the fact that distinguishes a first signup from a resend, and
    -- it would otherwise be lost in the mirror. Folded in beside the reason.
    p_reason     => case when p_reason is null then p_kind else p_reason || ' (' || p_kind || ')' end,
    p_ip         => v_ip,
    p_user_agent => v_ua,
    p_device     => v_device,
    p_os         => v_os,
    p_browser    => v_browser,
    p_country    => v_country);
end;
$$;

-- ---------------------------------------------------------------------
-- log_sign_out — the one auth event with no Edge Function behind it.
--
-- Called by each portal's `AuthProvider` immediately before
-- `supabase.auth.signOut()`, while the session is still live, so `auth.uid()`
-- identifies the account without the caller having to say who they are — which
-- is the whole reason this is an RPC granted to `authenticated` rather than a
-- public endpoint taking a profile id.
--
-- BEST-EFFORT BY NATURE, and worth being honest about: a closed tab, a crashed
-- browser, an expired token and a cleared localStorage all end a session
-- without ever reaching this. The absence of a sign-out row therefore means
-- "not a deliberate sign-out", never "still signed in". `login_succeeded` is
-- the reliable half of the pair.
--
-- IP, user agent and country come from `current_setting('request.headers')` —
-- PostgREST's copy of the real browser request, since this call is not
-- proxied through a function. The parsed device fields cannot come from there
-- (see the header note in this file) so they are arguments, clamped by
-- `_clean_device` / `_clean_ua_field` on the way in.
-- ---------------------------------------------------------------------
create or replace function public.log_sign_out(
  p_portal  text,
  p_reason  text default 'user_initiated',
  p_device  text default null,
  p_os      text default null,
  p_browser text default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_headers json;
  v_ip      inet;
  v_ua      text;
  v_country text;
begin
  -- No session, nothing to record. Not an error: the sign-out button is
  -- reachable in states where the token has already gone.
  if v_actor is null then return; end if;

  if p_portal is null or p_portal not in ('client','vendor','admin') then
    raise exception 'invalid_portal: %', p_portal using errcode = '22023';
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;

  if v_headers is not null then
    begin
      v_ip := nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '')::inet;
    exception when others then
      v_ip := null;
    end;
    v_ua      := left(nullif(btrim(coalesce(v_headers ->> 'user-agent', '')), ''), 512);
    v_country := nullif(nullif(nullif(upper(btrim(coalesce(v_headers ->> 'cf-ipcountry', ''))), ''), 'XX'), 'T1');
  end if;

  perform public._auth_audit(
    p_action     => 'sign_out',
    p_actor_id   => v_actor,
    p_email      => (select lower(p.email::text) from public.profiles p where p.id = v_actor),
    p_portal     => p_portal,
    p_outcome    => 'granted',
    p_reason     => left(nullif(btrim(coalesce(p_reason, '')), ''), 60),
    p_ip         => v_ip,
    p_user_agent => v_ua,
    p_device     => public._clean_device(p_device),
    p_os         => public._clean_ua_field(p_os),
    p_browser    => public._clean_ua_field(p_browser),
    p_country    => v_country);
end;
$$;

-- ---------------------------------------------------------------------
-- Retention for the auth stream.
--
-- `audit_logs` as a whole is a 7-year legal hold and stays that way. These rows
-- are a different kind of record — security telemetry about attempts, most of
-- which resolve to nobody — and they carry IP, device and country for every
-- one. Keeping them as long as a financial change would be retention by
-- accident rather than by decision.
--
-- The purge is deliberately narrow: `entity_type = 'auth'` and nothing else, so
-- it can never reach an entity-change row however the settings are tuned.
-- ---------------------------------------------------------------------
insert into public.platform_settings(key, value, data_type, description) values
  ('auth_audit_retention_days', '180'::jsonb, 'number',
   'How long authentication rows (entity_type = auth) are kept in audit_logs before the nightly purge removes them. Entity-change rows are unaffected and remain under the 7-year hold.')
on conflict (key) do nothing;

insert into public.data_retention_policies(data_category, retention_period, action_on_expiry, legal_hold, description) values
  ('auth_events', interval '180 days', 'delete', false,
   'Authentication events in audit_logs (login, failed login, sign-out, signup). Shorter than the audit trail''s own hold: attempt telemetry with IP and device attached, most of it resolving to no account.')
on conflict (data_category) do nothing;

create or replace function public.purge_auth_audit_events()
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_days    integer := coalesce((public.get_setting('auth_audit_retention_days') #>> '{}')::integer, 180);
  v_deleted integer;
begin
  delete from public.audit_logs
   where entity_type = 'auth'
     and occurred_at < now() - make_interval(days => greatest(v_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------
-- EXECUTE grants.
--
-- The old signatures go first: leaving an 8-arg `log_portal_attempt` beside the
-- new 11-arg one would let a stale deploy keep writing rows that never reach
-- the audit trail, and PostgREST would have two candidates to resolve a named
-- call against.
-- ---------------------------------------------------------------------
drop function if exists public.log_portal_attempt(text, text, uuid, text, text, text, text, text);
drop function if exists public.log_signup_attempt(text, text, text, uuid, text, text, text);

revoke execute on function
  public._auth_audit(text, uuid, text, text, text, text, inet, text, text, text, text, text),
  public._clean_device(text),
  public._clean_ua_field(text),
  public.log_portal_attempt(text, text, uuid, text, text, text, text, text, text, text, text),
  public.log_signup_attempt(text, text, text, uuid, text, text, text, text, text, text, text),
  public.purge_auth_audit_events()
from public, anon, authenticated;

grant execute on function
  public.log_portal_attempt(text, text, uuid, text, text, text, text, text, text, text, text),
  public.log_signup_attempt(text, text, text, uuid, text, text, text, text, text, text, text),
  public.purge_auth_audit_events()
to service_role;

-- The only auth writer a browser may call, and it can only ever describe the
-- caller's own session: the actor is `auth.uid()`, not an argument.
revoke execute on function public.log_sign_out(text, text, text, text, text) from public, anon;
grant execute on function public.log_sign_out(text, text, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Nightly purge, alongside the other two. Skipped cleanly when pg_cron is not
-- installed (local dev), mirroring 0016_cron.sql.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping auth audit purge schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_auth_audit_purge';

  perform cron.schedule('sinnapi_auth_audit_purge', '45 3 * * *', $f$
    select public.purge_auth_audit_events();
  $f$);
end$$;

-- ---------------------------------------------------------------------
-- admin_dashboard_overview — replaces the 0721 version.
--
-- One predicate changes, and it changes because of this migration: the
-- dashboard's "Recent activity" feed reads the newest eight rows of
-- `audit_logs`, and auth events are about to be the overwhelming majority of
-- rows in that table. Left alone, the feed that answers "what changed on the
-- platform today" would answer "eight people signed in".
--
-- Recreated in full rather than patched in place because Postgres has no way to
-- amend one statement inside a function body. Everything else is byte-for-byte
-- the 0721 definition.
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
      -- Authentication rows (0802e) are excluded. This feed has eight slots and
      -- exists to answer "what changed on the platform"; once logins are in the
      -- same table, every one of those slots is a sign-in and the question goes
      -- unanswered. Auth events have their own trail — the Audit page filtered
      -- to authentication, and Blocked Accounts for the ones that failed.
      where a.entity_type is distinct from 'auth'
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

-- Restated for the same reason as in 0802d: `create or replace` keeps the ACL,
-- but a grant that is implied is a grant nobody checks.
revoke execute on function public.admin_dashboard_overview(integer, text) from public, anon;
grant execute on function public.admin_dashboard_overview(integer, text) to authenticated;
