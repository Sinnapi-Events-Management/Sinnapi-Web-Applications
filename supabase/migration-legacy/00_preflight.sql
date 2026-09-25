-- =====================================================================
-- Sinnapi — LEGACY IMPORT  ·  FILE 0 of 4  ·  PRE-FLIGHT (READ-ONLY)
--
-- Source : verified-users-and-vendors-2026-09-06.csv
-- Target : PRODUCTION
-- Scope  : 71 clients · 98 vendors · 3 pending applicants = 172 accounts
--
-- THIS FILE CHANGES NOTHING. Run it first, read every row of every result,
-- and only continue when each one reads the way the comment above it says.
--
-- It answers, before a single byte is written:
--   1  am I on the right project, and is the schema the one these files
--      were written against?
--   2  can I write at all? (`force row level security` is on every public
--      table — 20260618000011:25 — so this is not rhetorical)
--   3  is the database empty of these accounts, or has someone already
--      signed up with one of these addresses?
--   4  do the reference rows the import depends on actually exist?
--
-- Run each numbered block and compare against the expectation in its
-- comment. A single mismatch means STOP — not "probably fine".
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 1. WHICH DATABASE AM I IN?
--
-- `current_database()` is 'postgres' on every Supabase project and proves
-- nothing, so this identifies the project by its CONTENT instead: the row
-- counts below are the fingerprint. On the intended production target
-- every count is 0 except the seeded reference data.
--
-- EXPECT: auth_users / profiles / vendors / vendor_applications ≈ 0
--         (whatever staff accounts you have already provisioned aside),
--         service_categories ≥ 12, roles = 7, pricing_plans ≥ 3.
-- ---------------------------------------------------------------------
select
  (select count(*) from auth.users)                   as auth_users,
  (select count(*) from public.profiles)              as profiles,
  (select count(*) from public.vendors)               as vendors,
  (select count(*) from public.vendor_applications)   as vendor_applications,
  (select count(*) from public.subscriptions)         as subscriptions,
  (select count(*) from public.vendor_services)       as vendor_services,
  (select count(*) from public.service_categories)    as service_categories,
  (select count(*) from public.roles)                 as roles,
  (select count(*) from public.pricing_plans)         as pricing_plans;

-- ---------------------------------------------------------------------
-- 2. IS THE SCHEMA THE ONE THESE FILES WERE WRITTEN AGAINST?
--
-- Every column below is one this import writes or depends on, and each was
-- added by a specific migration. A `false` here means the target is behind
-- the repo and the import would fail partway — which, inside one
-- transaction, means a rollback, but on a production box also means you
-- learned about a missing migration the expensive way.
--
-- EXPECT: every column reads `true`.
-- ---------------------------------------------------------------------
select
  to_regclass('public.profiles')                                    is not null as t_profiles,
  to_regclass('public.vendors')                                     is not null as t_vendors,
  to_regclass('public.vendor_applications')                         is not null as t_applications,
  to_regclass('public.vendor_services')                             is not null as t_services,
  to_regclass('public.subscriptions')                               is not null as t_subscriptions,
  -- 20260810000001 — the lifecycle states the 5 blocked accounts land on
  exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
           where t.typname = 'profile_status' and e.enumlabel = 'blocked')      as e_status_blocked,
  -- 20260810000001 — `status_reason` / `status_changed_at` on profiles
  exists (select 1 from information_schema.columns
           where table_schema='public' and table_name='profiles'
             and column_name='status_reason')                                   as c_status_reason,
  -- 20260829000003 — public_id + its trigger, which must assign, not us
  exists (select 1 from information_schema.columns
           where table_schema='public' and table_name='profiles'
             and column_name='public_id')                                       as c_profile_public_id,
  exists (select 1 from pg_trigger where tgname='trg_public_id'
            and tgrelid='public.profiles'::regclass)                            as tg_profile_public_id,
  exists (select 1 from pg_trigger where tgname='trg_public_id'
            and tgrelid='public.vendors'::regclass)                             as tg_vendor_public_id,
  -- 20260916000001 — the onboarding columns we deliberately leave null
  exists (select 1 from information_schema.columns
           where table_schema='public' and table_name='vendors'
             and column_name='onboarding_completed_at')                          as c_onboarding,
  -- 20260823000003 — vendor_services.pricing_models, written as '{}'
  exists (select 1 from information_schema.columns
           where table_schema='public' and table_name='vendor_services'
             and column_name='pricing_models')                                   as c_pricing_models,
  -- 20260904000001 — the audit columns the batch record uses
  exists (select 1 from information_schema.columns
           where table_schema='public' and table_name='audit_logs'
             and column_name='actor_kind')                                       as c_audit_actor_kind,
  -- 20260802000002 — the signup trigger this import relies on to create
  -- the profile row and grant the client role
  exists (select 1 from pg_trigger where tgname='on_auth_user_created'
            and tgrelid='auth.users'::regclass)                                  as tg_handle_new_user;

