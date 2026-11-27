-- =====================================================================
-- Long-lived sessions for clients and vendors, with the safeguards that
-- make them safe to hand out.
--
-- WHY
-- Clients and vendors were signed out after 30–60 minutes of inactivity by a
-- timer in the SPA. They are used to Facebook/WhatsApp/TikTok, where you sign in
-- once and stay signed in for months, and re-typing a password on a phone every
-- evening was the single biggest complaint about the portals.
--
-- The confirmed policy (2026-11-10):
--   * client + vendor: stay signed in until 60 days pass WITHOUT use. That limit
--     is Supabase's own "Inactivity timeout" (Dashboard → Authentication →
--     Sessions, set to 1440 hours) — enforced by GoTrue at every refresh, not by
--     this file.
--   * "Keep me signed in" unticked on the sign-in form → that session dies after
--     12 hours whatever happens (enforced here, by the portal gate).
--   * admin: unchanged 5-minute idle in the SPA, PLUS a 24-hour absolute limit
--     enforced here — the project-wide 60-day inactivity setting must not become
--     the staff policy.
--   * changing payout bank details needs the password re-confirmed within the
--     last 15 minutes, checked server-side.
--   * every user can see where they are signed in and sign any device out.
--   * a sign-in from a device we have not seen for this account notifies them.
--
-- WHAT THIS FILE ADDS
--   portal_sessions            one row per session a portal admitted: device,
--                              "remember" choice, first/last seen.
--   password_confirmations     the step-up re-auth ledger (success + lockout).
--   _session_gate_reason()     per-session rules folded into the three gates.
--   register_portal_session()  written by portal-sign-in (service role).
--   touch_my_portal_session()  written by the SPA for sessions that arrived by
--                              another route (recovery link, email confirm, or a
--                              session that predates this migration).
--   list_my_sessions() / revoke_my_session() / revoke_my_other_sessions()
--   session_recently_confirmed() and its use in set_vendor_bank_account().
--   account.new_sign_in notification templates.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Settings. Data, not code, like the lockout thresholds.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description)
values
  ('admin_session_max_hours', '24'::jsonb, 'number',
   'Absolute lifetime of an admin-portal session, whatever its activity.'),
  ('unremembered_session_max_hours', '12'::jsonb, 'number',
   'Lifetime of a client/vendor session signed in with "Keep me signed in" unticked.'),
  ('password_confirmation_minutes', '15'::jsonb, 'number',
   'How long a re-confirmed password unlocks sensitive actions (e.g. payout bank details).')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- The current session's id, from the JWT. Null for a token with no session
-- (service role, anon) — callers treat that as "no per-session rule applies".
-- ---------------------------------------------------------------------
create or replace function public._current_session_id()
returns uuid language sql stable set search_path = public as $$
  -- Read from the PostgREST setting directly rather than `auth.jwt()`, which
  -- is the same thing but not present on every Postgres this repo is verified
  -- against.
  select case
    when v.sid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v.sid::uuid
  end
  from (select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'session_id' as sid) v;
$$;

