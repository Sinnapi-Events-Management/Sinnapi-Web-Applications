-- =====================================================================
-- Sinnapi — LEGACY IMPORT  ·  FILE 4  ·  MAIL TRACKING
--
-- Run this ONCE, after 03_import.sql, before invoking the
-- `send-migration-credentials` Edge Function.
--
-- It adds four columns to the staging table so that the send is a piece of
-- recorded state rather than something that happened in a terminal once.
--
-- WHY THE SEND NEEDS STATE AT ALL
--
-- 168 emails carrying one-time passwords is not an operation you can afford
-- to be vague about. Three questions have to be answerable at any moment,
-- including halfway through and including after a crash:
--
--   who has been sent their credential?      mail_status = 'sent'
--   who has not, and why not?                mail_status = 'failed' + mail_error
--   is anything being sent right now?        mail_leased_until > now()
--
-- Without that, a function that times out at recipient 120 leaves you with
-- no way to send the remaining 48 except by re-sending all 168 — which
-- means 120 people get two different-looking emails about their password,
-- and your support line rings.
--
-- THE LEASE IS THE INTERESTING PART
--
-- `mail_leased_until` is taken BEFORE the SMTP call and the outcome written
-- after. A row being sent right now is invisible to a second invocation; a
-- row whose worker died becomes visible again when its lease lapses. There
-- is no state a crash can leave a recipient permanently stuck in.
--
-- That ordering does mean a crash between send and record re-sends to that
-- address once the lease expires. It is the right trade and it is the same
-- one `newsletter-dispatch` makes: a duplicate credential email is an
-- annoyance, a silently skipped recipient is somebody who can never sign in
-- and does not know why. `mail_attempts` bounds how often it can happen.
-- =====================================================================

set search_path = public, extensions;

do $$
begin
  if to_regclass('public.migration_legacy_users') is null then
    raise exception 'migration_legacy_users is gone — run 01_staging.sql and 03_import.sql first'
      using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.migration_legacy_users where import_status = 'imported') then
    raise exception 'nothing has been imported yet — run 03_import.sql first'
      using errcode = 'P0003';
  end if;
end$$;

alter table public.migration_legacy_users
  -- null   = not a candidate for this send (excluded, skipped, or opted out below)
  -- pending = queued
  -- sent    = the SMTP server accepted it
  -- failed  = it did not, and `mail_error` says what the server said
  add column if not exists mail_status       text,
  add column if not exists mail_error        text,
  add column if not exists mail_sent_at      timestamptz,
  add column if not exists mail_attempts     integer not null default 0,
  add column if not exists mail_leased_until timestamptz;

alter table public.migration_legacy_users
  drop constraint if exists ck_migration_mail_status;
alter table public.migration_legacy_users
  add constraint ck_migration_mail_status
  check (mail_status is null or mail_status in ('pending','sent','failed'));

-- The worker's claim query is "give me the next N that are pending and not
-- currently leased", so that is what the index serves.
create index if not exists ix_migration_mail_queue
  on public.migration_legacy_users (mail_status, mail_leased_until)
  where mail_status = 'pending';

comment on column public.migration_legacy_users.mail_status is
  'Credential email state. NULL means this account is deliberately not being mailed - see 04_mail_tracking.sql for which and why.';
comment on column public.migration_legacy_users.mail_leased_until is
  'Set before the SMTP call, cleared after. A row leased into the future is being sent right now by another invocation.';

-- =====================================================================
-- QUEUE THE RECIPIENTS
--
-- Everyone imported, MINUS the two groups you excluded:
--
-- THE BLOCKED ACCOUNT (1). `done@gmail.com` is `profile_blocked` with a
-- permanent auth ban. Its password is valid and its sign-in is refused, so
-- mailing the credential would produce a working-looking secret that cannot
-- be used. `resend-vendor-credentials` refuses exactly this case and calls
-- it "the most confusing possible outcome for the recipient, and a support
-- ticket by construction".
--
-- THE 3 PENDING APPLICANTS. They hold the client role only, and their
-- vendor application is `submitted` — nobody has reviewed it. A "welcome to
-- your vendor account" email would be false, and a client-portal email
-- would invite them somewhere that says nothing about the application they
-- are waiting on. They are mailed once you have made a decision, through
-- `promote-intake` or the admin console, which already send the right
-- message for each outcome.
--
-- Both groups keep `mail_status = null`, so they are visibly "not queued"
-- rather than invisibly absent.
--
-- EXPECT: queued 168 (71 clients + 97 vendors), not_queued 4.
-- The blocked account is one of the 98 imported vendors, hence 97 here.
-- =====================================================================
update public.migration_legacy_users m
   set mail_status = 'pending'
 where m.import_status = 'imported'
   and m.legacy_kind in ('client','vendor')
   and not m.blocked
   and m.temp_password is not null
   and m.mail_status is null;

-- What you are about to send, and to whom.
select
  count(*) filter (where mail_status = 'pending')                        as queued,
  count(*) filter (where mail_status = 'pending' and legacy_kind='client') as queued_clients,
  count(*) filter (where mail_status = 'pending' and legacy_kind='vendor') as queued_vendors,
  count(*) filter (where import_status = 'imported' and mail_status is null) as not_queued
from public.migration_legacy_users;

-- The four deliberately left out, named.
select email, legacy_kind, blocked,
       case when blocked then 'blocked account — cannot sign in'
            else 'vendor application still awaiting review' end as why_not_queued
from public.migration_legacy_users
where import_status = 'imported' and mail_status is null
order by legacy_kind, email;