-- ---------------------------------------------------------------------
-- 3. MAY I ACTUALLY WRITE?
--
-- 20260618000011 puts `force row level security` on EVERY table in
-- `public`. FORCE means even the table owner is subject to policy, so the
-- only thing that saves a hand-written insert is the BYPASSRLS attribute.
-- The Supabase SQL editor runs as `postgres`, which carries it — but this
-- asserts rather than assumes, because the failure mode otherwise is an
-- INSERT that reports success and silently writes nothing.
--
-- `pgcrypto_schema` matters for the same reason 20260916000002 exists:
-- pgcrypto lives in `public` on some projects and `extensions` on others,
-- and `crypt()` / `gen_salt()` must resolve or the password step dies with
-- a 42883. Every file here opens with `set search_path = public, extensions`
-- so it resolves either way; this just tells you which one you have.
--
-- EXPECT: can_bypass_rls = true, pgcrypto_schema is not null.
-- ---------------------------------------------------------------------
select
  current_user                                                    as running_as,
  (select rolbypassrls from pg_roles where rolname = current_user) as can_bypass_rls,
  (select rolsuper     from pg_roles where rolname = current_user) as is_superuser,
  (select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto')                                 as pgcrypto_schema;

-- ---------------------------------------------------------------------
-- 4. DO THE REFERENCE ROWS THE IMPORT DEPENDS ON EXIST?
--
-- The import grants roles by key and attaches subscriptions to plans by
-- (key, billing_cycle). A missing row here is a null FK later.
--
-- EXPECT: role_client / role_vendor = true; plan_starter / plan_professional
--         = true; currency_ugx = true.
-- ---------------------------------------------------------------------
select
  exists (select 1 from public.roles where key='client')                    as role_client,
  exists (select 1 from public.roles where key='vendor')                    as role_vendor,
  exists (select 1 from public.pricing_plans
           where key='starter'      and billing_cycle='monthly')            as plan_starter,
  exists (select 1 from public.pricing_plans
           where key='professional' and billing_cycle='monthly')            as plan_professional,
  exists (select 1 from public.currencies where code='UGX')                 as currency_ugx,
  (select (public.get_setting('trial_days') #>> '{}')::int)                 as configured_trial_days;

-- ---------------------------------------------------------------------
-- 5. WHAT IS ALREADY IN service_categories?
--
-- File 3 inserts the 55-term taxonomy with `on conflict (key) do nothing`,
-- and REUSES ten keys that the 20260618000012 seed already created rather
-- than minting near-duplicates beside them:
--
--   Catering → caterer      Photographers → photographer   Florists → florist
--   Decor    → decorator    Venue security/ bouncers → security
--   Makeup Artist → makeup_artist    Venue → venue    DJ → dj
--   Entertainment → entertainment    Mc → mc
--
-- Read this list. If production already holds keys that mean the same
-- thing under DIFFERENT names than the seed's, tell me before running
-- file 3 — the reuse map is the one part of this import that cannot be
-- corrected afterwards without re-pointing vendor rows by hand.
-- ---------------------------------------------------------------------
select key, name, is_active, sort_order
from public.service_categories
order by sort_order, key;

-- ---------------------------------------------------------------------
-- 6. THE COLLISION CHECK — THE ONE THAT DECIDES WHETHER YOU RUN AT ALL
--
-- You said no vendor has registered on the new platform. This proves it,
-- and proves it three ways, because there are three different keys the
-- import preserves verbatim from the legacy system and each can collide
-- independently:
--
--   by_email    someone signed up with an address that is in the CSV
--   by_user_id  an auth.users row already holds a legacy user_id
--   by_vendor_id a vendors row already holds a legacy vendor_id
--
-- EXPECT: 0, 0, 0.
--
-- A NON-ZERO IS NOT A BLOCKER — file 3 skips colliding rows by design and
-- file 2 names them — but it IS a fact you must see before, not after.
-- The list is empty until file 1 has run, so run this block again after it.
-- ---------------------------------------------------------------------
select
  case when to_regclass('public.migration_legacy_users') is null
       then 'file 01_staging.sql has not been run yet — re-run this block after it'
       else 'staging present' end as note;

-- ---------------------------------------------------------------------
-- 7. EXISTING ACCOUNTS, FOR THE RECORD
--
-- Whatever is already here — your staff accounts, a test vendor — will not
-- be touched by this import, but you should know what it is so that the
-- post-import counts in file 3 make sense.
-- ---------------------------------------------------------------------
select
  p.public_id, p.email, p.full_name, p.status, p.created_at,
  coalesce((select array_agg(r.key order by r.key)
              from public.user_roles ur join public.roles r on r.id = ur.role_id
             where ur.profile_id = p.id), '{}'::text[]) as role_keys
from public.profiles p
order by p.created_at
limit 100;