-- ---------------------------------------------------------------------
-- portal_sessions
--
-- auth.sessions already knows a session exists; it does not know which portal
-- admitted it, whether the person ticked "Keep me signed in", or which physical
-- device it is on. `device_id` is a random id the browser generates once and
-- keeps in localStorage — not a fingerprint — so clearing site data simply makes
-- the device "new" again, which is the honest answer.
--
-- No RLS policies: every read and write goes through the definer functions
-- below, which scope to auth.uid() themselves.
-- ---------------------------------------------------------------------
create table if not exists public.portal_sessions (
  session_id   uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  portal       portal_app not null,
  device_id    uuid,
  remember     boolean not null default true,
  device       text,
  os           text,
  browser      text,
  country      text,
  ip           text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists ix_portal_sessions_user_device
  on public.portal_sessions (user_id, device_id);

alter table public.portal_sessions enable row level security;
revoke all on public.portal_sessions from public, anon, authenticated;

comment on table public.portal_sessions is
  'One row per session a portal admitted: device, "keep me signed in" choice, first/last seen. '
  'Read and written only through definer RPCs.';

-- ---------------------------------------------------------------------
-- password_confirmations — the step-up ledger.
--
-- A success row says "the person holding THIS session typed the password at
-- this time"; it is bound to the session, so a confirmation on the phone does
-- not unlock the laptop. Failure rows feed the lockout.
-- ---------------------------------------------------------------------
create table if not exists public.password_confirmations (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_id   uuid,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists ix_password_confirmations_user_time
  on public.password_confirmations (user_id, attempted_at desc);

alter table public.password_confirmations enable row level security;
revoke all on public.password_confirmations from public, anon, authenticated;

/**
 * True when this session re-confirmed its password inside the window.
 * Called from inside sensitive RPCs; it reads auth.uid() and the JWT's own
 * session id, so it cannot be asked about anybody else.
 */
create or replace function public.session_recently_confirmed()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_minutes integer := coalesce((public.get_setting('password_confirmation_minutes') #>> '{}')::integer, 15);
  v_sid     uuid    := public._current_session_id();
begin
  if auth.uid() is null or v_sid is null then return false; end if;
  return exists (
    select 1 from public.password_confirmations c
     where c.user_id = auth.uid()
       and c.session_id = v_sid
       and c.succeeded
       and c.attempted_at > now() - make_interval(mins => greatest(v_minutes, 1))
  );
end;$$;

/**
 * Lockout for the confirm-password endpoint: 5 failures since the last
 * success inside 15 minutes. Same shape as `portal_lockout_active`, keyed on
 * the account rather than an address because the caller is already signed in.
 */
create or replace function public.password_confirmation_locked(p_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_threshold    integer := coalesce((public.get_setting('portal_lockout_threshold')      #>> '{}')::integer, 5);
  v_window       integer := coalesce((public.get_setting('portal_lockout_window_minutes') #>> '{}')::integer, 15);
  v_since        timestamptz := now() - make_interval(mins => greatest(v_window, 1));
  v_last_success timestamptz;
begin
  select max(attempted_at) into v_last_success
    from public.password_confirmations
   where user_id = p_user_id and succeeded and attempted_at >= v_since;

  return (
    select count(*) >= v_threshold
      from public.password_confirmations
     where user_id = p_user_id
       and not succeeded
       and attempted_at >= greatest(v_since, coalesce(v_last_success, v_since))
  );
end;$$;

create or replace function public.record_password_confirmation(
  p_user_id uuid, p_session_id uuid, p_succeeded boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.password_confirmations (user_id, session_id, succeeded)
  values (p_user_id, p_session_id, p_succeeded);
$$;

revoke all on function public.session_recently_confirmed() from public, anon;
grant execute on function public.session_recently_confirmed() to authenticated, service_role;
revoke all on function public.password_confirmation_locked(uuid) from public, anon, authenticated;
grant execute on function public.password_confirmation_locked(uuid) to service_role;
revoke all on function public.record_password_confirmation(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.record_password_confirmation(uuid, uuid, boolean) to service_role;

-- ---------------------------------------------------------------------
-- Per-session rules, folded into the portal gates.
--
-- The SPAs re-run their gate on every auth event, which includes the hourly
-- TOKEN_REFRESHED — so a rule here takes effect within an hour of a session
-- crossing it, and immediately on the next app open. Null = no objection.
-- ---------------------------------------------------------------------
create or replace function public._session_gate_reason(p_portal portal_app)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_sid        uuid := public._current_session_id();
  v_created    timestamptz;
  v_admin_max  integer := coalesce((public.get_setting('admin_session_max_hours')        #>> '{}')::integer, 24);
  v_short_max  integer := coalesce((public.get_setting('unremembered_session_max_hours') #>> '{}')::integer, 12);
begin
  -- Tokens minted before GoTrue carried session_id, or service-role calls:
  -- nothing per-session to check.
  if v_sid is null then return null; end if;

  -- auth.sessions stores naive UTC timestamps.
  select s.created_at at time zone 'UTC' into v_created
    from auth.sessions s where s.id = v_sid;

  -- Signed out from another device ("Where you're signed in"): the access token
  -- is still cryptographically valid for up to an hour, but the session is gone.
  if not found then return 'session_revoked'; end if;

  if p_portal = 'admin' then
    if v_created < now() - make_interval(hours => greatest(v_admin_max, 1)) then
      return 'session_expired';
    end if;
    return null;
  end if;

  if exists (
    select 1 from public.portal_sessions p
     where p.session_id = v_sid
       and not p.remember
       and p.created_at < now() - make_interval(hours => greatest(v_short_max, 1))
  ) then
    return 'session_expired';
  end if;

  return null;
end;$$;

revoke all on function public._session_gate_reason(portal_app) from public, anon, authenticated;

/**
 * The shared body of the three gate wrappers: account rules first (unchanged,
 * 0802a), then session rules for an account that passed them.
 */
create or replace function public._gate_with_session(p_portal portal_app)
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
  r        record;
  v_reason text;
begin
  select * into r from public._evaluate_portal_access(auth.uid(), p_portal);

  if r.allowed then
    v_reason := public._session_gate_reason(p_portal);
  end if;

  if v_reason is not null then
    return query select false, v_reason, r.role_keys, r.full_name, r.account_status;
  else
    return query select r.allowed, r.deny_reason, r.role_keys, r.full_name, r.account_status;
  end if;
end;$$;

revoke all on function public._gate_with_session(portal_app) from public, anon, authenticated;

create or replace function public.portal_access_client()
returns table (allowed boolean, deny_reason text, role_keys text[], full_name text, account_status profile_status)
language sql stable security definer set search_path = public
as $$ select * from public._gate_with_session('client'::portal_app); $$;

create or replace function public.portal_access_vendor()
returns table (allowed boolean, deny_reason text, role_keys text[], full_name text, account_status profile_status)
language sql stable security definer set search_path = public
as $$ select * from public._gate_with_session('vendor'::portal_app); $$;

create or replace function public.portal_access_admin()
returns table (allowed boolean, deny_reason text, role_keys text[], full_name text, account_status profile_status)
language sql stable security definer set search_path = public
as $$ select * from public._gate_with_session('admin'::portal_app); $$;

-- Re-stated: recreating a function is exactly when a stale grant comes back.
revoke all on function public.portal_access_client(), public.portal_access_vendor(), public.portal_access_admin()
  from public, anon;
grant execute on function public.portal_access_client(), public.portal_access_vendor(), public.portal_access_admin()
  to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Recording a session, and the new-device alert.
-- ---------------------------------------------------------------------

/**
 * Upsert one admitted session. Raises the new-device alert when the device id
 * has never been seen on this account AND the account has been seen on some
 * other device before — so nobody is alerted about their very first sign-in,
 * or about the first sign-in after this migration ships.
 *
 * The alert is about the DEVICE, not the portal: a vendor opening the client
 * portal on the phone they already use is not news.
 */
create or replace function public._record_portal_session(
  p_session_id uuid,
  p_user_id    uuid,
  p_portal     portal_app,
  p_device_id  uuid,
  p_remember   boolean,
  p_device     text,
  p_os         text,
  p_browser    text,
  p_country    text,
  p_ip         text,
  p_alert      boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_inserted     boolean;
  v_known_device boolean;
  v_has_history  boolean;
begin
  if p_session_id is null or p_user_id is null then return; end if;

  v_known_device := p_device_id is not null and exists (
    select 1 from public.portal_sessions
     where user_id = p_user_id and device_id = p_device_id);
  v_has_history := exists (select 1 from public.portal_sessions where user_id = p_user_id);

  insert into public.portal_sessions as ps
    (session_id, user_id, portal, device_id, remember, device, os, browser, country, ip)
  values
    (p_session_id, p_user_id, p_portal, p_device_id, coalesce(p_remember, true),
     left(p_device, 60), left(p_os, 60), left(p_browser, 60), left(p_country, 8), left(p_ip, 64))
  on conflict (session_id) do update
    set last_seen_at = now(),
        -- A session never changes owner or portal; refuse to rewrite either.
        device_id = coalesce(ps.device_id, excluded.device_id)
    where ps.user_id = excluded.user_id
  returning (xmax = 0) into v_inserted;

  if p_alert and coalesce(v_inserted, false) and v_has_history and not v_known_device then
    perform public.notify_party(
      'account.new_sign_in',
      p_user_id,
      p_portal::text,
      'portal_sessions',
      p_session_id,
      jsonb_build_object(
        'portal_label',  case p_portal when 'vendor' then 'Vendor portal'
                                       when 'client' then 'Sinnapi app'
                                       else 'Admin console' end,
        'device_label',  coalesce(nullif(btrim(concat_ws(' on ', p_browser, p_os)), ''), 'An unknown device'),
        'country',       coalesce(p_country, 'an unknown location'),
        'signed_in_at',  to_char(now() at time zone 'Africa/Kampala', 'FMDD Month YYYY, HH24:MI') || ' (EAT)',
        'session_id',    p_session_id
      ));
  end if;
end;$$;

revoke all on function public._record_portal_session(uuid, uuid, portal_app, uuid, boolean, text, text, text, text, text, boolean)
  from public, anon, authenticated;

/** Called by `portal-sign-in` (service role) right after a granted sign-in. */
create or replace function public.register_portal_session(
  p_session_id uuid,
  p_user_id    uuid,
  p_portal     text,
  p_device_id  uuid,
  p_remember   boolean,
  p_device     text,
  p_os         text,
  p_browser    text,
  p_country    text,
  p_ip         text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._record_portal_session(
    p_session_id, p_user_id, p_portal::portal_app, p_device_id, p_remember,
    p_device, p_os, p_browser, p_country, p_ip, true);
end;$$;

revoke all on function public.register_portal_session(uuid, uuid, text, uuid, boolean, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_portal_session(uuid, uuid, text, uuid, boolean, text, text, text, text, text)
  to service_role;

/**
 * Called by the SPA once the gate admits a session. Covers sessions that never
 * went through `portal-sign-in` — a password-recovery or email-confirmation
 * link, or a session that predates this migration — and keeps `last_seen_at`
 * fresh for the device list. Only ever about the caller's own current session.
 *
 * It can raise the new-device alert too (a recovery link opened on a strange
 * device is exactly what the owner wants to hear about), but it can never set
 * `remember = false` on an existing row or touch someone else's.
 */
create or replace function public.touch_my_portal_session(
  p_portal    text,
  p_device_id uuid,
  p_device    text,
  p_os        text,
  p_browser   text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sid uuid := public._current_session_id();
begin
  if auth.uid() is null or v_sid is null then return; end if;
  if p_portal is null or p_portal not in ('client', 'vendor', 'admin') then
    raise exception 'invalid_portal: %', p_portal using errcode = '22023';
  end if;
  -- Only a session GoTrue still holds can be recorded.
  if not exists (select 1 from auth.sessions where id = v_sid and user_id = auth.uid()) then return; end if;

  perform public._record_portal_session(
    v_sid, auth.uid(), p_portal::portal_app, p_device_id, true,
    p_device, p_os, p_browser,
    nullif(current_setting('request.headers', true)::jsonb ->> 'cf-ipcountry', ''),
    null, true);
end;$$;

revoke all on function public.touch_my_portal_session(text, uuid, text, text, text) from public, anon;
grant execute on function public.touch_my_portal_session(text, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- "Where you're signed in"
-- ---------------------------------------------------------------------

/**
 * The caller's live sessions, newest activity first.
 *
 * Built from auth.sessions (the truth about what is alive) left-joined to
 * portal_sessions (what we know about it). Left out:
 *   * sessions past GoTrue's own `not_after`;
 *   * sessions idle for longer than the 60-day inactivity timeout;
 *   * "not remembered" sessions past their 12-hour life (the gate refuses them);
 *   * sessions we have no row for that were never refreshed — the throwaway
 *     sessions the old browser-side password check minted and abandoned.
 */
create or replace function public.list_my_sessions()
returns table (
  session_id     uuid,
  portal         text,
  device         text,
  os             text,
  browser        text,
  country        text,
  remember       boolean,
  signed_in_at   timestamptz,
  last_active_at timestamptz,
  is_current     boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_short_max integer := coalesce((public.get_setting('unremembered_session_max_hours') #>> '{}')::integer, 12);
begin
  if auth.uid() is null then return; end if;

  return query
  select
    s.id,
    p.portal::text,
    p.device,
    p.os,
    p.browser,
    p.country,
    coalesce(p.remember, true),
    coalesce(p.created_at, s.created_at at time zone 'UTC'),
    greatest(
      coalesce(s.refreshed_at, s.updated_at, s.created_at) at time zone 'UTC',
      coalesce(p.last_seen_at, '-infinity'::timestamptz)),
    s.id = public._current_session_id()
  from auth.sessions s
  left join public.portal_sessions p on p.session_id = s.id
  where s.user_id = auth.uid()
    and (s.not_after is null or s.not_after > now() at time zone 'UTC')
    and coalesce(s.refreshed_at, s.updated_at, s.created_at) > (now() - interval '60 days') at time zone 'UTC'
    and (p.session_id is not null or s.refreshed_at is not null)
    and not (p.session_id is not null and not p.remember
             and p.created_at < now() - make_interval(hours => greatest(v_short_max, 1)))
  order by 10 desc, 9 desc;
end;$$;

/**
 * Sign one of your own sessions out. Deleting the auth.sessions row takes its
 * refresh tokens with it (FK cascade), so that device cannot renew; its current
 * access token dies at its next gate check or within the hour.
 * Signing out the CURRENT session this way is refused — use the normal sign-out.
 */
create or replace function public.revoke_my_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if p_session_id is null or p_session_id = public._current_session_id() then return false; end if;

  delete from auth.sessions where id = p_session_id and user_id = auth.uid();
  get diagnostics v_count = row_count;
  delete from public.portal_sessions where session_id = p_session_id and user_id = auth.uid();

  if v_count > 0 then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, occurred_at)
    values (auth.uid(), 'session_revoked', 'auth_sessions', p_session_id, now());
  end if;
  return v_count > 0;
end;$$;

/** Every session of this account except the one making the call. */
create or replace function public.revoke_my_other_sessions()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_sid   uuid := public._current_session_id();
  v_count integer;
begin
  if auth.uid() is null or v_sid is null then perform public._forbidden(); end if;

  delete from auth.sessions where user_id = auth.uid() and id <> v_sid;
  get diagnostics v_count = row_count;
  delete from public.portal_sessions where user_id = auth.uid() and session_id <> v_sid;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, occurred_at)
  values (auth.uid(), 'sessions_revoked_others', 'auth_sessions', v_sid, now());
  return v_count;
end;$$;

revoke all on function public.list_my_sessions(), public.revoke_my_session(uuid), public.revoke_my_other_sessions()
  from public, anon;
grant execute on function public.list_my_sessions(), public.revoke_my_session(uuid), public.revoke_my_other_sessions()
  to authenticated;

-- ---------------------------------------------------------------------
-- Step-up for payout bank details.
--
-- Body otherwise VERBATIM from 0916b (search_path with `extensions` kept). The
-- check runs after ownership, so a stranger still gets `forbidden`, not a hint
-- that re-confirming would help.
-- ---------------------------------------------------------------------
create or replace function public.set_vendor_bank_account(
  p_vendor_id uuid, p_bank_name text, p_account_name text,
  p_account_number text, p_branch text, p_is_primary boolean default true)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not public.is_vendor_owner(p_vendor_id) then perform public._forbidden(); end if;
  if not public.session_recently_confirmed() then
    raise exception 'reauth_required'
      using errcode = 'P0001',
            hint = 'Confirm your password, then try again.';
  end if;
  if p_is_primary then
    update public.vendor_bank_accounts set is_primary = false
     where vendor_id = p_vendor_id and deleted_at is null;
  end if;
  insert into public.vendor_bank_accounts(vendor_id, bank_name, account_name,
      account_number_encrypted, account_number_last4, branch, is_primary, is_verified)
  values (p_vendor_id, p_bank_name, p_account_name,
      pgp_sym_encrypt(p_account_number, public._bank_key()),
      right(p_account_number, 4), p_branch, p_is_primary, false)
  returning id into v_id;
  return v_id;
end;$$;

revoke all on function public.set_vendor_bank_account(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.set_vendor_bank_account(uuid, text, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Notification copy. `account.` is a new domain prefix — the portals'
-- `resolveDomain` gains it in the same change, so these land in an
-- "Account" group that links to Settings → Security, not in the unlinked
-- System bucket.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
('account.new_sign_in', 'in_app', 'New sign-in on {{device_label}}',
 'Your account was signed in to the {{portal_label}} from {{device_label}} ({{country}}) on {{signed_in_at}}. '
 'If this was you, there is nothing to do. If not, sign that device out under Settings → Security and change your password.', 'en'),
('account.new_sign_in', 'email', 'New sign-in to your Sinnapi account',
 E'Your Sinnapi account was just signed in from a device we have not seen before.\n\n'
 || E'Where: {{portal_label}}\nDevice: {{device_label}}\nCountry: {{country}}\nWhen: {{signed_in_at}}\n\n'
 || E'If this was you, you can ignore this email.\n\n'
 || E'If it was NOT you: open Sinnapi, go to Settings → Security → Where you''re signed in, sign that device out, '
 || E'then change your password. Sinnapi staff will never ask you for your password.', 'en')
on conflict (trigger_key, channel, locale) do update
  set subject = excluded.subject, body_template = excluded.body_template, is_active = true;

-- ---------------------------------------------------------------------
-- Housekeeping: the ledgers only need recent history.
-- ---------------------------------------------------------------------
create or replace function public.purge_session_ledgers()
returns void language sql security definer set search_path = public as $$
  delete from public.password_confirmations where attempted_at < now() - interval '30 days';
  delete from public.portal_sessions ps
   where ps.last_seen_at < now() - interval '90 days'
     and not exists (select 1 from auth.sessions s where s.id = ps.session_id);
$$;
revoke all on function public.purge_session_ledgers() from public, anon, authenticated;

do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping session ledger purge schedule';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_session_ledger_purge';
  perform cron.schedule('sinnapi_session_ledger_purge', '45 3 * * *', $f$
    select public.purge_session_ledgers();
  $f$);
end$$;
