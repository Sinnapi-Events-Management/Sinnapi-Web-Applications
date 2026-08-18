-- =====================================================================
-- Sinnapi — 0816a Marketing consent, suppression, and the proof trail
--
-- WHY THIS EXISTS
-- Every email Sinnapi has ever sent has been transactional: it is about a
-- record the recipient is already party to, so the lawful basis is contract
-- performance and there is nothing to opt out of. The shared footer says
-- exactly that ("This is not marketing email, so there is nothing to
-- unsubscribe from"), and it was true.
--
-- Newsletters are a different animal legally. Under GDPR Art.6(1)(a) the basis
-- is consent, and Art.7(1) puts the burden of *demonstrating* that consent on
-- the controller — meaning we must be able to show, years later, that a
-- specific address agreed to a specific thing, when, from where, and against
-- what wording. Art.7(3) then requires withdrawal to be as easy as giving it.
--
-- So this file stores three things, not one:
--
--   marketing_subscriptions  the current state of an (email, topic) pair
--   marketing_consent_log    every transition it has ever been through
--   email_suppressions       addresses that must never receive marketing again
--
-- The log is the part that is easy to skip and impossible to reconstruct.
-- `marketing_subscriptions` alone can only ever answer "are they subscribed
-- now" — a regulator, or a complaint, asks "on what basis did you mail them on
-- the 4th", and only an append-only trail answers that. It is written by a
-- trigger rather than by callers so no code path can opt out of leaving one.
--
-- TOPICS
-- Two, mirroring the two portals: `client_updates` and `vendor_updates`. This
-- is what lets an admin mail clients and vendors independently without either
-- audience's opt-out silencing the other — a vendor who stops wanting business
-- tips has not asked to stop hearing about anything at all. A person who is
-- both holds two rows and controls them separately.
--
-- OPT-IN MODEL
-- Differs by origin, deliberately:
--
--   clients   double opt-in. Public self-registration is the surface a
--             malicious actor uses to sign somebody else's address up, so the
--             address itself must confirm before it counts. Lands as `pending`
--             and only a clicked confirmation link makes it `subscribed`.
--   vendors   single opt-in. A vendor application is a commercial onboarding
--             by a business that is already deep in an operational email
--             relationship with us, and the applicant proves control of the
--             address later in the approval flow anyway. Lands as `subscribed`
--             with the full Art.7(1) evidence set attached.
--
-- Both are honest opt-ins: unticked by default, never bundled with the terms
-- checkbox (Art.7(2) — consent must be "clearly distinguishable from the other
-- matters"), and both record the exact sentence the person was shown.
--
-- TOKENS
-- `unsubscribe_token` is a stable per-subscription capability, minted once and
-- reused across campaigns, which is what makes RFC 8058 one-click opt-out
-- possible (the mail client POSTs the URL without any session). It is a random
-- 24-byte value, not a hash of anything, and RLS keeps it off every client —
-- only the Edge Functions, on the service role, ever read it. It can be rotated
-- by nulling the column and letting the default refill it, which is why it is
-- stored rather than derived from an HMAC.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'marketing_topic') then
    create type marketing_topic as enum ('client_updates', 'vendor_updates');
  end if;
  if not exists (select 1 from pg_type where typname = 'marketing_consent_status') then
    create type marketing_consent_status as enum ('pending', 'subscribed', 'unsubscribed');
  end if;
  if not exists (select 1 from pg_type where typname = 'marketing_consent_source') then
    create type marketing_consent_source as enum (
      'client_signup', 'vendor_application', 'preference_centre', 'admin_import', 'admin_manual'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'email_suppression_reason') then
    create type email_suppression_reason as enum (
      'unsubscribed', 'bounced', 'complained', 'manual'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- marketing_token — URL-safe random capability token.
--
-- base64 with the three URL-hostile characters folded away, rather than hex:
-- same 192 bits of entropy in 32 characters instead of 48, which matters when
-- the value has to survive being wrapped by a mail client's line folding.
--
-- `gen_random_bytes` is pgcrypto's CSPRNG rather than `random()`, for the same
-- reason 0807a gives: `random()` is a seeded PRNG whose future output is
-- derivable from output already observed, and this value IS the capability —
-- guessing one is reading somebody's preference centre and unsubscribing them.
--
-- `search_path` must include `extensions`, exactly as `gen_reference_token`
-- does. pgcrypto's home schema differs between a Supabase project that got it
-- from the Dashboard (`extensions`) and one where 0001's bare `create
-- extension` placed it (`public`); listing both resolves either, and a schema
-- in `search_path` that does not exist is ignored, so this is safe on both.
-- Note this is not a runtime-only concern: `check_function_bodies` applies a
-- function's own SET clause while validating it, so a `search_path` of bare
-- `public` fails this file at CREATE time, not on first token.
-- ---------------------------------------------------------------------
create or replace function public.marketing_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');
$$;

-- ---------------------------------------------------------------------
-- marketing_subscriptions — current state, one row per (email, topic).
--
-- Keyed on the ADDRESS, not the profile. A person who never registered can
-- still have consented (an admin import, a form), a person who deleted their
-- account must still stay unsubscribed, and the same address must not end up
-- with two conflicting states because it also happens to own a profile.
-- `profile_id` is therefore a nullable convenience link, set when we know it
-- and cleared rather than cascaded when the profile goes.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid references public.profiles(id) on delete set null,
  email              citext not null,
  topic              marketing_topic not null,
  status             marketing_consent_status not null default 'pending',
  source             marketing_consent_source not null,

  -- Art.7(1) evidence set. `consent_text` is the verbatim sentence rendered
  -- next to the checkbox: copy on the sign-up page will be reworded over the
  -- years, and "they agreed to whatever the page says today" is not a defence.
  consent_text       text,
  consent_ip         inet,
  consent_user_agent text,
  consent_at         timestamptz,

  -- Double opt-in. Null on the single opt-in path.
  confirm_token      text,
  confirm_sent_at    timestamptz,
  confirm_expires_at timestamptz,
  confirmed_at       timestamptz,

  unsubscribed_at    timestamptz,
  unsubscribe_token  text not null default public.marketing_token(),

  locale             text not null default 'en',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  version            integer not null default 1,

  unique (email, topic)
);

create unique index if not exists ux_marketing_subs_unsub_token
  on public.marketing_subscriptions(unsubscribe_token);
create unique index if not exists ux_marketing_subs_confirm_token
  on public.marketing_subscriptions(confirm_token) where confirm_token is not null;
-- The audience query: "every subscribed address for this topic".
create index if not exists ix_marketing_subs_topic_status
  on public.marketing_subscriptions(topic, status);
create index if not exists ix_marketing_subs_profile
  on public.marketing_subscriptions(profile_id) where profile_id is not null;

-- 0010_triggers armed `trg_updated_at` by looping over the tables that existed
-- when it ran, so anything added later wires its own.
drop trigger if exists trg_updated_at on public.marketing_subscriptions;
create trigger trg_updated_at before update on public.marketing_subscriptions
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------
-- marketing_consent_log — append-only history.
--
-- Retention here is deliberately longer than the subscription itself: the row
-- proving somebody unsubscribed is the row that matters most, and it must
-- outlive the subscription being deleted. Nothing in the platform prunes this
-- table; the retention policy treats it as compliance evidence.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_consent_log (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.marketing_subscriptions(id) on delete set null,
  email           citext not null,
  topic           marketing_topic not null,
  from_status     marketing_consent_status,
  to_status       marketing_consent_status not null,
  source          marketing_consent_source not null,
  consent_text    text,
  ip              inet,
  user_agent      text,
  actor_id        uuid references public.profiles(id),
  occurred_at     timestamptz not null default now()
);

create index if not exists ix_marketing_log_email on public.marketing_consent_log(email, occurred_at desc);
create index if not exists ix_marketing_log_sub   on public.marketing_consent_log(subscription_id);

-- Written by a trigger, not by callers: a consent change that forgets to leave
-- a trail is indistinguishable from one that never had a basis.
create or replace function public.tg_log_marketing_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  insert into public.marketing_consent_log(
    subscription_id, email, topic, from_status, to_status,
    source, consent_text, ip, user_agent, actor_id
  ) values (
    new.id, new.email, new.topic,
    case when tg_op = 'UPDATE' then old.status end, new.status,
    new.source, new.consent_text, new.consent_ip, new.consent_user_agent, auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists trg_marketing_consent_log on public.marketing_subscriptions;
create trigger trg_marketing_consent_log after insert or update on public.marketing_subscriptions
  for each row execute function public.tg_log_marketing_consent();

-- ---------------------------------------------------------------------
-- email_suppressions — the "never again" list.
--
-- Address-scoped and topic-blind on purpose. A hard bounce or a spam complaint
-- is a fact about the mailbox, not about one topic, and continuing to mail a
-- complained-about address is the single fastest way to lose a sending domain.
-- An explicit unsubscribe-from-everything lands here too; a topic-level opt-out
-- does not (that lives in `marketing_subscriptions.status`).
-- ---------------------------------------------------------------------
create table if not exists public.email_suppressions (
  id         uuid primary key default gen_random_uuid(),
  email      citext not null unique,
  reason     email_suppression_reason not null,
  detail     text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists ix_email_suppressions_reason on public.email_suppressions(reason);

-- ---------------------------------------------------------------------
-- RLS
--
-- 0011_rls enables RLS by looping over the tables that existed when it ran, so
-- these arm themselves. The default posture is deny: no `anon` policy exists on
-- any of the three, because the public preference centre reaches them through
-- SECURITY DEFINER functions on the service role rather than directly — which
-- is what keeps `unsubscribe_token` from being enumerable by anyone holding an
-- anon key.
-- ---------------------------------------------------------------------
alter table public.marketing_subscriptions enable row level security;
alter table public.marketing_subscriptions force row level security;
alter table public.marketing_consent_log   enable row level security;
alter table public.marketing_consent_log   force row level security;
alter table public.email_suppressions      enable row level security;
alter table public.email_suppressions      force row level security;

drop policy if exists marketing_subs_self  on public.marketing_subscriptions;
drop policy if exists marketing_subs_admin on public.marketing_subscriptions;
drop policy if exists marketing_log_admin  on public.marketing_consent_log;
drop policy if exists suppressions_admin   on public.email_suppressions;

-- A signed-in person may read their own subscriptions — this is what the
-- in-portal preference panel reads. They may not write them here: every
-- transition has to carry its evidence, so it goes through the RPCs below.
create policy marketing_subs_self on public.marketing_subscriptions
  for select to authenticated
  using (profile_id = auth.uid());

create policy marketing_subs_admin on public.marketing_subscriptions
  for all to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

-- Read-only even for admins: the trail is evidence, and evidence an operator
-- can edit is not evidence. Inserts come from the trigger, which is SECURITY
-- DEFINER and so bypasses this.
create policy marketing_log_admin on public.marketing_consent_log
  for select to authenticated
  using (public.has_permission('marketing.manage') or public.has_permission('audit.read'));

create policy suppressions_admin on public.email_suppressions
  for all to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

-- ---------------------------------------------------------------------
-- Permission
--
-- Its own key rather than folding into `settings.manage`. The ability to email
-- the entire user base is a categorically different trust than the ability to
-- edit reference data, and it is the one permission in the system whose misuse
-- is instantly visible to every customer at once.
-- ---------------------------------------------------------------------
insert into public.permissions(key, category, description) values
  ('marketing.manage', 'marketing', 'Compose and send newsletters; manage subscriber consent')
on conflict (key) do nothing;

-- Super Admin got "everything" via a cross join that ran once, in 0012, so a
-- permission added later has to be granted explicitly.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'marketing.manage'
where r.key in ('super_admin', 'support')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- marketing_capture_consent — the single write path for a new opt-in.
--
-- Idempotent on (email, topic), and deliberately asymmetric about what it will
-- overwrite:
--
--   pending      -> re-arms the confirmation token. Somebody re-submitting the
--                   form is asking for the mail again, not withdrawing.
--   subscribed   -> left alone. Re-consenting to something you already consented
--                   to must not knock you back to `pending` and silently stop
--                   your mail.
--   unsubscribed -> honoured as a fresh, deliberate opt-in. This is a person
--                   ticking a box on a form today, which is exactly what Art.7
--                   describes as consent; refusing it would make the opt-out
--                   permanent and irreversible, which is its own compliance
--                   problem. The matching `unsubscribed` suppression is lifted
--                   with it — but a `bounced` or `complained` suppression is
--                   NOT, because those are facts about the mailbox that no
--                   checkbox can contradict.
-- ---------------------------------------------------------------------
create or replace function public.marketing_capture_consent(
  p_email          text,
  p_topic          marketing_topic,
  p_source         marketing_consent_source,
  p_consent_text   text default null,
  p_profile_id     uuid default null,
  p_ip             text default null,
  p_user_agent     text default null,
  p_double_opt_in  boolean default true,
  p_locale         text default 'en'
)
-- `consent_status`/`consent_token` rather than `status`/`confirm_token`: an OUT
-- parameter sharing a name with a column of the table being written makes every
-- unqualified reference in the INSERT below ambiguous, and plpgsql resolves that
-- silently in favour of the variable.
returns table (
  subscription_id uuid,
  consent_status  marketing_consent_status,
  consent_token   text,
  already_active  boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email    citext := lower(btrim(p_email));
  v_existing public.marketing_subscriptions%rowtype;
  v_ip       inet;
  v_token    text;
  v_status   marketing_consent_status;
begin
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  -- A malformed X-Forwarded-For must not take a signup down with it: the IP is
  -- evidence, and evidence we failed to parse is worth less than the signup.
  begin
    v_ip := nullif(btrim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  select * into v_existing
  from public.marketing_subscriptions
  where email = v_email and topic = p_topic;

  if found and v_existing.status = 'subscribed' then
    -- Still attach the profile if we have only just learned it.
    if p_profile_id is not null and v_existing.profile_id is null then
      update public.marketing_subscriptions
         set profile_id = p_profile_id
       where id = v_existing.id;
    end if;
    return query select v_existing.id, v_existing.status, null::text, true;
    return;
    -- (`consent_token` is null here on purpose: nothing needs confirming.)
  end if;

  v_status := case when p_double_opt_in then 'pending' else 'subscribed' end::marketing_consent_status;
  v_token  := case when p_double_opt_in then public.marketing_token() end;

  insert into public.marketing_subscriptions as ms (
    profile_id, email, topic, status, source,
    consent_text, consent_ip, consent_user_agent, consent_at,
    confirm_token, confirm_sent_at, confirm_expires_at, confirmed_at,
    unsubscribed_at, locale
  ) values (
    p_profile_id, v_email, p_topic, v_status, p_source,
    p_consent_text, v_ip, nullif(btrim(p_user_agent), ''), now(),
    v_token,
    case when p_double_opt_in then now() end,
    -- Seven days. Long enough to survive a weekend and an ignored inbox, short
    -- enough that a stale token found in an old mailbox archive is inert.
    case when p_double_opt_in then now() + interval '7 days' end,
    case when not p_double_opt_in then now() end,
    null, coalesce(nullif(p_locale, ''), 'en')
  )
  on conflict (email, topic) do update set
    profile_id         = coalesce(excluded.profile_id, ms.profile_id),
    status             = excluded.status,
    source             = excluded.source,
    consent_text       = excluded.consent_text,
    consent_ip         = excluded.consent_ip,
    consent_user_agent = excluded.consent_user_agent,
    consent_at         = excluded.consent_at,
    confirm_token      = excluded.confirm_token,
    confirm_sent_at    = excluded.confirm_sent_at,
    confirm_expires_at = excluded.confirm_expires_at,
    confirmed_at       = excluded.confirmed_at,
    unsubscribed_at    = null,
    locale             = excluded.locale
  returning ms.id, ms.status, ms.confirm_token
  into subscription_id, consent_status, consent_token;

  -- A fresh opt-in lifts only the opt-out. Bounces and complaints stand.
  delete from public.email_suppressions
   where email = v_email and reason = 'unsubscribed';

  already_active := false;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- marketing_confirm_consent — the double opt-in click.
--
-- Consumes the token on success so the link is single-use, and reports expiry
-- distinctly from "no such token" so the confirmation page can offer to send a
-- new one rather than showing a dead end.
-- ---------------------------------------------------------------------
create or replace function public.marketing_confirm_consent(p_token text)
returns table (
  outcome text,           -- confirmed | already | expired | unknown
  email   text,
  topic   marketing_topic
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row public.marketing_subscriptions%rowtype;
begin
  select * into v_row
  from public.marketing_subscriptions
  where confirm_token = p_token;

  if not found then
    -- A token already consumed by a successful confirmation is indistinguishable
    -- from a fabricated one here, which is why `already` is resolved by looking
    -- the address up a second time from the caller rather than guessed at.
    return query select 'unknown'::text, null::text, null::marketing_topic;
    return;
  end if;

  if v_row.status = 'subscribed' then
    return query select 'already'::text, v_row.email::text, v_row.topic;
    return;
  end if;

  if v_row.confirm_expires_at is not null and v_row.confirm_expires_at < now() then
    return query select 'expired'::text, v_row.email::text, v_row.topic;
    return;
  end if;

  update public.marketing_subscriptions
     set status          = 'subscribed',
         confirmed_at    = now(),
         confirm_token   = null,
         unsubscribed_at = null
   where id = v_row.id;

  delete from public.email_suppressions
   where email = v_row.email and reason = 'unsubscribed';

  return query select 'confirmed'::text, v_row.email::text, v_row.topic;
end;
$$;

-- ---------------------------------------------------------------------
-- marketing_preferences — resolve an unsubscribe token to a preference centre.
--
-- Returns every topic the ADDRESS holds, not just the one whose token was
-- clicked: a person who came in from a client newsletter should be able to see
-- and manage their vendor subscription on the same screen rather than having to
-- find a second email to reach it.
-- ---------------------------------------------------------------------
create or replace function public.marketing_preferences(p_token text)
returns table (
  email        text,
  suppressed   boolean,
  topics       jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email citext;
begin
  select ms.email into v_email
  from public.marketing_subscriptions ms
  where ms.unsubscribe_token = p_token;

  if v_email is null then
    return;
  end if;

  return query
  select
    v_email::text,
    exists (select 1 from public.email_suppressions s where s.email = v_email),
    coalesce(
      jsonb_agg(
        jsonb_build_object('topic', ms.topic, 'status', ms.status)
        order by ms.topic
      ),
      '[]'::jsonb
    )
  from public.marketing_subscriptions ms
  where ms.email = v_email;
end;
$$;

-- ---------------------------------------------------------------------
-- marketing_set_preference — one topic on or off from the preference centre.
--
-- Turning a topic back ON here is a real opt-in and is recorded as one, with
-- `preference_centre` as the source. Turning the LAST topic off is treated as
-- an unsubscribe-from-everything and suppresses the address, so the person who
-- unticks both boxes gets the outcome they obviously intend rather than
-- remaining reachable through some future third topic they never saw.
-- ---------------------------------------------------------------------
create or replace function public.marketing_set_preference(
  p_token      text,
  p_topic      marketing_topic,
  p_subscribed boolean,
  p_ip         text default null,
  p_user_agent text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email     citext;
  v_ip        inet;
  v_remaining integer;
begin
  select ms.email into v_email
  from public.marketing_subscriptions ms
  where ms.unsubscribe_token = p_token;

  if v_email is null then
    return false;
  end if;

  begin
    v_ip := nullif(btrim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  update public.marketing_subscriptions
     set status             = case when p_subscribed then 'subscribed' else 'unsubscribed' end,
         source             = 'preference_centre',
         consent_ip         = v_ip,
         consent_user_agent = nullif(btrim(p_user_agent), ''),
         consent_at         = case when p_subscribed then now() else consent_at end,
         confirmed_at       = case when p_subscribed then coalesce(confirmed_at, now()) else confirmed_at end,
         confirm_token      = null,
         unsubscribed_at    = case when p_subscribed then null else now() end
   where email = v_email and topic = p_topic;

  if not found then
    return false;
  end if;

  if p_subscribed then
    delete from public.email_suppressions
     where email = v_email and reason = 'unsubscribed';
  else
    select count(*) into v_remaining
    from public.marketing_subscriptions
    where email = v_email and status = 'subscribed';

    if v_remaining = 0 then
      insert into public.email_suppressions(email, reason, detail)
      values (v_email, 'unsubscribed', 'All topics disabled in the preference centre')
      on conflict (email) do nothing;
    end if;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- marketing_unsubscribe_all — the RFC 8058 one-click target.
--
-- Must stay cheap and unconditional: the mail client POSTs this with no session
-- and no page load, the user never sees a response, and anything that can fail
-- partway leaves somebody believing they opted out when they did not. Returns
-- true for an unknown token as well as a known one — a one-click endpoint that
-- distinguishes the two is an address-validity oracle.
-- ---------------------------------------------------------------------
create or replace function public.marketing_unsubscribe_all(
  p_token      text,
  p_ip         text default null,
  p_user_agent text default null
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email citext;
  v_ip    inet;
begin
  select ms.email into v_email
  from public.marketing_subscriptions ms
  where ms.unsubscribe_token = p_token;

  if v_email is null then
    return true;
  end if;

  begin
    v_ip := nullif(btrim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  update public.marketing_subscriptions
     set status             = 'unsubscribed',
         source             = 'preference_centre',
         consent_ip         = v_ip,
         consent_user_agent = nullif(btrim(p_user_agent), ''),
         confirm_token      = null,
         unsubscribed_at    = now()
   where email = v_email and status <> 'unsubscribed';

  insert into public.email_suppressions(email, reason, detail)
  values (v_email, 'unsubscribed', 'One-click unsubscribe')
  on conflict (email) do nothing;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- suppress_email — used by the webhook when a send hard-bounces or is reported.
-- ---------------------------------------------------------------------
create or replace function public.suppress_email(
  p_email  text,
  p_reason email_suppression_reason,
  p_detail text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_email citext := lower(btrim(p_email));
begin
  if v_email is null or v_email = '' then
    return;
  end if;

  insert into public.email_suppressions(email, reason, detail)
  values (v_email, p_reason, p_detail)
  on conflict (email) do update
    -- A complaint outranks a bounce outranks an opt-out: keep the most severe
    -- reason so the subscriber screen shows why the address is really unusable.
    set reason = case
                   when public.email_suppressions.reason = 'complained' then 'complained'
                   when excluded.reason = 'complained' then 'complained'
                   when excluded.reason = 'bounced' then 'bounced'
                   else public.email_suppressions.reason
                 end,
        detail = coalesce(excluded.detail, public.email_suppressions.detail);

  -- Suppression is a fact about deliverability; the consent record follows it
  -- so the audience count an admin sees matches what will actually be sent.
  update public.marketing_subscriptions
     set status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now())
   where email = v_email and status <> 'unsubscribed';
end;
$$;

-- ---------------------------------------------------------------------
-- Execution grants
--
-- These are SECURITY DEFINER and write consent state, so none of them are
-- callable from a browser: the public preference centre and the sign-up flows
-- reach them through Edge Functions on the service role, which is where the
-- CAPTCHA, the rate limits and the token handling live. Revoking `public` also
-- covers `anon` and `authenticated`, which inherit from it.
-- ---------------------------------------------------------------------
revoke all on function public.marketing_capture_consent(
  text, marketing_topic, marketing_consent_source, text, uuid, text, text, boolean, text
) from public;
revoke all on function public.marketing_confirm_consent(text) from public;
revoke all on function public.marketing_preferences(text) from public;
revoke all on function public.marketing_set_preference(text, marketing_topic, boolean, text, text) from public;
revoke all on function public.marketing_unsubscribe_all(text, text, text) from public;
revoke all on function public.suppress_email(text, email_suppression_reason, text) from public;
revoke all on function public.marketing_token() from public;
