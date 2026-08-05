-- =====================================================================
-- Sinnapi — 0802b Client signup: email confirmation before activation
--
-- WHAT CHANGES
-- Self-registration in the client portal used to produce a fully active account
-- the instant the form was submitted: `handle_new_user` stamped
-- `profiles.status = 'active'` unconditionally, so an unverified address — or a
-- bot working through a word list — held a usable account immediately.
--
-- Now a self-registered client lands as `pending` and is activated only when the
-- address is proven: clicking the confirmation link sets
-- `auth.users.email_confirmed_at`, and the trigger below promotes the profile to
-- `active`. Until then `portal_access_client()` refuses the account, because it
-- already requires `status = 'active'` — the block needs no new logic in the
-- gate and cannot be forgotten at a call site.
--
-- Server-provisioned accounts are unaffected. `create-staff` and
-- `promote-intake` create users with `email_confirm: true`, so they arrive with
-- a confirmed address and go straight to `active`. The trigger is written to be
-- self-healing either way: whether GoTrue stamps `email_confirmed_at` in the
-- INSERT or in a follow-up UPDATE, the profile ends up active.
--
-- THROTTLING, PENDING TURNSTILE
-- `signup_attempts` is the counter behind three limits, all tunable from
-- `platform_settings`: a per-address hourly cap and a resend cooldown (so the
-- endpoint cannot be used to bomb a third party's inbox), and a per-IP hourly
-- cap on account creation. The IP cap is a blunt stopgap — it catches naive
-- bots, not distributed ones, and shared NAT can put real users behind one
-- address — so it is set loose on purpose and is meant to be relaxed or dropped
-- once Turnstile is in front of the form.
--
-- LINK EXPIRY
-- The confirmation link is a GoTrue token, and its lifetime is the project's
-- Auth → "Email OTP Expiration" setting, NOT anything this migration can set.
-- For the intended 24-hour window that must be 86400. What this file does own
-- is the record of WHEN each link was mailed, which is what lets the admin
-- portal show that a pending client's link has gone stale and offer a resend.
-- =====================================================================

-- ---------------------------------------------------------------------
-- handle_new_user — replaces the version in 0017_auth_profile_trigger.sql.
--
-- Only the status line is new; role handling is unchanged (self-registration
-- can still only ever produce client / event_planner, so the vendor and admin
-- roles remain ungrantable from a public form).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role   text := coalesce(new.raw_user_meta_data->>'role', 'client');
  v_status profile_status;
begin
  -- only client/event_planner can self-register; vendors go through application
  if v_role not in ('client','event_planner') then v_role := 'client'; end if;

  -- An address nobody has proven yet is not an active account. Server-side
  -- provisioning passes `email_confirm: true`, which arrives here already
  -- stamped and so stays active — the distinction is the confirmation itself,
  -- not who did the creating, which means there is no flag to spoof.
  v_status := case when new.email_confirmed_at is null then 'pending' else 'active' end;

  insert into public.profiles(id, full_name, email, status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email,
    v_status
  )
  on conflict (id) do nothing;

  insert into public.user_roles(profile_id, role_id)
  select new.id, r.id from public.roles r where r.key = v_role
  on conflict do nothing;

  return new;
end;$$;

-- ---------------------------------------------------------------------
-- Activation on confirmation.
--
-- Deliberately narrow: it only ever moves `pending` → `active`. A suspended
-- account that happens to confirm its address stays suspended — confirming an
-- email is proof of an address, never a route back in for someone an admin has
-- shut out.
-- ---------------------------------------------------------------------
create or replace function public.tg_activate_on_email_confirm()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles
       set status = 'active'
     where id = new.id
       and status = 'pending'
       and deleted_at is null;
  end if;
  return new;
end;$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.tg_activate_on_email_confirm();

-- ---------------------------------------------------------------------
-- signup_attempts
--
-- Separate from `portal_access_attempts` on purpose: that table answers "who
-- tried to get into which portal", this one answers "how much account-creation
-- and confirmation mail has this address / this IP caused". Merging them would
-- mean one of the two throttles counting the other's rows.
--
-- `outcome` distinguishes mail we actually sent from attempts we refused, which
-- matters because the per-address cap exists to protect an inbox: only a `sent`
-- row costs a recipient anything.
-- ---------------------------------------------------------------------
create table if not exists public.signup_attempts (
  id           uuid primary key default gen_random_uuid(),
  -- 'signup' (first request) | 'resend' (user asked again) | 'admin_resend'
  kind         text not null check (kind in ('signup','resend','admin_resend')),
  -- 'sent' (mail dispatched) | 'blocked' (throttled) | 'rejected' (invalid/taken)
  outcome      text not null check (outcome in ('sent','blocked','rejected')),
  email        text,
  profile_id   uuid references public.profiles(id) on delete set null,
  reason       text,
  ip_address   inet,
  user_agent   text,
  attempted_at timestamptz not null default now()
);

-- Serves the per-address cap and the resend cooldown.
create index if not exists ix_signup_attempts_email
  on public.signup_attempts(email, attempted_at desc);
-- Serves the per-IP cap.
create index if not exists ix_signup_attempts_ip
  on public.signup_attempts(ip_address, attempted_at desc);
-- Serves the retention purge and the admin portal's "last link sent" lookup.
create index if not exists ix_signup_attempts_time
  on public.signup_attempts(attempted_at desc);

-- Created after 0011_rls.sql's blanket loop, so it arms its own. Read is
-- audit-grade; no write policy exists, so only service_role (which bypasses
-- RLS) can add rows and nobody can edit the trail from a portal.
alter table public.signup_attempts enable row level security;

drop policy if exists signup_attempts_read on public.signup_attempts;
create policy signup_attempts_read on public.signup_attempts
  for select to authenticated
  using (public.has_permission('users.read') or public.has_permission('audit.read'));

-- ---------------------------------------------------------------------
-- Tunables.
-- ---------------------------------------------------------------------
insert into public.platform_settings(key, value, data_type, description) values
  ('signup_email_max_per_hour', '3'::jsonb, 'number',
   'Confirmation emails that may be sent to one address per hour (signup + resends combined)'),
  ('signup_resend_cooldown_seconds', '60'::jsonb, 'number',
   'Minimum gap between confirmation emails to the same address; also the countdown on the resend button'),
  ('signup_ip_max_per_hour', '10'::jsonb, 'number',
   'Accounts one IP may create per hour. A stopgap until Turnstile fronts the form — loose on purpose, since shared NAT puts real users behind one address'),
  ('signup_attempt_retention_days', '90'::jsonb, 'number',
   'How long signup_attempts rows are kept before the nightly purge removes them')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- signup_throttle_active — returns the reason to refuse, or null to proceed.
--
-- Returning the reason rather than a boolean lets the Edge Function record WHY
-- it refused without re-deriving it, and lets the resend cooldown be reported
-- to the browser as a countdown (the one refusal that is safe to be specific
-- about: it says nothing about whether the address exists).
--
-- `p_kind` matters because the caps differ by intent: a first signup is capped
-- per IP, a resend is capped per address and by cooldown. Both are also capped
-- per address, since every one of them costs the same inbox a message.
-- ---------------------------------------------------------------------
create or replace function public.signup_throttle_active(
  p_email text,
  p_ip    text default null,
  p_kind  text default 'signup'
)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  v_email_max integer := coalesce((public.get_setting('signup_email_max_per_hour')      #>> '{}')::integer, 3);
  v_cooldown  integer := coalesce((public.get_setting('signup_resend_cooldown_seconds') #>> '{}')::integer, 60);
  v_ip_max    integer := coalesce((public.get_setting('signup_ip_max_per_hour')         #>> '{}')::integer, 10);
  v_email     text    := nullif(btrim(lower(coalesce(p_email, ''))), '');
  v_ip        inet;
  v_last_sent timestamptz;
  v_sent      integer;
  v_ip_count  integer;
begin
  -- An admin acting deliberately is not the traffic these caps exist to stop,
  -- and being unable to help a stuck client because a bot burned the quota for
  -- their address would be its own outage.
  if p_kind = 'admin_resend' then return null; end if;

  if v_email is null then return 'invalid_email'; end if;

  -- Cooldown: the shortest limit, so it is checked first and reported first.
  select max(a.attempted_at) into v_last_sent
    from public.signup_attempts a
   where a.email = v_email and a.outcome = 'sent';

  if v_last_sent is not null
     and v_last_sent > now() - make_interval(secs => greatest(v_cooldown, 1)) then
    return 'cooldown';
  end if;

  -- Per-address hourly cap: counts only mail that actually went out.
  select count(*) into v_sent
    from public.signup_attempts a
   where a.email = v_email
     and a.outcome = 'sent'
     and a.attempted_at > now() - interval '1 hour';

  if v_sent >= greatest(v_email_max, 1) then return 'email_rate_limited'; end if;

  -- Per-IP cap on account creation only: a resend is aimed at an inbox the
  -- caller already named, and is governed by the two limits above.
  if p_kind = 'signup' then
    begin
      v_ip := nullif(btrim(split_part(coalesce(p_ip, ''), ',', 1)), '')::inet;
    exception when others then
      v_ip := null;
    end;

    if v_ip is not null then
      select count(*) into v_ip_count
        from public.signup_attempts a
       where a.ip_address = v_ip
         and a.kind = 'signup'
         and a.outcome = 'sent'
         and a.attempted_at > now() - interval '1 hour';

      if v_ip_count >= greatest(v_ip_max, 1) then return 'ip_rate_limited'; end if;
    end if;
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- log_signup_attempt — the only writer of the trail.
--
-- Same defensive IP handling as `log_portal_attempt`: X-Forwarded-For is a
-- comma-separated list that can be junk, and a bad value must degrade to null
-- rather than abort somebody's signup.
-- ---------------------------------------------------------------------
create or replace function public.log_signup_attempt(
  p_kind       text,
  p_outcome    text,
  p_email      text default null,
  p_profile_id uuid default null,
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
  begin
    v_ip := nullif(btrim(split_part(coalesce(p_ip, ''), ',', 1)), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.signup_attempts(
    kind, outcome, email, profile_id, reason, ip_address, user_agent)
  values (
    p_kind,
    p_outcome,
    nullif(btrim(lower(coalesce(p_email, ''))), ''),
    p_profile_id,
    p_reason,
    v_ip,
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512));
end;
$$;

-- ---------------------------------------------------------------------
-- last_confirmation_sent_at — powers the admin portal's pending-client view.
--
-- An admin looking at a stuck signup needs one fact the profile row cannot
-- give them: when the confirmation link was last mailed, and therefore whether
-- it has already expired. Scoped to a single profile and gated on `users.read`
-- so it cannot be swept for a list of addresses.
-- ---------------------------------------------------------------------
create or replace function public.last_confirmation_sent_at(p_profile_id uuid)
returns timestamptz
language plpgsql stable security definer set search_path = public
as $$
declare v_email text;
begin
  if not (public.has_permission('users.read') or public.has_permission('users.manage')) then
    perform public._forbidden();
  end if;

  select lower(p.email::text) into v_email from public.profiles p where p.id = p_profile_id;
  if v_email is null then return null; end if;

  return (
    select max(a.attempted_at)
      from public.signup_attempts a
     where a.email = v_email and a.outcome = 'sent'
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Retention.
-- ---------------------------------------------------------------------
create or replace function public.purge_signup_attempts()
returns integer
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_days    integer := coalesce((public.get_setting('signup_attempt_retention_days') #>> '{}')::integer, 90);
  v_deleted integer;
begin
  delete from public.signup_attempts
   where attempted_at < now() - make_interval(days => greatest(v_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- ---------------------------------------------------------------------
-- EXECUTE grants. Postgres grants EXECUTE to PUBLIC on every new function, so
-- each is revoked first and granted only where it is needed.
-- ---------------------------------------------------------------------
revoke execute on function
  public.signup_throttle_active(text, text, text),
  public.log_signup_attempt(text, text, text, uuid, text, text, text),
  public.purge_signup_attempts(),
  public.last_confirmation_sent_at(uuid)
from public, anon, authenticated;

-- Throttle + trail are service_role only: they are the Edge Function's private
-- machinery, and a browser able to write here could forge its way past a cap.
grant execute on function
  public.signup_throttle_active(text, text, text),
  public.log_signup_attempt(text, text, text, uuid, text, text, text),
  public.purge_signup_attempts()
to service_role;

-- The admin portal reads this one directly; it re-checks the permission itself.
grant execute on function public.last_confirmation_sent_at(uuid)
to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Nightly purge, alongside the portal-attempt one. Skipped cleanly when pg_cron
-- is absent (local dev), mirroring 0016_cron.sql.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping signup attempt purge schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_signup_attempt_purge';

  perform cron.schedule('sinnapi_signup_attempt_purge', '40 3 * * *', $f$
    select public.purge_signup_attempts();
  $f$);
end$$;
