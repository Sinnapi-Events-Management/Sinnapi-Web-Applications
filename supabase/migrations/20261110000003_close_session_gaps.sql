-- =====================================================================
-- Closes the three gaps left open by 20261110000002 (long-lived sessions).
--
-- 1. A STOLEN ACCESS TOKEN COULD CHANGE THE PASSWORD.
--    The portals ask for the current password, but GoTrue's own
--    `PUT /auth/v1/user {password}` asks for nothing, so anyone holding a
--    session token could call it directly and lock the owner out.
--    Supabase's "Secure password change" setting would demand a sign-in in the
--    last 24 hours, which breaks password changes for 60-day sessions.
--    Fix: a BEFORE UPDATE trigger on auth.users refuses a password write that
--    arrives through GoTrue unless the server has issued a short-lived ticket
--    for it. Tickets come from `authorize_password_change()` (needs a recent
--    password re-confirm, a recent email-link sign-in, or a fresh password
--    sign-in) or, for the admin Edge Functions that reset credentials, from
--    `issue_password_change_ticket()`. Email-change REQUESTS are refused the
--    same way: no portal offers one, support changes addresses.
--
-- 2. SIGN-INS COULD SKIP portal-sign-in.
--    The anon key can call GoTrue's password grant directly, skipping Turnstile,
--    the lockout, the audit trail, the portal gate and the new-device alert.
--    Fix: `custom_access_token_hook` refuses a password grant that our own
--    endpoints did not announce a moment before (`open_password_grant_intent`).
--    Must be switched on: Dashboard → Authentication → Hooks → Custom Access
--    Token → Postgres → public.custom_access_token_hook.
--
-- 3. A SIGNED-OUT DEVICE KEPT WORKING FOR UP TO AN HOUR.
--    Deleting its session stops it refreshing, but its access token stays valid
--    until it expires.
--    Fix: PostgREST's `db_pre_request` refuses any request whose session is
--    gone or past its life, and a restrictive Storage policy does the same for
--    files. (Realtime is bounded by the JWT expiry — keep it at 15 minutes.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 3. Is the session behind this request still alive?
-- ---------------------------------------------------------------------

/**
 * Null when the request may proceed; otherwise the reason it may not.
 * Requests without a session id (anon, service role, older tokens) proceed —
 * this is about sessions, and those have none.
 *
 * The same rules as the portal gate (`_session_gate_reason`), but
 * portal-agnostic, because a request does not say which app sent it: the
 * portal comes from the session's own `portal_sessions` row.
 */
create or replace function public._request_session_reason()
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_sid       uuid := public._current_session_id();
  v_created   timestamptz;
  v_portal    portal_app;
  v_remember  boolean;
  v_admin_max integer;
  v_short_max integer;
begin
  if v_sid is null then return null; end if;

  select s.created_at at time zone 'UTC' into v_created from auth.sessions s where s.id = v_sid;
  if not found then return 'session_revoked'; end if;

  select p.portal, p.remember into v_portal, v_remember
    from public.portal_sessions p where p.session_id = v_sid;
  if not found then return null; end if;

  if v_portal = 'admin' then
    v_admin_max := coalesce((public.get_setting('admin_session_max_hours') #>> '{}')::integer, 24);
    if v_created < now() - make_interval(hours => greatest(v_admin_max, 1)) then
      return 'session_expired';
    end if;
  elsif not v_remember then
    v_short_max := coalesce((public.get_setting('unremembered_session_max_hours') #>> '{}')::integer, 12);
    if v_created < now() - make_interval(hours => greatest(v_short_max, 1)) then
      return 'session_expired';
    end if;
  end if;

  return null;
end;$$;

create or replace function public.session_is_live()
returns boolean language sql stable security definer set search_path = public as $$
  select public._request_session_reason() is null;
$$;

/**
 * PostgREST pre-request hook: runs before every Data API request. Two primary
 * key lookups, nothing more — it is on the hot path of every call the apps make.
 * 28000 (invalid_authorization_specification) becomes HTTP 403.
 */
create or replace function public.check_request_session()
returns void language plpgsql stable security definer set search_path = public as $$
declare
  v_path   text := coalesce(current_setting('request.path', true), '');
  v_reason text;
begin
  -- The portal gates and the sign-out logger must still answer for a dead
  -- session: the gate is what TELLS the app "session_revoked" so it signs out
  -- (a 403 here would read as "server unreachable", and an admitted session
  -- would then be kept forever), and the logger records why it ended.
  if v_path ~ '/rpc/(portal_access_(client|vendor|admin)|log_sign_out)$' then return; end if;

  v_reason := public._request_session_reason();
  if v_reason is not null then
    raise exception '%', v_reason
      using errcode = '28000',
            hint = 'This device has been signed out. Sign in again.';
  end if;
end;$$;

revoke all on function public._request_session_reason() from public, anon, authenticated;
revoke all on function public.session_is_live(), public.check_request_session() from public;
grant execute on function public.session_is_live(), public.check_request_session()
  to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'alter role authenticator set pgrst.db_pre_request to ''public.check_request_session''';
    perform pg_notify('pgrst', 'reload config');
  end if;
end$$;

-- Storage is not PostgREST, so the pre-request hook never sees it. A
-- RESTRICTIVE policy is AND-ed with every existing permissive one, so it adds
-- this one condition without touching what any bucket already allows.
do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists live_session_only on storage.objects';
    execute 'create policy live_session_only on storage.objects as restrictive '
            'for all to authenticated '
            'using (public.session_is_live()) with check (public.session_is_live())';
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 1. Credential changes need a ticket.
-- ---------------------------------------------------------------------
create table if not exists public.credential_change_tickets (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('password', 'email')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists ix_credential_change_tickets_user
  on public.credential_change_tickets (user_id, kind, expires_at);
alter table public.credential_change_tickets enable row level security;
revoke all on public.credential_change_tickets from public, anon, authenticated;

/** Methods that prove control of the email address (reset link, invite, OTP). */
create or replace function public._recent_auth_method(p_methods text[], p_minutes integer)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1
      from jsonb_array_elements(
             coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'amr', '[]'::jsonb)
           ) a
     where a ->> 'method' = any(p_methods)
       and (a ->> 'timestamp') ~ '^[0-9]+$'
       and to_timestamp((a ->> 'timestamp')::bigint) > now() - make_interval(mins => p_minutes)
  );
$$;

/**
 * Called by the portals immediately before `supabase.auth.updateUser({password})`.
 * Issues a 2-minute ticket if this session has just proved who it is:
 *   * re-confirmed the password in the last 15 minutes (`confirm-password`), or
 *   * signed in from an emailed link (reset / invite / OTP) in the last hour, or
 *   * signed in with a password in the last 30 minutes (the forced first change
 *     after a one-time password).
 * Otherwise raises `reauth_required`, and the portal asks for the password.
 */
create or replace function public.authorize_password_change()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  if not (
    public.session_recently_confirmed()
    or public._recent_auth_method(
         array['recovery', 'invite', 'otp', 'magiclink', 'email/signup', 'email_change'], 60)
    or public._recent_auth_method(array['password'], 30)
  ) then
    raise exception 'reauth_required'
      using errcode = 'P0001', hint = 'Confirm your password, then try again.';
  end if;

  insert into public.credential_change_tickets (user_id, kind, expires_at)
  values (auth.uid(), 'password', now() + interval '2 minutes');
end;$$;

/** For the admin Edge Functions that set a one-time password (service role only). */
create or replace function public.issue_password_change_ticket(p_user_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.credential_change_tickets (user_id, kind, expires_at)
  values (p_user_id, 'password', now() + interval '2 minutes');
$$;

revoke all on function public._recent_auth_method(text[], integer) from public, anon, authenticated;
revoke all on function public.authorize_password_change() from public, anon;
grant execute on function public.authorize_password_change() to authenticated;
revoke all on function public.issue_password_change_ticket(uuid) from public, anon, authenticated;
grant execute on function public.issue_password_change_ticket(uuid) to service_role;

create or replace function public._consume_credential_ticket(p_user_id uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  delete from public.credential_change_tickets
   where id = (select id from public.credential_change_tickets
                where user_id = p_user_id and kind = p_kind and expires_at > now()
                order by created_at limit 1)
  returning id into v_id;
  return v_id is not null;
end;$$;
revoke all on function public._consume_credential_ticket(uuid, text) from public, anon, authenticated;

/**
 * The guard itself. Applies only to writes GoTrue makes (session_user is
 * `supabase_auth_admin`): an operator running SQL as postgres is not stopped.
 *
 * Two safety valves keep GoTrue's own maintenance working — rewriting a hash
 * from another format, or to a different bcrypt cost. Neither is something an
 * attacker's `updateUser` can produce: it always writes bcrypt at the same cost.
 */
create or replace function public._guard_auth_credentials()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old text := coalesce(old.encrypted_password, '');
  v_new text := coalesce(new.encrypted_password, '');
begin
  if session_user <> 'supabase_auth_admin' then return new; end if;

  if coalesce(new.email_change, '') <> ''
     and coalesce(new.email_change, '') is distinct from coalesce(old.email_change, '') then
    if not public._consume_credential_ticket(new.id, 'email') then
      raise exception 'email_change_not_authorized' using errcode = '42501';
    end if;
  end if;

  if v_new is distinct from v_old then
    if v_old <> '' and v_old !~ '^\$2[aby]\$' then return new; end if;          -- format upgrade
    if v_old ~ '^\$2[aby]\$' and v_new ~ '^\$2[aby]\$'
       and substr(v_old, 5, 2) <> substr(v_new, 5, 2) then return new; end if;   -- cost change
    if v_new <> '' and v_new !~ '^\$2[aby]\$' then return new; end if;            -- hash encryption

    if not public._consume_credential_ticket(new.id, 'password') then
      raise exception 'password_change_not_authorized' using errcode = '42501';
    end if;
  end if;

  return new;
end;$$;
revoke all on function public._guard_auth_credentials() from public, anon, authenticated;

drop trigger if exists guard_auth_credentials on auth.users;
create trigger guard_auth_credentials
  before update of encrypted_password, email_change on auth.users
  for each row execute function public._guard_auth_credentials();

-- ---------------------------------------------------------------------
-- 2. Password grants must be announced by our own endpoints.
-- ---------------------------------------------------------------------
create table if not exists public.password_grant_intents (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  expires_at timestamptz not null default now() + interval '30 seconds'
);
create index if not exists ix_password_grant_intents_email on public.password_grant_intents (email, expires_at);
alter table public.password_grant_intents enable row level security;
revoke all on public.password_grant_intents from public, anon, authenticated;

/** Called by portal-sign-in / confirm-password just before they call GoTrue. */
create or replace function public.open_password_grant_intent(p_email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  delete from public.password_grant_intents where expires_at < now();
  insert into public.password_grant_intents (email) values (lower(btrim(p_email))) returning id into v_id;
  return v_id;
end;$$;

/** ...and right after, success or not, so the window is as long as one GoTrue call. */
create or replace function public.close_password_grant_intent(p_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.password_grant_intents where id = p_id;
$$;

revoke all on function public.open_password_grant_intent(text), public.close_password_grant_intent(uuid)
  from public, anon, authenticated;
grant execute on function public.open_password_grant_intent(text), public.close_password_grant_intent(uuid)
  to service_role;

/**
 * Supabase Auth "Custom Access Token" hook. Runs on every token GoTrue issues.
 * Only the password grant is checked; refreshes, email links, OAuth and the
 * rest pass through untouched, claims unchanged.
 *
 * Fails CLOSED for an unannounced password grant, and OPEN for anything this
 * function does not understand — a malformed event must not take sign-in down
 * for everyone.
 */
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_method text := btrim(coalesce(event ->> 'authentication_method', ''), '"');
  v_email  text;
begin
  if v_method <> 'password' then return event; end if;

  select lower(u.email) into v_email from auth.users u
   where u.id = nullif(event ->> 'user_id', '')::uuid;
  if v_email is null then return event; end if;

  if exists (select 1 from public.password_grant_intents i
              where i.email = v_email and i.expires_at > now()) then
    return event;
  end if;

  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Please sign in through the Sinnapi sign-in page.'));
end;$$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema public to supabase_auth_admin';
    execute 'grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin';
  end if;
end$$;

-- Housekeeping for the two new ledgers rides the existing nightly purge.
create or replace function public.purge_session_ledgers()
returns void language sql security definer set search_path = public as $$
  delete from public.password_confirmations where attempted_at < now() - interval '30 days';
  delete from public.portal_sessions ps
   where ps.last_seen_at < now() - interval '90 days'
     and not exists (select 1 from auth.sessions s where s.id = ps.session_id);
  delete from public.credential_change_tickets where expires_at < now() - interval '1 day';
  delete from public.password_grant_intents where expires_at < now() - interval '1 hour';
$$;
revoke all on function public.purge_session_ledgers() from public, anon, authenticated;
