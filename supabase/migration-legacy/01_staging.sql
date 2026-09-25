-- =====================================================================
-- Sinnapi — LEGACY IMPORT  ·  FILE 1 of 4  ·  STAGING
--
-- Loads verified-users-and-vendors-2026-09-06.csv into a table, as text,
-- and defines the derivations the import will apply. It writes NOTHING
-- into auth, profiles, vendors or any other production table. Everything
-- it creates is prefixed `migration_` and is removed by 99_rollback.sql.
--
-- WHY A STAGING TABLE AND NOT 172 INSERTs STRAIGHT INTO auth.users
--
--   * A 172-account import that fails on row 150 inside one transaction
--     tells you nothing about the other 171. Staged, every row is
--     queryable and file 2 reports on all of them BEFORE a byte is written.
--   * The derivations — id, city, phone, display name, plan, slug — become
--     plain SELECTs over a table you can read, argue with and correct in
--     place. Buried inside an INSERT they would be unreviewable.
--   * It makes the import re-runnable. Every write in file 3 is
--     `on conflict do nothing` keyed on the ids fixed here, so a partial
--     run is simply run again.
--   * It is where the one-time passwords land (`temp_password`), so you can
--     export them for mailing once the front end is deployed.
--   * It is the permanent record of the legacy id → Sinnapi id mapping,
--     which for 107 of these accounts exists nowhere else. See below.
--
-- THE DATA IS EMBEDDED, NOT UPLOADED. The CSV contains typographic
-- apostrophes, ampersands, bracketed category names, Excel's leading-quote
-- phone numbers and one business literally named `uUWyTUWHPhimiShwv`. The
-- rows below were machine-generated from the file with exact escaping, so
-- there is no upload step to get wrong and no separator to misconfigure.
--
-- ALL 225 CSV ROWS ARE LOADED, including the 53 that will not be imported.
-- They carry `excluded_reason` and file 3 skips them. A staging table that
-- quietly omitted rows could not be reconciled against the source, which is
-- the only reason it is worth having.
--
-- ---------------------------------------------------------------------
-- THE ID PROBLEM, AND WHAT WAS DONE ABOUT IT
--
-- 127 of the 215 non-admin, non-test accounts do NOT have a UUID for an
-- id. They have a 32-character base62 string — `pr9RyDeOHHnorhRzpnFHoB7TkMX3XN8o`
-- — from an earlier generation of the legacy platform's auth system. All
-- 100 `vendor_id`s are valid UUIDs; only the user ids are affected.
--
-- `auth.users.id` and `profiles.id` are `uuid` columns. There is no way to
-- store a base62 string in one, so for those accounts the id CANNOT be
-- carried across verbatim and this file assigns a new one:
--
--     md5('sinnapi-legacy-2026-09-06:' || legacy_user_id)::uuid
--
-- DETERMINISTIC, not random, for the same reason the slug is: a re-run must
-- produce the same id, or the second run duplicates every account the first
-- one created. `gen_random_uuid()` here would make the import unrepeatable
-- and would throw away the only copy of the mapping.
--
-- Both values are kept. `legacy_user_id` holds what the old platform said;
-- `user_id` holds what Sinnapi will use; `user_id_derived` says which of
-- the two cases a row is. The 88 accounts that already had UUIDs keep them
-- untouched, as do all 100 vendor ids. THIS TABLE IS THE ONLY RECORD OF
-- THAT MAPPING — do not delete it until you are certain no legacy data will
-- ever need to be reconciled against Sinnapi.
--
-- ---------------------------------------------------------------------
-- WHAT IS EXCLUDED, AND WHY
--
--   admin_role    3   role = 'admin' (your Q1a). One of them owned vendor
--                     a54a41b1-…-0e63981e89b1; that listing goes with it.
--   test_account  7   the addresses you named (your Q1c).
--
--   operator_excluded 9  every account whose `full_name` names Caleb or
--                     Lwanga, plus krkemisha8@gmail.com — excluded on
--                     instruction, 2026-09-22. The name rule is matched
--                     case-insensitively against `full_name` only, as asked;
--                     no row matches on `contact_full_name` alone, so nothing
--                     escapes through that gap.
--
--                     One of the nine is an APPROVED VENDOR: `zara@lwangzo.com`,
--                     trading as `Oeuvre Cakes`, on a domain one letter from
--                     the `lwanga.com` addresses already excluded. Its listing
--                     goes with the account. It had no categories, so no
--                     category links are lost with it.
--
--                     Two others (`blendproug@gmail.com`, `shopoboniire@gmail.com`)
--                     were ordinary client accounts that no other rule caught.
--                     They are named here because "8 clients" is otherwise an
--                     invisible number.
--   bot_signup   34   33 clients and 1 vendor whose `full_name` is a random
--                     string — `mDhenKKeBVkQWTCkBBRYTuM`, `FLOTpAvBGuwYfcbvjiTKwSj`.
--                     Mostly foreign corporate domains (noaa.gov, mgmlaw.com,
--                     boyden.com) with 13 registering inside 11 days in
--                     February 2026. Four of the five accounts the legacy
--                     platform had already blocked are in this set, which is
--                     the strongest evidence that the read is right.
--
--                     The rule: no spaces, 12+ characters, mixed case, vowel
--                     ratio below 0.34, and the name is not the email's local
--                     part. That last clause is what spares a real account
--                     named `Drimaxphotography`. Checked in both directions —
--                     34 flagged, no false positives, no false negatives.
--
--                     They are EXCLUDED, NOT DELETED. The rows are here. If
--                     you disagree with any one of them, clear its
--                     `excluded_reason` before running file 3.
--
--   225 rows − 53 excluded = 172 imported: 71 clients, 98 vendors, 3 applicants.
-- =====================================================================

set search_path = public, extensions;

drop table if exists public.migration_legacy_users cascade;
drop table if exists public.migration_city_rules  cascade;

-- ---------------------------------------------------------------------
-- THE STAGED ROWS
--
-- Every CSV column verbatim, plus six of our own:
--
--   legacy_kind      client | vendor | applicant — derived once, here, from
--                    (account_type, role, vendor_id is not null), so the
--                    rule lives in one place instead of being restated in
--                    every query downstream.
--   excluded_reason  null = import it. See the header for the four values.
--                    Set here rather than by deleting the row, so the
--                    exclusions stay auditable and reversible.
--   legacy_user_id   what the old platform called this account.
--   user_id_derived  true when `user_id` had to be minted (see header).
--   temp_password /  written by file 3.
--   import_status
--
-- `user_id` is the primary key: it is what Sinnapi will use, it is unique
-- across all 225 rows (verified after derivation — no collisions), and
-- fixing it HERE rather than at insert time is what makes the whole import
-- idempotent.
-- ---------------------------------------------------------------------
create table public.migration_legacy_users (
  user_id               uuid        primary key,
  legacy_user_id        text        not null unique,
  user_id_derived       boolean     not null,
  legacy_kind           text        not null check (legacy_kind in ('client','vendor','applicant')),
  excluded_reason       text        check (excluded_reason in ('admin_role','test_account','bot_signup','operator_excluded')),
  email                 text        not null,
  full_name             text,
  account_type          text        not null,
  role                  text        not null,
  blocked               boolean     not null default false,
  user_registered_at    timestamptz not null,
  user_updated_at       timestamptz,
  vendor_id             uuid        unique,
  business_name         text,
  contact_full_name     text,
  contact_email         text,
  contact_phone         text,
  location              text,
  subscription_tier     text,
  certification_status  text,
  featured              boolean,
  category_keys         text[]      not null default '{}',
  vendor_registered_at  timestamptz,
  vendor_updated_at     timestamptz,
  -- written by 03_import.sql
  temp_password         text,
  import_status         text,
  imported_at           timestamptz
);

-- ---------------------------------------------------------------------
-- THIS TABLE HOLDS PLAINTEXT PASSWORDS. LOCK IT.
--
-- 20260618000011 armed RLS on every table that existed when it ran; a table
-- created afterwards arms its own or has none at all. RLS ENABLED WITH NO
-- POLICIES is the strongest position available: `anon` and `authenticated`
-- can neither read nor write a row under any circumstance, while `postgres`
-- (BYPASSRLS) works normally. Same shape as `public_id_registry` in
-- 20260829000001, for the same reason.
--
-- The grants are revoked too, so the table is invisible to PostgREST and
-- cannot be reached over the API even if a policy is added later by
-- accident.
-- ---------------------------------------------------------------------
alter table public.migration_legacy_users enable row level security;
revoke all on public.migration_legacy_users from anon, authenticated;

comment on table public.migration_legacy_users is
  'Staging for the 2026-09-06 legacy import, and the ONLY record of the legacy id -> Sinnapi id mapping for 102 imported accounts. CONTAINS PLAINTEXT ONE-TIME PASSWORDS in temp_password - export, mail, then drop that column.';
comment on column public.migration_legacy_users.temp_password is
  'Plaintext one-time password issued at import. Every account also carries must_change_password=true, so it is single-use - but it is a live credential until it is used. Drop this column as soon as the credentials have been sent.';
comment on column public.migration_legacy_users.legacy_user_id is
  'The id the legacy platform used. A UUID for 88 accounts; a 32-char base62 string for 127, whose user_id had to be derived. Keep this column.';

insert into public.migration_legacy_users (
  legacy_kind, excluded_reason, legacy_user_id, user_id, user_id_derived,
  email, full_name, account_type, role,
  blocked, user_registered_at, user_updated_at,
  vendor_id, business_name, contact_full_name, contact_email, contact_phone,
  location, subscription_tier, certification_status, featured, category_keys,
  vendor_registered_at, vendor_updated_at
) values
  ('client',null,'8dea3471-dea6-406c-b657-66147727ff92','8dea3471-dea6-406c-b657-66147727ff92',false,'oeuvre100@gmail.com','God’s Beloved','user','user',false,'2025-06-18T06:38:15.717Z'::timestamptz,'2025-06-19T08:41:11.340Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'d7a4035f-bb5a-42a6-b5bc-103da09d0ef8','d7a4035f-bb5a-42a6-b5bc-103da09d0ef8',false,'iamgeorge332@gmail.com','Lugoloobi George','vendor','user',false,'2025-06-19T07:13:01.752Z'::timestamptz,'2025-06-19T08:06:51.452Z'::timestamptz,'7e8261c6-0b8b-4281-aef9-a4044e5797e9','LG MOTIONS & EVENTS','Lugoloobi George','iamgeorge332@gmail.com','''+256741656649','kampala','Basic Tier','approved',false,'{}'::text[],'2025-06-19T07:13:14.931Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','admin_role','76588dc6-a778-4696-ac67-ccc41f73d43f','76588dc6-a778-4696-ac67-ccc41f73d43f',false,'aitajprince200@gmail.com','Winzer Prince','user','admin',false,'2025-06-21T17:29:16.509Z'::timestamptz,'2025-12-03T05:52:59.309Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'6fbaea9a-6638-4a5e-a99e-132b9a83445d','6fbaea9a-6638-4a5e-a99e-132b9a83445d',false,'dedran@gmail.com','Dedran Kashu','user','user',false,'2025-06-28T09:40:54.103Z'::timestamptz,'2025-06-28T09:40:54.101Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'cdab1f5a-171a-4b42-ac1e-7272f9957fed','cdab1f5a-171a-4b42-ac1e-7272f9957fed',false,'joker@gmail.com','Joker','vendor','user',false,'2025-06-28T09:49:44.746Z'::timestamptz,'2025-06-28T09:49:44.745Z'::timestamptz,'8481c574-3412-499e-9fbd-f7cf3869cfee','Jokrees','Joker','joker@gmail.com','13655584477','Lokes','Basic Tier','rejected',false,'{}'::text[],'2025-06-28T09:49:55.147Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','operator_excluded','5d8c8fcf-bbdc-40b6-ad02-f947c640d8f1','5d8c8fcf-bbdc-40b6-ad02-f947c640d8f1',false,'kirabol361@gmail.com','Caleb Lwanga','user','user',false,'2025-07-01T06:11:39.296Z'::timestamptz,'2025-07-01T06:11:39.295Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'46735ef7-d4e5-4427-bd35-44d3e604f390','46735ef7-d4e5-4427-bd35-44d3e604f390',false,'done@gmail.com','John Gil','vendor','user',true,'2025-07-01T07:52:25.743Z'::timestamptz,'2026-05-16T08:52:28.503Z'::timestamptz,'c8a31596-8c6b-4c10-b4ea-3a81cf82e183','Lite Spa - Updated Application','John Gil','done@gmail.com','''+256 782839231','Kampala, Jinja road','Basic Tier','rejected',false,'{}'::text[],'2025-07-01T07:52:29.277Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'d138cc7a-dd2e-4b9b-b209-26da80b90d9f','d138cc7a-dd2e-4b9b-b209-26da80b90d9f',false,'allan@gmail.com','Allan James','vendor','user',false,'2025-07-01T08:24:30.670Z'::timestamptz,'2025-07-01T08:24:30.669Z'::timestamptz,'bbbb3297-a485-4bba-844b-908c3e229209','Allan and Sons','Allan James','allan@gmail.com','07812327887','Kampala, Wakiso , Uganda','Basic Tier','rejected',false,'{}'::text[],'2025-07-01T08:24:34.335Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'9e19430a-292f-4f93-bad0-f2dbb4685f2e','9e19430a-292f-4f93-bad0-f2dbb4685f2e',false,'jon@gmail.com','Jon','vendor','user',false,'2025-07-01T08:39:19.056Z'::timestamptz,'2025-07-01T08:39:19.055Z'::timestamptz,'fa071b72-1849-481c-abce-1ddb2897cf0d','Jon','Jon','jon@gmail.com','''+256 781 9038232','Kampala','Basic Tier','rejected',false,'{}'::text[],'2025-07-01T08:39:23.682Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'1162e9fd-6dbf-4b2f-8f3a-6a1ab41fa017','1162e9fd-6dbf-4b2f-8f3a-6a1ab41fa017',false,'anon@gmail.com','Adam was Here','user','user',false,'2025-07-01T11:22:01.101Z'::timestamptz,'2025-12-12T12:08:28.398Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'de67fffd-07ce-4a7b-9c80-b43b5f197b95','de67fffd-07ce-4a7b-9c80-b43b5f197b95',false,'norton@gmail.com','norton','user','user',false,'2025-07-01T13:18:38.274Z'::timestamptz,'2025-07-01T13:18:38.274Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'5553d5c7-a919-42fb-84fb-56e3ff31b787','5553d5c7-a919-42fb-84fb-56e3ff31b787',false,'ksdjk@gmail.com','kja;sdfjk','user','user',false,'2025-07-02T16:30:56.402Z'::timestamptz,'2025-07-02T16:30:56.400Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'50f81588-629c-452a-ba97-3534afc5b0d8','50f81588-629c-452a-ba97-3534afc5b0d8',false,'hajsj@gmail.com','Ajsjs','user','user',false,'2025-07-02T16:32:02.957Z'::timestamptz,'2025-07-02T16:32:02.957Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'f4a4e2cb-8a96-41f4-a93d-a78ab21854d2','f4a4e2cb-8a96-41f4-a93d-a78ab21854d2',false,'aitajprince400@gmail.com','hond','user','user',false,'2025-07-02T17:35:04.904Z'::timestamptz,'2025-07-02T17:35:04.904Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor','admin_role','329d7bce-cdb1-426e-9971-3366c4167327','329d7bce-cdb1-426e-9971-3366c4167327',false,'revivalkemigisha@gmail.com','Kemi','vendor','admin',false,'2025-07-03T06:04:38.087Z'::timestamptz,'2026-01-08T10:27:59.605Z'::timestamptz,'a54a41b1-08bf-45ef-ab86-0e63981e89b1','Oeuvre','Kemi','oeuvre100@gmail.com','''+256700988931','Ntinda','Basic Tier','approved',false,'{}'::text[],'2025-07-03T06:06:33.270Z'::timestamptz,'2026-03-30T09:41:49.564Z'::timestamptz),
  ('client',null,'e8e4c77f-fed8-4fb9-b54c-e02cf6ea3c96','e8e4c77f-fed8-4fb9-b54c-e02cf6ea3c96',false,'breviankugonza5@gmail.com','Brevian Kugonza','user','user',false,'2025-07-17T16:51:53.430Z'::timestamptz,'2025-07-17T16:51:53.428Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'cfdec082-8f52-43f0-9d59-c89bbf5bf70c','cfdec082-8f52-43f0-9d59-c89bbf5bf70c',false,'bulumabenon@gmail.com','Buluma Benon Sam','user','user',false,'2025-07-22T11:26:28.613Z'::timestamptz,'2025-07-22T11:26:28.612Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'fe9c32dd-3bb2-40c9-b154-e354097b605f','fe9c32dd-3bb2-40c9-b154-e354097b605f',false,'enocklwegaba01@gmail.com','Lwegaba Enock','user','user',false,'2025-08-01T13:12:49.869Z'::timestamptz,'2025-08-01T13:12:49.866Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'a8db3692-415c-40f1-8ee5-7026c8c470ba','a8db3692-415c-40f1-8ee5-7026c8c470ba',false,'charlotteafoyorwoth@gmail.com','Afoyorwoth Charlotte','user','user',false,'2025-08-22T07:09:13.812Z'::timestamptz,'2025-08-22T07:09:13.811Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('applicant',null,'1f33a4d8-c5a9-49d5-95e5-d242b898cb79','1f33a4d8-c5a9-49d5-95e5-d242b898cb79',false,'buks20121@gmail.com','Orient events and hospitality Ltd','vendor','user',false,'2025-08-22T07:09:36.307Z'::timestamptz,'2025-11-01T08:29:02.433Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('applicant',null,'054b6a4d-549d-455b-aa3b-cd02229f0fe7','054b6a4d-549d-455b-aa3b-cd02229f0fe7',false,'kayesunana@gmail.com','Kayesu Nana','vendor','user',false,'2025-08-22T14:32:55.270Z'::timestamptz,'2025-11-01T08:28:29.278Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'746826b2-ebba-4b6e-a5f9-8463fdd2a9f2','746826b2-ebba-4b6e-a5f9-8463fdd2a9f2',false,'mutaawe38@gmail.com','Mutaawe Enock','user','user',false,'2025-10-01T17:10:15.509Z'::timestamptz,'2025-10-01T17:10:15.505Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'79ba3251-cd00-46f2-9854-795bb637e3cb','79ba3251-cd00-46f2-9854-795bb637e3cb',false,'elizabethbagaya23@gmail.com','Flavia and Liz','user','user',false,'2025-10-17T14:16:08.678Z'::timestamptz,'2025-10-17T14:16:08.675Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'aee446bf-9919-42fb-bb56-4e0413850412','aee446bf-9919-42fb-bb56-4e0413850412',false,'rzionaine@gmail.com','Onefifty7 Brands','user','user',false,'2025-10-30T14:33:28.029Z'::timestamptz,'2025-10-30T14:33:28.029Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'fa8eeffb-8339-4f28-9f24-5de78ed5fdd2','fa8eeffb-8339-4f28-9f24-5de78ed5fdd2',false,'mkwechi25@gmail.com','RITA MKWE ECHILA','vendor','user',false,'2025-10-31T07:17:36.439Z'::timestamptz,'2025-10-31T07:17:36.438Z'::timestamptz,'9e251561-91e1-42ef-b4ea-847de9981f3c','Beauty4Ashes hair salon','RITA MKWE ECHILA','mkwechi25@gmail.com','''+256704520615','Kampala Uganda','Basic Tier','approved',false,'{}'::text[],'2025-11-15T17:55:23.884Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'f8b949e7-b958-43fb-8b89-fe0f7036afd8','f8b949e7-b958-43fb-8b89-fe0f7036afd8',false,'shoponefifty7@gmail.com','Shop O','vendor','user',false,'2025-10-31T08:14:00.853Z'::timestamptz,'2025-11-01T05:33:28.463Z'::timestamptz,'74eeec9a-2c71-4d1e-b7db-2e28c0f1297d','Shop O','Shop O','shoponefifty7@gmail.com','''+256 782160818','Luthuli Ave, Bugolobi','Basic Tier','approved',false,array['beauticians','gift_packaging','gowns','invitations','jeweler','stationery']::text[],'2025-10-31T20:28:04.128Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor','test_account','20ae167e-2fac-496b-8d53-a8e6edaaaf1e','20ae167e-2fac-496b-8d53-a8e6edaaaf1e',false,'test@mail.com','Caleb Lenag','vendor','user',false,'2025-11-04T12:41:41.383Z'::timestamptz,'2025-11-04T12:41:41.382Z'::timestamptz,'bb4de8e2-2471-4a3f-8543-728bf1cadaeb','Neuroshot','Caleb Lenag','test@mail.com','0784275243','Kampala','Basic Tier','rejected',false,'{}'::text[],'2025-11-04T12:42:34.897Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','operator_excluded','e7a29cd0-8ae7-4136-9405-9b563ad56cef','e7a29cd0-8ae7-4136-9405-9b563ad56cef',false,'caleb@ai.com','Caleb','user','user',false,'2025-11-05T05:41:32.361Z'::timestamptz,'2025-11-05T05:41:32.360Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor','test_account','91805ca5-f96a-40f4-9118-cba982500a13','91805ca5-f96a-40f4-9118-cba982500a13',false,'clwanga@lwanga.com','Caleb','vendor','user',false,'2025-11-05T11:15:20.671Z'::timestamptz,'2025-11-05T11:15:20.670Z'::timestamptz,'e191148c-5010-40c5-b21f-70b89262d5a3','Ccdsdf','Caleb','clwanga@lwanga.com','07854458414','Kampala','Basic Tier','rejected',false,'{}'::text[],'2025-11-05T11:16:30.359Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','test_account','eb3dfc3b-1535-46c5-80fa-de60b85e9244','eb3dfc3b-1535-46c5-80fa-de60b85e9244',false,'c@lwanga.com','Caleb','user','user',false,'2025-11-05T12:49:13.101Z'::timestamptz,'2025-11-05T12:49:13.100Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'fc3686ae-426c-4f02-8bf3-25e8f2e80697','fc3686ae-426c-4f02-8bf3-25e8f2e80697',false,'mwanguzisc1@gmail.com','Muwanguzi Isaac henry','user','user',false,'2025-11-15T04:50:19.234Z'::timestamptz,'2025-12-12T12:09:57.369Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'9a6b98eb-bc3f-4b8a-ae8a-e9376f8ed72b','9a6b98eb-bc3f-4b8a-ae8a-e9376f8ed72b',false,'gmore15721@gmail.com','Gifts & more','vendor','user',false,'2025-11-15T18:54:38.988Z'::timestamptz,'2026-07-22T13:20:07.617Z'::timestamptz,'9b233312-c7c7-45e3-9fe0-ed1818672498','Gifts & more','Rebecca Nambuya','gmore15721@gmail.com','''+256784979476','Kampala,Uganda','Basic Tier','approved',false,array['gift_packaging']::text[],'2025-12-03T08:23:41.100Z'::timestamptz,'2026-07-23T10:56:52.628Z'::timestamptz),
  ('vendor',null,'8aebaac4-a436-4460-a59e-966f2768ca94','8aebaac4-a436-4460-a59e-966f2768ca94',false,'mugombasimon@gmail.com','MUGOMBA SIMON','vendor','user',false,'2025-11-15T21:00:28.340Z'::timestamptz,'2025-11-15T21:00:28.340Z'::timestamptz,'0d306b83-7c8e-495e-875b-c045656fb676','HEALTHSCOPE BUSINESS CONSULTS LIMITED','MUGOMBA SIMON','mugombasimon@gmail.com','''+256779300549','NTINDA MUTESA 11 ROAD','Basic Tier','approved',false,'{}'::text[],'2025-11-15T21:17:42.241Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor','test_account','7154b66b-ecc6-4d26-930c-7598470dde1b','7154b66b-ecc6-4d26-930c-7598470dde1b',false,'ruby555@email.com','Uwimana Esther','vendor','user',false,'2025-11-17T07:48:57.311Z'::timestamptz,'2025-11-17T07:48:57.311Z'::timestamptz,'0dff7d12-8ba0-4753-89aa-216a585dc7df','Ruby Bakery','Uwimana Esther','ruby555@email.com','''+256700166379','Kampala','Basic Tier','approved',false,array['cakes']::text[],'2025-11-17T07:59:54.314Z'::timestamptz,'2026-03-14T17:31:40.990Z'::timestamptz),
  ('vendor',null,'abcda57f-1acb-4695-99cb-993ef25fca3b','abcda57f-1acb-4695-99cb-993ef25fca3b',false,'anasostella310@gmail.com','Stella Anaso','vendor','user',false,'2025-11-26T10:59:01.209Z'::timestamptz,'2025-11-26T10:59:01.207Z'::timestamptz,'e2639e02-082e-4e83-804d-838eca375967','Unalloyed Spa','Stella Anaso','anasostella310@gmail.com','''+256747536491','Kyaliwajjala, Kampala','Basic Tier','approved',false,'{}'::text[],'2025-11-26T11:03:00.071Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'67921fa2-2577-4a1b-a449-2f5c2406bd31','67921fa2-2577-4a1b-a449-2f5c2406bd31',false,'twinepaulelisha@gmail.com','Paul Elisha Twine','user','user',false,'2025-11-26T14:30:09.702Z'::timestamptz,'2025-11-26T14:30:09.700Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'eccd476c-8cbb-486e-a2b1-55035c82f3bb','eccd476c-8cbb-486e-a2b1-55035c82f3bb',false,'giftghandi15@gmail.com','Gift','user','user',false,'2025-12-01T18:35:42.016Z'::timestamptz,'2025-12-01T18:35:42.015Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'a7dbd06b-ec65-4eb1-a590-66cdece24b2b','a7dbd06b-ec65-4eb1-a590-66cdece24b2b',false,'ruthakol@gmail.com','Ruth Akol','vendor','user',false,'2025-12-02T03:42:04.653Z'::timestamptz,'2025-12-03T09:19:26.461Z'::timestamptz,'26b7d82d-a56b-4f31-a8a1-556c3def96b0','SCARLETT CAKES AND TREATS','Ruth Akol','scarlettcakestreats@gmail.com','0756066637','KAMPALA UGANDA','Basic Tier','approved',false,'{}'::text[],'2025-12-03T09:18:07.060Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'24eaea0a-a3e4-448f-82f6-8726c5beed83','24eaea0a-a3e4-448f-82f6-8726c5beed83',false,'gracengendahayo@gmail.com','Grace N','vendor','user',false,'2025-12-02T09:17:13.674Z'::timestamptz,'2025-12-02T09:23:45.708Z'::timestamptz,'c8483cdb-849d-497f-8b63-9bc93001eab4','Grace Counseling','Grace N','gracengendahayo@gmail.com','''+256709936369','Seeta','Basic Tier','approved',false,'{}'::text[],'2025-12-02T09:23:01.845Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'50898b39-a720-418d-a3ab-7cdab714b1b0','50898b39-a720-418d-a3ab-7cdab714b1b0',false,'giddy@pijas.com','Pijas Gideon','user','user',false,'2025-12-02T11:12:18.613Z'::timestamptz,'2025-12-03T05:52:48.276Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'424e0898-b307-4ee6-ba8c-f589b9ca88f6','424e0898-b307-4ee6-ba8c-f589b9ca88f6',false,'info.sinnapi@gmail.com','Ngendy','user','user',false,'2025-12-02T12:21:48.652Z'::timestamptz,'2025-12-02T12:21:48.651Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('applicant',null,'c02e1df0-ae23-4e5b-9561-a2b31a2f56bd','c02e1df0-ae23-4e5b-9561-a2b31a2f56bd',false,'jmuhagz@gmail.com','Joshua Muhanguzi','vendor','user',false,'2025-12-02T13:37:34.602Z'::timestamptz,'2026-06-19T20:02:07.570Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor','operator_excluded','ec325e79-f42f-4819-8966-9c3de50cf471','ec325e79-f42f-4819-8966-9c3de50cf471',false,'zara@lwangzo.com','caleb','vendor','user',false,'2025-12-02T14:18:40.012Z'::timestamptz,'2025-12-03T08:22:29.423Z'::timestamptz,'e23c5c77-1329-4b7c-b069-21e7dafe417e','Oeuvre Cakes','caleb','zara@lwangzo.com','''+245784275243','Kamapala, Uganda','Basic Tier','approved',false,'{}'::text[],'2025-12-03T06:57:11.076Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'9bd2cdf5-44a9-4e40-94d6-e884c2edda5e','9bd2cdf5-44a9-4e40-94d6-e884c2edda5e',false,'mugisanathan168@gmail.com','Jack hughman','user','user',false,'2025-12-02T14:28:37.337Z'::timestamptz,'2025-12-02T14:28:37.333Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'dc7724d9-b1b3-4b11-8847-04e145ea004d','dc7724d9-b1b3-4b11-8847-04e145ea004d',false,'rkyakunda@gmail.com','Racheal Kyakunda','vendor','user',false,'2025-12-03T08:15:41.310Z'::timestamptz,'2025-12-03T08:22:23.511Z'::timestamptz,'bae98ce4-fe65-4d59-8028-ec99668daf33','Stalane Enterprises Limited','Racheal Kyakunda','stalaneug2@gmail.com','''+256789659492','Kampala','Basic Tier','approved',false,array['invitations','photo_booths','stationery']::text[],'2025-12-03T08:21:53.781Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'5798f0b0-2e01-40f0-bfa5-8b98435d0a7f','5798f0b0-2e01-40f0-bfa5-8b98435d0a7f',false,'siimaracheal07@gmail.com','Amani_ug','vendor','user',false,'2025-12-03T08:16:36.014Z'::timestamptz,'2025-12-03T08:34:27.333Z'::timestamptz,'2cd2e377-2c4f-436d-ae8a-4ad1bc45133f','Amani_ug','Amani_ug','siimaracheal07@gmail.com','''+256782489158','Kampala, Uganda','Basic Tier','approved',false,'{}'::text[],'2025-12-03T08:34:11.660Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'06551985-3587-4b4e-9fdf-b786c8cfc1d2','06551985-3587-4b4e-9fdf-b786c8cfc1d2',false,'bukenya.jibril@yahoo.com','Jibril Bukenya','vendor','user',false,'2025-12-03T08:19:23.247Z'::timestamptz,'2025-12-03T08:56:32.641Z'::timestamptz,'afacf07b-1b8a-4ce4-8ee3-7460b1753963','ORIENT EVENTS AND HOSPITALITY LTD','Jibril Bukenya','bukenya.jibril@yahoo.com','''+256785640909','Plot 45 Kanjokya Street, Kampala Uganda','Basic Tier','approved',false,array['lighting_trussing_production','pa','tents_parasols_shelters','tour_guide','vendor_management']::text[],'2025-12-03T08:56:11.148Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'7c1e7ca9-1afd-4edd-8496-a586257ec5f1','7c1e7ca9-1afd-4edd-8496-a586257ec5f1',false,'vminteriorsafrica@gmail.com','VM INTERIORS AFRICA','vendor','user',false,'2025-12-03T08:20:05.659Z'::timestamptz,'2025-12-03T08:36:09.368Z'::timestamptz,'8a752de1-a889-42fd-bfed-e52ab85ba014','VM INTERIORS AFRICA','VM INTERIORS AFRICA','vminteriorsafrica@gmail.com','''+256774643353','Kampala','Basic Tier','approved',false,'{}'::text[],'2025-12-03T08:35:46.365Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'f72b3b94-8b02-49d4-8c40-f7eb7ab26465','f72b3b94-8b02-49d4-8c40-f7eb7ab26465',false,'uent33@gmail.com','Uwimana Esther','vendor','user',false,'2025-12-03T08:59:42.150Z'::timestamptz,'2025-12-03T09:33:15.122Z'::timestamptz,'6452d650-d8a8-474a-95a4-0680dda4ed4a','Ruby Bakery','Uwimana Esther','ruby555@gmail.com','''+256 700166379','Kisaasi, Kyanja','Basic Tier','approved',false,'{}'::text[],'2025-12-03T09:32:16.394Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'d898005a-bc36-4da1-8cca-bd230418bb5a','d898005a-bc36-4da1-8cca-bd230418bb5a',false,'anasostella210@gmail.com','Anaso Stella','vendor','user',false,'2025-12-03T09:00:11.287Z'::timestamptz,'2025-12-03T09:03:58.399Z'::timestamptz,'49f5082c-4ef2-464f-a774-24c27e2ee31a','Unalloyed Spa','Anaso Stella','anasostella210@gmail.com','''+256747536491','Agenda Kyaliwajjala, Kampala,','Basic Tier','approved',false,array['wellness_spa']::text[],'2025-12-03T09:03:44.296Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'8597f68c-30c2-4770-ae5d-b37e3729cbaa','8597f68c-30c2-4770-ae5d-b37e3729cbaa',false,'kalungicate@gmail.com','KIBIRIGE ALLAN OSHEA','user','user',false,'2025-12-03T15:30:39.794Z'::timestamptz,'2025-12-03T15:30:39.792Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'5583c9be-86f9-4a40-afc5-347e5f78afba','5583c9be-86f9-4a40-afc5-347e5f78afba',false,'abkalungi77@gmail.com','Kalungi Abu','user','user',false,'2025-12-03T17:14:32.661Z'::timestamptz,'2025-12-03T17:14:32.657Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'06ea097b-513b-4070-9566-5dcb9f5805d5','06ea097b-513b-4070-9566-5dcb9f5805d5',false,'turacotrailstoursandtravel@gmail.com','TURACO TRAILS TOURS','vendor','user',false,'2025-12-04T05:35:53.936Z'::timestamptz,'2026-03-16T06:17:22.810Z'::timestamptz,'34903878-6845-4358-8811-a70098fd91a5','TURACO TRAILS TOURS','TURACO TRAILS TOURS','turacotrailstoursandtravel@gmail.com','''+256763176931','Kampala','Basic Tier','approved',false,'{}'::text[],'2025-12-04T05:40:04.674Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'8c948781-06dd-4f4f-8c31-01bbe0bbcebb','8c948781-06dd-4f4f-8c31-01bbe0bbcebb',false,'najjukaesther@gmail.com','Esther Najjuka','user','user',false,'2025-12-05T19:12:53.669Z'::timestamptz,'2025-12-05T19:12:53.663Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','93e8f65c-e2a2-42c6-8c3f-9b786e37ea51','93e8f65c-e2a2-42c6-8c3f-9b786e37ea51',false,'gawofaxa83@gmail.com','pJycWuulwVZLNygelgiGCTP','user','user',true,'2025-12-11T10:32:56.787Z'::timestamptz,'2026-02-14T13:55:42.794Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'15b1a4e5-2dbf-4360-b47d-aa4690125357','15b1a4e5-2dbf-4360-b47d-aa4690125357',false,'baganizimana1@gmail.com','Kedrace Maniriho','vendor','user',false,'2025-12-11T12:10:33.425Z'::timestamptz,'2025-12-11T12:22:56.593Z'::timestamptz,'f939ebd4-860b-48f7-87f1-6225805667a4','Kediezcollections','Kedrace Maniriho','baganizimana1@gmail.com','''+256706943858','Avemar Shopping Centre, Rm K13, 3rd Floor, Luwum Street','Basic Tier','approved',true,array['traditional_attire']::text[],'2025-12-11T12:22:17.945Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client',null,'c2e50f4c-c754-4bd7-b6f2-edda17782d8f','c2e50f4c-c754-4bd7-b6f2-edda17782d8f',false,'jkgsarah@gmail.com','Sarah','user','user',false,'2025-12-16T06:13:15.308Z'::timestamptz,'2025-12-16T06:13:56.032Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'bc9b8e08-5760-4302-934c-b4239d6124c1','bc9b8e08-5760-4302-934c-b4239d6124c1',false,'annegracematovu647@gmail.com','Fantasy events','vendor','user',false,'2025-12-19T18:34:09.008Z'::timestamptz,'2025-12-25T04:55:04.120Z'::timestamptz,'3f5e6b2d-0f2a-4b3b-9840-a395782cf7f3','Fantasy events','Fantasy events','annegracematovu647@gmail.com','''+256772920105','Kampala-uganda','Basic Tier','approved',false,array['caterer','decorator','event_rentals','makeup_artist','photo_booths','tents_parasols_shelters','venue','wedding_planner']::text[],'2025-12-22T14:04:19.259Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'b253984e-5d0d-4a44-8253-60c6afd7c6be','b253984e-5d0d-4a44-8253-60c6afd7c6be',false,'djstefug@gmail.com','DJ STEF','vendor','user',false,'2025-12-22T15:34:33.881Z'::timestamptz,'2025-12-25T04:53:58.542Z'::timestamptz,'c65ff182-1901-4562-97ca-d98851f2f9a1','DJ STEF','Timothy Maganyi','djstefug@gmail.com','''+256785556271','Kampala','Basic Tier','approved',false,'{}'::text[],'2025-12-22T16:02:15.718Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','bot_signup','71ecd6d3-13ec-4913-b551-a5ecaa0ad4f8','71ecd6d3-13ec-4913-b551-a5ecaa0ad4f8',false,'unokusive833@gmail.com','reurLNEDhswDqShssFIzduE','user','user',false,'2025-12-28T20:57:47.962Z'::timestamptz,'2025-12-28T20:57:47.962Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'18a8d7fc-ed78-4f27-8870-8a9d5f28d5cd','18a8d7fc-ed78-4f27-8870-8a9d5f28d5cd',false,'thestreamsideug@gmail.com','The Streamside Park','user','user',false,'2025-12-30T11:15:49.773Z'::timestamptz,'2025-12-30T11:15:49.771Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'f1a7adca-d8d6-4e8e-b6ba-0b1322e2046c','f1a7adca-d8d6-4e8e-b6ba-0b1322e2046c',false,'omugisher@gmail.com','Gisher z','user','user',false,'2025-12-30T11:16:55.583Z'::timestamptz,'2025-12-30T11:16:55.583Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor','test_account','14221db3-82bc-411d-bf09-57a1e1addfc7','14221db3-82bc-411d-bf09-57a1e1addfc7',false,'tester9@example.com','Tester9','vendor','user',false,'2025-12-30T12:24:57.739Z'::timestamptz,'2025-12-30T12:24:57.739Z'::timestamptz,'43102c14-80b4-48fa-8986-40274f608e1d','DA VEndors','Tester9','tester9@example.com','0781061730','dandan','Basic Tier','rejected',false,'{}'::text[],'2025-12-30T12:50:54.660Z'::timestamptz,'2026-02-14T13:44:14.364Z'::timestamptz),
  ('client','bot_signup','8cc970fc-e419-4865-b145-356f66230e3b','8cc970fc-e419-4865-b145-356f66230e3b',false,'obisazofed891@gmail.com','QmHfOBIHbQtUolggZd','user','user',false,'2026-01-03T03:22:20.980Z'::timestamptz,'2026-01-03T03:22:20.978Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','6b21db00-3f4b-4e3f-a992-1f4e530d0777','6b21db00-3f4b-4e3f-a992-1f4e530d0777',false,'izujibukohic52@gmail.com','VuEgMWhiPvCfpnlbYJn','user','user',false,'2026-01-03T23:59:47.519Z'::timestamptz,'2026-01-03T23:59:47.516Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'25af217a-e49a-49e8-969c-5979a98214d3','25af217a-e49a-49e8-969c-5979a98214d3',false,'endlessvisuals6845@gmail.com','ENDLESS VISUALS UG','user','user',false,'2026-01-05T10:31:36.283Z'::timestamptz,'2026-01-05T10:31:36.281Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','8d96842d-c04a-44e6-a0df-5836009e769d','8d96842d-c04a-44e6-a0df-5836009e769d',false,'agosonu146@gmail.com','DOgPnrxdfZQoetXIufZaNQ','user','user',false,'2026-01-05T12:14:43.991Z'::timestamptz,'2026-01-05T12:16:00.310Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','1fe3d5f8-8368-4aab-88b6-90c520d475c5','1fe3d5f8-8368-4aab-88b6-90c520d475c5',false,'andrea.simone@atrapalo.com.ar','xqtyVCqNTVGCsqpipvw','user','user',false,'2026-01-05T19:35:25.258Z'::timestamptz,'2026-01-05T19:35:25.256Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','d1a5467f-6e8f-40cc-ae45-2eb73f313284','d1a5467f-6e8f-40cc-ae45-2eb73f313284',false,'loriannetta@gmail.com','jNzJlKJqmjquIUNzbsq','user','user',false,'2026-01-05T22:06:39.049Z'::timestamptz,'2026-01-05T22:06:39.049Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'e7b0e393-752f-463a-a409-30722b874548','e7b0e393-752f-463a-a409-30722b874548',false,'kenyanahajarah@gmail.com','Kenyana Hajara','vendor','user',false,'2026-01-06T08:58:23.947Z'::timestamptz,'2026-01-06T09:16:10.972Z'::timestamptz,'5b6886ac-c774-4f7d-b042-7928ae5baf4c','PANDA DECOR & RENTALS','Kenyana Hajara','kenyanahajarah@gmail.com','0749523996','Equatorial mall L3 shop no.444','Basic Tier','approved',false,array['decorator','event_rentals']::text[],'2026-01-06T09:15:48.381Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor','test_account','8a0bb352-d75d-416a-b669-a65b96157300','8a0bb352-d75d-416a-b669-a65b96157300',false,'tester6@example.com','Tester6','vendor','user',false,'2026-01-06T09:15:42.985Z'::timestamptz,'2026-01-06T09:15:42.985Z'::timestamptz,'50659987-b3e3-4f06-869e-cac8d43a7e2f','Department of Networks','Tester6','tester6@example.com','''+256781061730','Kampala','Basic Tier','rejected',false,'{}'::text[],'2026-01-06T09:16:48.488Z'::timestamptz,'2026-02-14T13:43:51.918Z'::timestamptz),
  ('vendor',null,'d002cd35-5a24-43da-9344-84f8ef1677c2','d002cd35-5a24-43da-9344-84f8ef1677c2',false,'shakirasentamu@gmail.com','Rannie events','vendor','user',false,'2026-01-06T09:34:24.079Z'::timestamptz,'2026-01-06T09:45:08.966Z'::timestamptz,'7c3479e6-840a-45fe-b8f3-6e536cb46e58','Rannie events','Rannie events','shakirasentamu@gmail.com','''+256788920036','Equatorial mall level 3  room no.453','Basic Tier','approved',true,array['decorator','event_rentals','gift_packaging','photo_booths','wedding_planner']::text[],'2026-01-06T09:44:43.431Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'807734ec-682d-4d02-9d64-f1b09e23cec4','807734ec-682d-4d02-9d64-f1b09e23cec4',false,'mwesigebrandy105@gmail.com','Mwesige Brandy','vendor','user',false,'2026-01-06T09:38:23.364Z'::timestamptz,'2026-01-06T10:18:43.042Z'::timestamptz,'646f0fbc-669d-4c2d-80a3-96859416e6dd','360 mz','Mwesige Brandy','mwesigebrandy105@gmail.com','''+256706957340','KampalA','Basic Tier','approved',false,array['content_creators','entertainment','event_rentals','icecream','kids_play']::text[],'2026-01-06T09:59:22.913Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'d0864c04-dde6-4a0a-90cb-3fd3244ae3b3','d0864c04-dde6-4a0a-90cb-3fd3244ae3b3',false,'jollynantege28@gmail.com','Nantege Jolly','vendor','user',false,'2026-01-06T10:51:45.760Z'::timestamptz,'2026-01-06T11:16:32.088Z'::timestamptz,'5c114b79-7e6e-4e0f-98ab-82cd1172470c','FLOWER PATCH EVENTS','Nantege Jolly','jollynantege28@gmail.com','0777989346','Equtorial mall shop 544','Basic Tier','approved',false,array['decorator','florist']::text[],'2026-01-06T11:15:50.762Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','bot_signup','2a61cbbf-7f32-4991-a832-ec7465c23b96','2a61cbbf-7f32-4991-a832-ec7465c23b96',false,'r.a.st.a.ology7@gmail.com','ztCpFVjuoQGnYniAiHDIVz','user','user',false,'2026-01-06T12:41:05.858Z'::timestamptz,'2026-01-06T12:41:05.858Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'fa4a0638-7041-484f-87ec-cb22596b914b','fa4a0638-7041-484f-87ec-cb22596b914b',false,'skalyango61@gmail.com','Kalyango saadi','vendor','user',false,'2026-01-06T13:32:54.709Z'::timestamptz,'2026-01-06T13:37:47.733Z'::timestamptz,'dd0ffead-3960-4d54-9c51-225325072ae7','Hyper concepts','Kalyango saadi','skalyango61@gmail.com','''+256 700359284','equatorial mall','Basic Tier','approved',true,array['decorator','event_rentals','photo_booths']::text[],'2026-01-06T13:37:25.090Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','bot_signup','688b61f4-75a8-4330-84e4-c7527cf834b4','688b61f4-75a8-4330-84e4-c7527cf834b4',false,'furnarialfio@hotmail.it','KfGwfTGvSquYOhGCSd','user','user',true,'2026-01-06T17:19:25.624Z'::timestamptz,'2026-01-13T10:17:03.924Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','f72f53e6-3e96-4e30-b22c-97adc78b5131','f72f53e6-3e96-4e30-b22c-97adc78b5131',false,'anees.baba55@yahoo.com','myvBGsvyHfxOdaKIyKp','user','user',false,'2026-01-06T20:47:20.734Z'::timestamptz,'2026-01-06T20:49:17.646Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','11e9358f-02d5-4636-b9b2-c4f20e02f4eb','11e9358f-02d5-4636-b9b2-c4f20e02f4eb',false,'fsherbondy@yahoo.com','qyMnZvAJJhxprxVFtOFypDhD','user','user',false,'2026-01-07T00:30:56.440Z'::timestamptz,'2026-01-07T00:30:56.438Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'b73e0798-b74d-400f-9b1b-90cf0b03ee40','b73e0798-b74d-400f-9b1b-90cf0b03ee40',false,'wonderworldevents23@gmail.com','Wonder World Events','user','user',false,'2026-01-07T07:26:27.355Z'::timestamptz,'2026-01-07T07:26:27.354Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'6242b525-a65e-43f8-bc35-fa1d16b64734','6242b525-a65e-43f8-bc35-fa1d16b64734',false,'naturindam01@gmail.com','Mary Naturinda','vendor','user',false,'2026-01-07T11:05:34.703Z'::timestamptz,'2026-01-07T11:11:40.889Z'::timestamptz,'e9c847ce-b974-4add-90ee-a41d64661cfd','Maria Fashions','Mary Naturinda','naturindam01@gmail.com','''+256772566641','Faibaah Plaza, shop no. 8 basement luwum street','Basic Tier','approved',false,array['bridal_shoes_accessories','florist','gift_packaging','suits','traditional_attire']::text[],'2026-01-07T11:11:00.254Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'27931172-8741-4c5e-8e57-96a092b8f484','27931172-8741-4c5e-8e57-96a092b8f484',false,'shamfashfash@gmail.com','Juuko Shiham','vendor','user',false,'2026-01-07T11:37:37.538Z'::timestamptz,'2026-01-07T11:54:54.111Z'::timestamptz,'0e4c0b6d-d64e-4a31-80df-0d4109f3563a','Sham Fash','Juuko Shiham','shamfashfash@gmail.com','''+256704642657','Faibaah plaza, basement A06 opposite jemba plaza, Luwum street','Basic Tier','approved',false,array['beauticians','gift_packaging','makeup_artist','traditional_attire']::text[],'2026-01-07T11:53:37.463Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'b2f7cd61-23f4-4e0b-b153-307a17d4d1c9','b2f7cd61-23f4-4e0b-b153-307a17d4d1c9',false,'gillianasiimwe@gmail.com','Gillia Asiimwe','vendor','user',false,'2026-01-07T12:32:43.129Z'::timestamptz,'2026-01-07T12:44:30.869Z'::timestamptz,'65e246b5-41dd-4489-b344-1ab4887a97c4','Dr. Gill','Gillia Asiimwe','gillianasiimwe@gmail.com','''+256772419469','Avemar shopping mall, Rm T10, Luwum street','Basic Tier','approved',false,array['beauticians']::text[],'2026-01-07T12:43:45.618Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'49346cee-fba5-40b5-a44e-b848bbe5995f','49346cee-fba5-40b5-a44e-b848bbe5995f',false,'sebunyagerald@outlook.com','Sebunya gerald','vendor','user',false,'2026-01-07T13:42:41.512Z'::timestamptz,'2026-01-07T13:57:51.774Z'::timestamptz,'f3e548f9-513c-474c-bb68-190a9cf8a8bd','Combine events management','Sebunya gerald','sebunyagerald@outlook.com','0706267242','Equatorial mall shop 501 William street','Basic Tier','approved',false,array['decorator','dj','entertainment','event_rentals','favors','gift_packaging','lighting_trussing_production','mc','pa','tents_parasols_shelters']::text[],'2026-01-07T13:57:15.443Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','bot_signup','0b1ff58b-e8ce-4578-9004-e2a565cf2abe','0b1ff58b-e8ce-4578-9004-e2a565cf2abe',false,'sherry@advantagelv.com','LqtCABqwTGxpFGaxKTqd','user','user',false,'2026-01-07T15:32:04.774Z'::timestamptz,'2026-01-07T15:32:45.886Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor','bot_signup','43b54b11-a3db-49e7-a837-cf059c72d899','43b54b11-a3db-49e7-a837-cf059c72d899',false,'lekoyo.xon95@gmail.com','kbIKZpHgHsoXhGqRAndfy','vendor','user',true,'2026-01-07T16:06:44.905Z'::timestamptz,'2026-06-19T19:54:35.399Z'::timestamptz,'14f72650-40a7-4092-9725-f63efeef25f3','TPuelVRwPrANnbol','kbIKZpHgHsoXhGqRAndfy','lekoyo.xon95@gmail.com','6781922261','uUWyTUWHPhimiShwv','Basic Tier','rejected',false,'{}'::text[],'2026-01-07T16:08:26.828Z'::timestamptz,'2026-01-18T13:13:49.558Z'::timestamptz),
  ('client','bot_signup','05d15bcf-1c7c-45d3-9daf-19bae1a4ff7c','05d15bcf-1c7c-45d3-9daf-19bae1a4ff7c',false,'boylew@wustl.edu','dgYVEUhYqbGTANHZNMjazU','user','user',true,'2026-01-07T17:15:57.944Z'::timestamptz,'2026-01-13T10:16:46.066Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','operator_excluded','078d2b3b-ec64-4579-9585-b2df9ac1db92','078d2b3b-ec64-4579-9585-b2df9ac1db92',false,'lwangacaleb@gmail.com','Lwanga Caleb','user','user',false,'2026-01-07T18:55:05.138Z'::timestamptz,'2026-01-07T18:55:05.125Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','admin_role','d4250a29-761d-4de6-8363-f1a2597dde4f','d4250a29-761d-4de6-8363-f1a2597dde4f',false,'lwangacalebb@gmail.com',null,'user','admin',false,'2026-01-07T18:58:52.607Z'::timestamptz,'2026-01-07T18:58:52.607Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'bb8b7b56-006e-4a06-8c3d-8ba1477a9388','bb8b7b56-006e-4a06-8c3d-8ba1477a9388',false,'joan.kimora60@gmail.com','Joan Kimora','vendor','user',false,'2026-01-08T06:29:19.671Z'::timestamptz,'2026-01-08T10:29:35.785Z'::timestamptz,'5b4e4849-ff7f-48ba-b818-55d9c0e82fae','HAPPY BLENDS AND BREWS','Joan Kimora','joan.kimora60@gmail.com','0752488608','Uganda','Basic Tier','approved',false,'{}'::text[],'2026-01-08T06:37:20.691Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'0f7147bc-a4d0-4ea8-8e2c-744d12cc5808','0f7147bc-a4d0-4ea8-8e2c-744d12cc5808',false,'tulizabridal@gmail.com','Tuliza Bridal','vendor','user',false,'2026-01-08T07:05:00.154Z'::timestamptz,'2026-01-08T07:05:00.153Z'::timestamptz,'182fa561-a011-4011-a733-d3fe5240f6b4','Tuliza Bridal Home','Tuliza Bridal','tulizabridal@gmail.com','''+256772991073','Bukoto','Professional','approved',false,array['bridal_shoes_accessories','gowns','jeweler','meeting_venues','photographer']::text[],'2026-05-20T10:49:33.716Z'::timestamptz,'2026-06-20T00:01:39.403Z'::timestamptz),
  ('vendor',null,'b667e32a-f933-4800-b9f5-49e7167b474c','b667e32a-f933-4800-b9f5-49e7167b474c',false,'nalugwajoanitah31@gmail.com','Nalugwa Joanitah','vendor','user',false,'2026-01-08T10:10:16.043Z'::timestamptz,'2026-01-08T10:29:42.396Z'::timestamptz,'95f8f634-985b-4c3e-a4e9-5d3cd17e8007','Nitand Events','Nalugwa Joanitah','nalugwajoanitah31@gmail.com','''+256779003015','Equatorial mall shop 519, opp KCCA','Basic Tier','approved',true,array['decorator','event_rentals','favors','florist','furniture_rentals','gift_packaging','wedding_planner']::text[],'2026-01-08T10:23:41.246Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'aed5a809-191c-46e4-b7f6-a2ff0b9e072c','aed5a809-191c-46e4-b7f6-a2ff0b9e072c',false,'lulagalaronald@gmail.com','Ronald Lulagala','vendor','user',false,'2026-01-08T12:31:01.426Z'::timestamptz,'2026-01-08T12:34:54.418Z'::timestamptz,'d2bb69e6-e47a-4d32-8538-95beb306188b','Ronnie events','Ronald Lulagala','lulagalaronald@gmail.com','0776008043','Equatorial mall Room 557','Basic Tier','approved',false,array['decorator','event_rentals','furniture_rentals','lighting_trussing_production']::text[],'2026-01-08T12:34:23.808Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'623b61d2-bf03-41b4-8595-d1e3d6b450a9','623b61d2-bf03-41b4-8595-d1e3d6b450a9',false,'agabawensi@gmail.com','agaba','vendor','user',false,'2026-01-08T13:01:06.493Z'::timestamptz,'2026-01-08T13:07:32.765Z'::timestamptz,'bb326590-727c-4fd9-8297-7b13b8b2af42','Agaba events','agaba','agabawensi@gmail.com','''+256775967393','Equatorial  mall, opp kcca . Room 556','Basic Tier','approved',false,array['decorator','event_rentals','juice_beverages','kids_play','photo_booths','wedding_planner']::text[],'2026-01-08T13:07:16.598Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'e62dc7df-f97f-4439-982b-ddfc223f8e51','e62dc7df-f97f-4439-982b-ddfc223f8e51',false,'nandawulafaithphoebe@gmail.com','Nandawula Faith Phoebe','vendor','user',false,'2026-01-08T14:01:56.702Z'::timestamptz,'2026-01-08T14:15:07.528Z'::timestamptz,'43c0b1e1-e529-4a2f-b90b-441f405b8c2c','Snowwhite  Impressions','Nandawula Faith Phoebe','nandawulafaithphoebe@gmail.com','0706399806','Equatorial mall RM 562','Basic Tier','approved',false,array['decorator','event_rentals','furniture_rentals','lighting_trussing_production','photo_booths']::text[],'2026-01-08T14:14:39.637Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'ae0882fe-38d0-4d57-bd98-90fd49067bbd','ae0882fe-38d0-4d57-bd98-90fd49067bbd',false,'pristinebridals@gmail.com','Catherine','vendor','user',false,'2026-01-09T11:28:40.970Z'::timestamptz,'2026-01-09T11:50:37.700Z'::timestamptz,'d68f5908-d398-488a-bff1-8d28d86b9948','Pristine Bridals','Catherine','pristinebridals@gmail.com','''+256700773224','MM MM Plaza, Luwum Street, Level 1, Shop F23','Basic Tier','approved',true,array['bridal_shoes_accessories','event_rentals','gowns','lingerie_intimates','suits','vendor_management','wedding_planner']::text[],'2026-01-09T11:50:22.558Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('vendor',null,'7ad46e35-257c-45aa-982c-a8e63f21f206','7ad46e35-257c-45aa-982c-a8e63f21f206',false,'p.atwine@gmail.com','Peace Karimba','vendor','user',false,'2026-01-09T13:37:30.737Z'::timestamptz,'2026-01-09T13:46:38.645Z'::timestamptz,'61c9645c-be6c-4bf4-8c78-2ca5ff713d89','IKONDERE FASHIONS','Peace Karimba','p.atwine@gmail.com','0758552500','Kampala','Basic Tier','approved',true,array['gowns','jeweler','traditional_attire']::text[],'2026-01-09T13:46:10.341Z'::timestamptz,'2026-01-18T12:10:44.593Z'::timestamptz),
  ('client','operator_excluded','pr9RyDeOHHnorhRzpnFHoB7TkMX3XN8o','164fca97-0fdb-97e1-e875-f34160d32339',true,'blendproug@gmail.com','Lwanga Caleb','user','user',false,'2026-01-13T09:28:08.053Z'::timestamptz,'2026-01-13T09:29:26.775Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','operator_excluded','FrGbpBT3GcwwVGKTPtqelxXGUZ8v8exq','46512a25-8ce8-e131-7eb3-78ea4fa5d1dc',true,'shopoboniire@gmail.com','Lwanga Caleb','user','user',false,'2026-01-13T09:39:57.201Z'::timestamptz,'2026-01-13T09:41:35.841Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','operator_excluded','0nnP8dIeqTKxO4FGmJo73mCtyQUs0JKd','6878d39d-8f48-047c-2879-6e4b70871f0e',true,'caleb.lwanga@maximusglobal.net','Lwanga Caleb','user','user',false,'2026-01-13T09:51:00.987Z'::timestamptz,'2026-01-13T09:51:27.866Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'bXhfYa9LxjRi1UdGMIXAX8167YKjamI9','3ce2ddae-80c4-e687-9ee6-046a817b75b5',true,'cbmtvmedia@gmail.com','CBM TV','user','user',false,'2026-01-18T15:00:52.637Z'::timestamptz,'2026-01-18T15:01:24.604Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'dkZMGyEO1eJosLaZkUOVKXFrcc8kMSQw','67a21546-0b06-adb7-f53d-74a9dd21e1e6',true,'gighubsigma@gmail.com','Tester1','user','user',false,'2026-02-01T15:19:32.943Z'::timestamptz,'2026-02-01T15:20:00.230Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor','test_account','7IsdUvyXitMvUHnEL1vnwBEezUWZQvRb','1f7e211f-3d85-5643-4161-505406a73797',true,'caleb@lwanga.com','Caleb Lwanga','vendor','user',false,'2026-02-01T23:02:08.051Z'::timestamptz,'2026-02-01T23:02:56.432Z'::timestamptz,'bd2d1363-6a34-48b7-8934-12deb4404062','Savanah Cakes Ltd','Savanah Sanyu','caleb@lwanga.com','256784275241','Kampala,Uganda','Basic Tier','approved',false,array['cakes']::text[],'2026-02-02T00:59:36.253Z'::timestamptz,'2026-05-21T10:13:49.184Z'::timestamptz),
  ('client','operator_excluded','mRyVozgQIdGMywxvZJ9VIKNp2Ft2foJP','13b6e2be-5127-3fda-517c-70c6e51705b2',true,'krkemisha8@gmail.com','Happy Happy','user','user',false,'2026-02-02T05:54:46.385Z'::timestamptz,'2026-02-02T05:57:18.095Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'8km32poxhg9S2EPbsWXV1riqEsx62zpG','35024b3b-f755-28f4-42f3-103d855af811',true,'ntambifoundation@gmail.com','Crownnkula Africa','vendor','user',false,'2026-02-02T17:23:06.249Z'::timestamptz,'2026-02-02T17:23:39.396Z'::timestamptz,'e9172e18-75fa-4391-b1f2-749cfe8d34f2','Crownnkula Africa Cultural Entertainment & Events','Abbey Ntambi','ntambifoundation@gmail.com','0773057912','Uganda','Basic Tier','approved',false,array['airbnb','decorator','dj','entertainment','event_rentals','honeymoon_destinations','lighting_trussing_production','mc','officiant_church','photographer','tents_parasols_shelters','traditional_attire','ushering','venue','wedding_planner']::text[],'2026-02-03T18:33:01.180Z'::timestamptz,'2026-02-08T11:34:10.217Z'::timestamptz),
  ('client','bot_signup','MGFs2jn8u2Fnjsk1X42GFiTfbQ89eaeS','f987c757-8d9b-8dce-8e24-dd56ebd92de1',true,'ahwang@mgmlaw.com','mDhenKKeBVkQWTCkBBRYTuM','user','user',false,'2026-02-02T18:10:07.348Z'::timestamptz,'2026-02-02T18:10:33.946Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'Dj4QLAD51fneQ5M1cwsAmObMLkUbwpsq','21dc0f6c-b349-c652-479d-9ff873966663',true,'reignbridalsignature@gmail.com','Susan Annet','vendor','user',false,'2026-02-03T08:58:44.160Z'::timestamptz,'2026-02-03T08:59:08.536Z'::timestamptz,'8a37480a-92ff-4933-ab17-ea87b299aeaf','Reign Bridal Signature','Susan Annet','reignbridalsignature@gmail.com','0782622958','Namaganda plaza level two F.40','Basic Tier','approved',false,array['bridal_shoes_accessories','gowns']::text[],'2026-02-03T09:14:08.137Z'::timestamptz,'2026-02-03T09:33:46.034Z'::timestamptz),
  ('vendor',null,'XoZlpuBVY3WZAbdhaORwMcoKAz0UY9Jt','3386b84d-2865-5be8-34c2-e4363843e4a2',true,'doreenkalule33@gmail.com','Doryn kikonyogo','vendor','user',false,'2026-02-03T10:21:30.701Z'::timestamptz,'2026-02-03T10:22:12.406Z'::timestamptz,'1b2d38c2-87b8-4337-aa65-ddb049cc48cb','Kalule elegant designs','Doryn kikonyogo','doreenkalule33@gmail.com','0752634555','Namaganda plaza level3 shop s20 and s15','Basic Tier','approved',false,array['bridal_shoes_accessories','gowns','hair_stylists','makeup_artist','traditional_attire']::text[],'2026-02-03T10:33:18.949Z'::timestamptz,'2026-02-03T10:42:05.042Z'::timestamptz),
  ('client','bot_signup','IDBxtYhNYSERB049UlBoVNp2dfjGhYc4','fd8b1c27-83e0-5201-167c-84affb8c7e23',true,'acallas@willowbridgepc.com','hKjYZqaFKUtsEUSZmZAVRcfv','user','user',false,'2026-02-04T06:16:39.229Z'::timestamptz,'2026-02-04T06:16:54.598Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'G5WRBFGV5b0y0B46TNFje10eRKd1ppdp','c23ff7ec-ce29-b565-73cc-7cfffc89b9bb',true,'jkroseband@gmail.com','Jolly Roseband','user','user',false,'2026-02-04T20:34:23.168Z'::timestamptz,'2026-02-04T20:35:24.416Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','Tkep0n0Gq77RohkAMO4Cf16lFqSTE9sx','d6dfd887-e678-81e9-597c-fd861dffbc22',true,'ablaho@singerlewak.com','tMGbQyOhszqJKnxLQC','user','user',false,'2026-02-05T08:05:52.190Z'::timestamptz,'2026-02-05T08:06:10.659Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','0XpNT1kKkSeqevuxqIQ6joHd5AD0NLcn','c6766ffe-4e55-a322-69b3-dbefc03e4c3a',true,'khanison@sgi.sk.ca','FABRkbSWGcROuINYsxraEEY','user','user',false,'2026-02-06T03:32:10.877Z'::timestamptz,'2026-02-06T03:32:33.064Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','NyYUVEJX608S8Pr0a9Ypc0HJtYURI6Ko','c0290687-c93a-58fc-9724-76625e612754',true,'iboga@allegisgroup.com','kgOSCWFrzpirtzpjhgmfOxR','user','user',false,'2026-02-06T03:50:37.519Z'::timestamptz,'2026-02-06T03:50:57.522Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','24kxyPqQP05gkRswkiYaIsRrmW6WSNrw','39a28a9c-077b-b50f-67a7-7bd7088de670',true,'echamberlain@hrgreen.com','ZjgUhKAnEowKLsDDa','user','user',false,'2026-02-09T22:12:38.188Z'::timestamptz,'2026-02-09T22:13:42.017Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','TGIJ6gLtUrN4qSNGbE91zdcPaWCQnO5c','fff47f01-1eb1-413c-b09f-a3e9c713bf00',true,'wchambers@mmccontractors.com','TEvgxMogvwSTAUrsXcnXLuok','user','user',false,'2026-02-10T04:15:24.977Z'::timestamptz,'2026-02-10T04:15:38.919Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','EgcMZLHgmh88x7uPdYrOWoU9KhtuDAVp','f7047758-d7d8-287d-360e-41d36b83e5ab',true,'c.obannon@echomaintenance.com','xNdmCnOIEgEEucQHczulnLn','user','user',false,'2026-02-12T03:16:20.345Z'::timestamptz,'2026-02-12T03:16:31.629Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','8NRVjFdjReGUv2RscyXVkdL8KvoLDdQM','a361b2da-99a3-edc3-5147-1bdf4f7b121f',true,'khernandez@boyden.com','tlvekHsrNuLimCaCqTXUeZC','user','user',false,'2026-02-12T05:59:54.597Z'::timestamptz,'2026-02-12T05:59:56.110Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'yzltcuJhOxzg4OL9mVJgRf1AIFgzy1Ut','da4d19c3-649c-dfe6-605e-270bd0bde459',true,'namyalowinniefred@icloud.com','Namyalo winniefred','vendor','user',false,'2026-02-12T11:31:33.832Z'::timestamptz,'2026-02-12T11:33:48.921Z'::timestamptz,'9375a31e-29ee-4e88-99b9-a991e467a723','Shiloh petals and decor','Namyalo Winniefred','namyalowinniefred@icloud.com','''+256751924772','Arua park plaza B1-436 Kampala- Uganda','Basic Tier','approved',false,array['decorator','florist','gift_packaging','wedding_planner']::text[],'2026-02-12T11:42:05.266Z'::timestamptz,'2026-02-12T12:16:41.541Z'::timestamptz),
  ('vendor',null,'d0NIIUQzLUI2tNvpU98GRf3pMi9l6EwC','c0153053-6f38-3565-4a0c-244e1c32e798',true,'dbatuuka@gmail.com','Lydia Batuuka','vendor','user',false,'2026-02-12T13:34:46.930Z'::timestamptz,'2026-02-12T13:36:02.800Z'::timestamptz,'b2b687a6-4a2c-4d8e-82cb-d16f73db029a','Jabez Events','Lydia Batuuka','dbatuuka@gmail.com','''+256772635272','Arua park, shop B1, 436','Basic Tier','approved',false,array['decorator','event_rentals','favors','florist','gift_packaging','lighting_trussing_production','photo_booths','tents_parasols_shelters']::text[],'2026-02-12T13:42:00.925Z'::timestamptz,'2026-02-12T14:01:24.879Z'::timestamptz),
  ('vendor',null,'bR2TVoticBMnG5RKSW8jcyrdO9WTMxHy','e64b93c7-62ad-3fac-f737-7467d71136a3',true,'kidenwanyirehema@gmail.com','Kiden Wanyi Rehema','vendor','user',false,'2026-02-12T14:29:21.028Z'::timestamptz,'2026-02-12T14:29:45.632Z'::timestamptz,'774b63c1-7981-4a5f-ab9c-f2b5a203c9c0','Remy’s Bags & Gifts','Kiden Wanyi Rehema','kidenwanyirehema@gmail.com','''+256 708215495','Burton Street, new pioneer Mall, Shop No PH 60','Basic Tier','approved',false,array['cakes','decorator','florist','gift_packaging','interior_designers']::text[],'2026-02-12T14:40:31.843Z'::timestamptz,'2026-02-12T14:55:57.826Z'::timestamptz),
  ('client','bot_signup','lYf8POyZW1HICg5kPFgrS73AVj4hGmAQ','676a2d75-36b9-ed1e-2d58-7108dd6084a5',true,'kbaxter@pragermetis.com','KLKvgfNNWZPWerVUi','user','user',false,'2026-02-13T13:47:14.006Z'::timestamptz,'2026-02-13T13:47:36.621Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','C02VaH6FhtPu3QLUHXbONLPsD762IgVN','76206fa6-1050-283f-ee51-ca21b387cbf5',true,'tammi.tertocha@glickco.com','qPEOShtgzBEZHfoXNa','user','user',false,'2026-02-13T16:57:56.348Z'::timestamptz,'2026-02-13T16:57:58.283Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','d4XVFlcjyRnhLl2CqN3yY4titbBrz7fw','b13e05bc-9f43-93f1-5ae0-56be213d9e34',true,'dmartin@highmarkres.com','OyrYuGlyIEaoQWxBIqYLCyph','user','user',false,'2026-02-13T17:50:25.284Z'::timestamptz,'2026-02-13T17:50:26.831Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','pDD2mSoM6WYW6HjLjtZaylgnDSTKMooT','2aeae909-b9fa-ee36-023f-b4744c6211f2',true,'kelly.stroker@noaa.gov','FLOTpAvBGuwYfcbvjiTKwSj','user','user',false,'2026-02-15T14:42:05.640Z'::timestamptz,'2026-02-15T14:45:48.868Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'rHw4BfEQLwq9xgYBCQUDlnOMHeTM5ces','50c1e9b9-445f-82ec-8c4d-96aa50de86dd',true,'immykaila12@gmail.com','Immaculate Namayanja','vendor','user',false,'2026-02-18T14:36:02.589Z'::timestamptz,'2026-02-18T14:36:16.123Z'::timestamptz,'5dafdbbd-8e12-4513-b7c6-eedccdb8f931','Manja','Immaculate Namayanja','immykaila12@gmail.com','''+256777600452','Uganda','Basic Tier','approved',false,array['bridal_shoes_accessories','gift_packaging','lingerie_intimates']::text[],'2026-02-18T14:41:25.161Z'::timestamptz,'2026-02-18T14:56:16.929Z'::timestamptz),
  ('client',null,'nMysf62r1ZrFNnDusCZ5sHOxqD3uOsAb','bcf30f1b-4970-99af-7d6a-aa0463b70a93',true,'hemtujunwe07@gmail.com','STREAMSIDE PARK','user','user',false,'2026-02-23T10:51:37.906Z'::timestamptz,'2026-02-23T10:52:02.672Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'pqiWFDPLmomo0fQGTxlmuf5KPEKUdk3o','de7c0121-9379-f20b-ab52-169830471442',true,'aitajprince100@gmail.com','Winzer','user','user',false,'2026-02-27T14:26:56.954Z'::timestamptz,'2026-02-27T14:29:52.906Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'sbtsFw7Igg1PZ70ZMXMTqdWytTVRRaxe','e3798091-8c9b-2cc6-1700-fb7524517712',true,'jmazzi00@gmail.com','JACQUELINE MAZZI','user','user',false,'2026-03-06T08:40:48.420Z'::timestamptz,'2026-03-06T08:41:07.907Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'X1nff3KkcqHtn9XmSI3R0ord99zM0BG0','944920c6-7327-d797-6a05-97eea1bc8889',true,'deodantatuhire@gmail.com','Atuhire Deodanta','user','user',false,'2026-03-10T18:48:02.214Z'::timestamptz,'2026-03-10T18:50:28.451Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','VqJT8rUzS4V8Tean8xZlv5kDd72nTlQo','8538beae-203f-f7ac-17b5-a1ba3c26a946',true,'lmckenna@maplelodgefarms.com','MAbHoVBBpHckMyqaZklrtqpg','user','user',false,'2026-03-10T21:29:13.755Z'::timestamptz,'2026-03-10T21:35:24.188Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'TGyvqe0ycwUNPMcT2Y5Z2Uhb0XYO82uC','7387b979-7c0d-6d4a-0614-b96090727a04',true,'janetkyomukama@gmail.com','Janet Kyomukama','vendor','user',false,'2026-03-10T21:37:53.345Z'::timestamptz,'2026-03-10T21:38:15.939Z'::timestamptz,'5b99756c-61ad-4246-9ddd-74c078b28b5c','One Living','Janet Kyomukama','janetkyomukama@gmail.com','''+256788422241','Kungu,  Kampala','Professional','approved',false,'{}'::text[],'2026-03-10T21:45:13.555Z'::timestamptz,'2026-03-15T04:23:19.589Z'::timestamptz),
  ('client','bot_signup','SNTbiBGaJahhwj6DQvpu3NgOnEZ9KKGq','d2b72c10-784c-d856-5efc-aac7b745fc44',true,'melinda.herring@lsicorp.com','XJzXKRVCdCiBBbTCO','user','user',false,'2026-03-11T10:42:55.553Z'::timestamptz,'2026-03-11T10:42:57.363Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','operator_excluded','HgbdjDWeZirRUP3xWxuRJiU1pTrlWOqI','edeeeafb-5814-fde9-5f47-64741bc79028',true,'lwangac0leb@gmail.com','Caleb Lwanga','user','user',false,'2026-03-14T19:58:16.903Z'::timestamptz,'2026-03-14T19:58:29.897Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'QwYDrLoNJCb9DK88VQlhSgODzpghS8st','fe893cb8-7cda-87c5-12c0-dfbb882f474c',true,'gilliangodwill@gmail.com','Gillian Godwill','vendor','user',false,'2026-03-14T20:21:18.565Z'::timestamptz,'2026-03-14T20:21:48.845Z'::timestamptz,'543669e0-11fb-40b0-954c-faeff6e0211a','Beautiful somethings events/Bubblish Yoghurt/ Eirene Eating House','TWESIGYE GILLIAN GODWILL','gilliangodwill@gmail.com','''+256701553990','Mbarara,  Kampala','Professional','approved',false,array['caterer','decorator','florist','gift_packaging','juice_beverages','tea_coffee','wedding_planner']::text[],'2026-03-14T20:29:29.056Z'::timestamptz,'2026-04-03T18:52:30.110Z'::timestamptz),
  ('client',null,'7O6QhQIqgqkXemMRRyCBuxBefHfNkaNE','fbcd06e0-eaef-82ef-fcc4-12478e2bf3d3',true,'jesca2002ma@gmail.com','JESCA MIREMBE NAKITANDA','user','user',false,'2026-03-14T21:34:19.463Z'::timestamptz,'2026-03-14T21:34:39.669Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'0aEMTJkl0YxMxVyfoaWFFAyGnMJ3lEVP','23e9aabc-1826-659b-878a-9dc9d3056030',true,'arinaitweshan@gmail.com','Arinaitwe Shillah','user','user',false,'2026-03-14T21:42:37.019Z'::timestamptz,'2026-03-14T21:43:03.777Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'CVdXv1CfiaTavdLq2KSUqyNNiFOeA8bg','8adbc843-6221-01f4-2dd1-465f94fed4ff',true,'aggrey2day@gmail.com','Aggrey','user','user',false,'2026-03-15T06:27:41.359Z'::timestamptz,'2026-03-15T06:28:20.535Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'DmwQlvyu6yRbwRwzA3wEZd14toEnPpfq','7df76b3f-8dd5-d4f3-8698-33c9a571ba9e',true,'bestcarrentaluganda@gmail.com','Best Car Rental Uganda','user','user',false,'2026-03-15T11:22:54.998Z'::timestamptz,'2026-03-15T11:23:14.756Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'NLuXKP2GiSte32v84ovgHBxmCE84Zon2','a9576553-b740-a63d-bd41-70ad448be779',true,'valkays44@gmail.com','Valeria Lubowa','vendor','user',false,'2026-03-15T16:05:47.360Z'::timestamptz,'2026-03-15T16:06:11.856Z'::timestamptz,'90fa942f-692e-4229-af2c-79b0eaf80f37','Beula 75','Valeria Lubowa','valkays44@gmail.com','0776135450','Equotorial Mall, Level 1, 620','Professional','approved',false,'{}'::text[],'2026-03-15T16:11:47.698Z'::timestamptz,'2026-03-15T16:12:38.108Z'::timestamptz),
  ('client',null,'8Km3JaMs8JW2wnvXWvsltVDNcKKRYEI9','fc73ca07-f902-c1e5-3f22-54fe8083c4b5',true,'kahil3mc@gmail.com','Hilda Karungi','user','user',false,'2026-03-15T21:04:26.129Z'::timestamptz,'2026-03-15T21:04:58.021Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'stdJXLOBb3aXrIWJVAhe99wPtQdKRwGN','172f1da0-e479-c77f-f899-6c46a09cb1a4',true,'agnesnyamwiza8@gmail.com','Twesigye Agnes Nyamwiza','user','user',false,'2026-03-16T09:12:01.469Z'::timestamptz,'2026-03-16T09:12:21.971Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'xrsEoS6qaz3H5jAROPi1REaOaHDge2Nj','1c117df4-3c64-1b57-07db-0a70a17a5c98',true,'amanyap36@gmail.com','Amanya Prize','vendor','user',false,'2026-03-16T12:24:09.756Z'::timestamptz,'2026-03-16T12:24:27.709Z'::timestamptz,'29175c01-c707-46d9-b62f-a154281b3876','Vertex Gadgets','Amanya Prize','amanyap36@gmail.com','''+256701513415','Kampala,Uganda','Professional','approved',false,'{}'::text[],'2026-03-16T12:31:12.265Z'::timestamptz,'2026-03-16T17:19:26.426Z'::timestamptz),
  ('vendor',null,'SDebOc6VvWsT5LRFh4dPom0IAbV4OjuA','e8184efe-26da-b57e-91f2-3c8564e07661',true,'opsjoel@gmail.com','Joel Opus','vendor','user',false,'2026-03-17T03:32:45.629Z'::timestamptz,'2026-03-17T03:33:06.154Z'::timestamptz,'9292cdf3-57f9-48cc-8515-c8a4eb48539e','Haven Kreatives','Joel Opus','opsjoel@gmail.com','''+256778841251','Kireka','Professional','approved',false,'{}'::text[],'2026-03-17T13:09:58.553Z'::timestamptz,'2026-03-21T05:55:46.213Z'::timestamptz),
  ('client',null,'yv3VDyfpCk4RRy6RDWRfeEBXVPbd4c9W','d2684de1-4f09-0fb7-9a64-1331fe2748d9',true,'mugabijonan7@gmail.com','Jonan Mugabi','user','user',false,'2026-03-19T04:15:31.624Z'::timestamptz,'2026-03-19T04:15:54.279Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'UaiF1BskDHlKsGhwyYyOT6GGzvk6q6z1','29b47585-c46f-1c85-e990-957b171d7dd8',true,'martinsajayi200@gmail.com','Martins Ajayi','user','user',false,'2026-03-20T18:54:27.827Z'::timestamptz,'2026-03-20T18:54:56.785Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'ynGm8ObUVXHMT9EYC92OjkOlGRC8njKr','d3ffa801-4b2d-6545-0f53-41706dfafc7c',true,'okolimongpeter365@gmail.com','Okolimong Peter','user','user',false,'2026-03-20T23:00:51.673Z'::timestamptz,'2026-03-20T23:01:39.253Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'hq1M2aII9BwC4gYKYivXDKoEjo2G2Cio','535cef18-24f8-b977-a151-e81dcef6bf7a',true,'anyinetommy68@gmail.com','tomi suits','user','user',false,'2026-03-21T08:35:01.045Z'::timestamptz,'2026-03-21T08:35:27.139Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'Uk01HWQaWHEI4wOVDA3YLDkRPiHNSrMy','ff892708-b067-a8d4-a2be-c1df331a9b51',true,'mjjmwine@gmail.com','Happy','vendor','user',false,'2026-03-28T17:35:04.742Z'::timestamptz,'2026-03-28T17:35:29.873Z'::timestamptz,'87a56bb9-dfd6-4f5a-91f7-dc8f98bda988','Happy Juice','Happy','mjjmwine@gmail.com','''+256706131370','Ntinda','Professional','approved',false,array['juice_beverages']::text[],'2026-03-28T17:37:13.729Z'::timestamptz,'2026-03-28T17:40:42.948Z'::timestamptz),
  ('vendor',null,'tsanDUucfTc2WpkzHY2H0SwAlxFdov5w','3bc129d3-f82a-94e2-f035-4b113daf587c',true,'whitelaceevsales@gmail.com','White Lace Events','vendor','user',false,'2026-04-03T07:54:31.287Z'::timestamptz,'2026-04-03T07:55:26.794Z'::timestamptz,'e7e638ab-87bc-4dc2-8551-2553dc3e3486','White Lace Events','White Lace Events','whitelaceevsales@gmail.com','''+267 71648259','Botswana','Professional','approved',false,'{}'::text[],'2026-04-03T08:00:30.431Z'::timestamptz,'2026-04-03T08:42:35.197Z'::timestamptz),
  ('vendor',null,'al0TzJCa5IcbUq5J0RR3L9dpKj929f9C','bbcf05a4-f397-e39c-58e4-8b594b62e38a',true,'dianemg93@icloud.com','Diana Goodluck Mamkwe','vendor','user',false,'2026-04-03T11:01:54.372Z'::timestamptz,'2026-04-03T11:02:10.467Z'::timestamptz,'6619d9cc-e799-4a33-ba3d-10afb7b904b9','Ballitos Events','Diana Goodluck Mamkwe','dianemg93@icloud.com','''+255769987171','Dar-es-salaam, Tanzania','Professional','approved',false,array['decorator','wedding_planner']::text[],'2026-04-03T11:10:38.093Z'::timestamptz,'2026-04-03T11:31:42.173Z'::timestamptz),
  ('client',null,'W7sm3NfLheM67fswonWtShbqBcKQFuqo','3f43d154-9f37-8f8f-9fa0-a99e47c3f75c',true,'isable2007@gmail.com','Jael Nakalema','user','user',false,'2026-04-03T11:35:59.022Z'::timestamptz,'2026-04-03T11:37:08.841Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'yU8K1KFEqXgpuldLDLiqv3mTxmGgEgWk','a3e69811-6f3b-6d26-f879-da3728d12405',true,'bmwclubug@gmail.com','Kikule samuel','user','user',false,'2026-04-07T11:43:03.007Z'::timestamptz,'2026-04-07T11:43:34.354Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'vuMOT2268dllvy6ASNJr3MoX1ewhDITt','790fe0f7-cb8f-7c0a-855b-b653774de910',true,'reservations@genesiscampsite.ug','GENESIS GARDENS AND CAMPSITE','vendor','user',false,'2026-04-14T13:22:42.650Z'::timestamptz,'2026-04-14T13:23:12.873Z'::timestamptz,'98d9a467-9ab1-42f2-b90e-ecad8c03753b','GENESIS GARDENS AND CAMPSITE','GENESIS GARDENS AND CAMPSITE','reservations@genesiscampsite.ug','''+256777979994','Nabuti-Nsube Mukono','Professional','approved',false,array['affordable_housing','airbnb','cakes','caterer','decorator','entertainment','event_rentals','honeymoon_destinations','juice_beverages','kids_play','meeting_venues','pa','photo_booths','tea_coffee','tents_parasols_shelters','tour_guide','transportation','venue','wedding_planner']::text[],'2026-04-14T13:43:02.776Z'::timestamptz,'2026-05-16T00:00:50.774Z'::timestamptz),
  ('client',null,'d67J2nbfm1T2Rl6n3rrUw4Z1Eqc3ZHz1','b2c7b53f-f69f-e42c-3c9c-99aab51dc0bd',true,'musahopy3@gmail.com','Hope Musasizi','user','user',false,'2026-04-21T17:52:47.139Z'::timestamptz,'2026-04-21T17:53:57.542Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'3CWCMz4FAkRDFarqoZ1XOa3HMScYEs0q','6969edad-1ff8-e0a4-66a0-76c42073e3cc',true,'unimiteevents@gmail.com','UNIMITE EVENTS','user','user',false,'2026-04-23T09:45:10.086Z'::timestamptz,'2026-04-23T09:45:44.819Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'09xbBKdDNCGIdv2ky12fB6gj9uf5DCgG','fe3ce900-65d7-b95a-a49c-7912d68bcb6b',true,'kennethowachigiu@gmail.com','Kenneth Owachigiu','user','user',false,'2026-04-26T15:37:49.943Z'::timestamptz,'2026-04-26T15:38:06.095Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'y1G6S7X2LlG7cQGhWUufsGz79awrZSrA','23b5b11c-a905-d76c-b76c-12963958061e',true,'services.eviteexpress@gmail.com','E-vite Express','vendor','user',false,'2026-04-28T13:01:22.355Z'::timestamptz,'2026-04-28T13:01:44.005Z'::timestamptz,'ad863348-9114-47e9-8bc7-8286ea6f4d2d','E-vite Express','E-vite Express','services.eviteexpress@gmail.com','''+25674300000','kampala_uganda','Professional','approved',false,'{}'::text[],'2026-04-28T13:17:54.996Z'::timestamptz,'2026-04-29T11:14:35.774Z'::timestamptz),
  ('client',null,'DH6bk0CJpZNclKn6XvFPGGO0ZkMCO0uF','1c36331b-2ef0-c6ed-69a6-05e6b237a192',true,'djstarkidmrfreshvibes@gmail.com','Dj starkhid mr fresh vibes','user','user',false,'2026-04-29T14:49:57.954Z'::timestamptz,'2026-04-29T14:50:33.381Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','ieJwbHOjmGpg7NizBMhyguMQcLXEbn3K','be8f0fe6-7396-4a9e-26f0-fe0127b5c210',true,'leoben@hitthaller.at','yNjViNBLnMQpVEpVu','user','user',false,'2026-05-03T20:44:03.333Z'::timestamptz,'2026-05-03T20:44:07.115Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'Rcy6CLHbd2kBvjvgA9j5O8NVJs5Rk3JG','d3b3c8fa-9f3a-1edd-610a-ad75c6fa5694',true,'14evnts@gmail.com','prince','user','user',false,'2026-05-07T19:03:06.033Z'::timestamptz,'2026-05-07T19:03:22.120Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','yNKB3z8nLvo2i2rOmKBoKoryKuZGLlnK','39a43b1d-ab3c-ee57-ef8f-661865ba155e',true,'james.white@lhcgroup.com','SlcYpmVqNGWkcnwWTiSovo','user','user',false,'2026-05-07T19:47:18.608Z'::timestamptz,'2026-05-07T19:47:26.365Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'n1mBEYa5a08EgoURnVSAB2a5vODErbbK','625ca73e-1f15-b538-5927-9d5c1195e8b8',true,'stevenmusokeofficial@gmail.com','Steven Musoke','user','user',false,'2026-05-08T20:06:16.999Z'::timestamptz,'2026-05-08T20:07:23.746Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'4CxgmwebloRbpaaEZO7nEzpSPWeOxKxG','e4bbe734-2c96-7f15-dd00-b7596ce8c62f',true,'treasuredworldbridals@gmail.com','Rosette Kanya','vendor','user',false,'2026-05-11T12:13:21.697Z'::timestamptz,'2026-05-11T12:13:43.018Z'::timestamptz,'e048641a-3a49-48e9-9777-aa18c1b703aa','TREASURED WORLD BRIDALS','Rosette Kanya','treasuredworldbridals@gmail.com','0704294417','JBK PLAZA SHOPF8 FIRST FLOOR ON LUWUM STREET KAMPALA','Professional','approved',false,'{}'::text[],'2026-05-11T12:25:16.301Z'::timestamptz,'2026-05-11T12:35:05.485Z'::timestamptz),
  ('vendor',null,'99qI10Y4bRRyS75GZU5H15faS3idvkKK','883c9770-8868-91e4-409c-45e15d30bf95',true,'enochnailsug@gmail.com','Enoch Nails','vendor','user',false,'2026-05-11T14:31:42.498Z'::timestamptz,'2026-05-11T14:33:16.214Z'::timestamptz,'a16facaf-b0c5-4e87-ae03-d12146e9c85c','Enoch Nails','Enoch Nails','enochnailsug@gmail.com','''+256774354701','Shop 313, Equatorial mall, Kampala Uganda','Professional','approved',false,array['nail_technicians']::text[],'2026-05-11T14:38:01.491Z'::timestamptz,'2026-05-11T14:58:20.335Z'::timestamptz),
  ('vendor',null,'8shAbiDkBcwpe8FLe0eUCtckz2R1UTkR','6bf797d0-81a8-9e72-1dfb-f1eb608a6903',true,'orie.kasigaire@gmail.com','ORIE KASIGAIRE','vendor','user',false,'2026-05-17T21:27:53.131Z'::timestamptz,'2026-05-17T21:28:31.524Z'::timestamptz,'8c444754-7388-4882-97c5-1ea3a4846d27','AMBBERLY bridal shoes','ORIE KASIGAIRE','orie.kasigaire@gmail.com','''+256705398753','Kampala, Uganda','Professional','approved',false,array['bridal_shoes_accessories']::text[],'2026-05-17T21:33:35.830Z'::timestamptz,'2026-05-18T06:03:31.194Z'::timestamptz),
  ('vendor',null,'gXpoClfQtQ68tEv46hor556dE7IzpkDV','92e2b2d8-bd0f-ecde-bc61-2571685c1502',true,'moseskal27@gmail.com','Alma Juice','vendor','user',false,'2026-05-18T12:03:04.483Z'::timestamptz,'2026-05-18T12:03:24.590Z'::timestamptz,'69c45496-3625-4c88-8f80-88ba48fb3294','Alma Juice','Alma Juice','moseskal27@gmail.com','''+256789961189','Munyonyo','Professional','approved',false,array['juice_beverages']::text[],'2026-05-18T12:43:21.016Z'::timestamptz,'2026-05-20T09:47:38.303Z'::timestamptz),
  ('client',null,'3lrhnCyAbNk2oU2uwUcZ6Edx3LKkwgjv','85d8ad35-bf57-b86b-3c18-78aa7cb19913',true,'drimaxphotography@gmail.com','Drimaxphotography','user','user',false,'2026-05-18T17:41:29.481Z'::timestamptz,'2026-05-18T17:41:42.865Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'fhfrXz06dvX8HxC4kk6R50ixqyQw6Kgg','2fe718d0-05c6-e47c-f06c-23468a96006a',true,'nandawulaagnes4@gmail.com','AGNES KITIIBWA','user','user',false,'2026-05-19T08:48:41.400Z'::timestamptz,'2026-05-19T08:49:33.041Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'aBV5yWpHW2VVF5yUdIkqgobGcBNQIqau','24e22cdc-06dd-960f-dfd9-847c8e4bc6c2',true,'deokatongole35@gmail.com','Katongole Tadeo','vendor','user',false,'2026-05-19T12:40:26.322Z'::timestamptz,'2026-05-19T12:41:21.265Z'::timestamptz,'602b1861-4f4b-4176-ba74-b3ea4d4a10d9','M&M simple pleasures catering services','Katongole Tadeo','deokatongole35@gmail.com','0701710283','Nabweru Naluma road','Professional','approved',false,array['caterer','juice_beverages','tea_coffee']::text[],'2026-05-19T12:45:26.511Z'::timestamptz,'2026-06-19T00:01:38.801Z'::timestamptz),
  ('vendor',null,'rQdLfbmXwc6gW1XuCbOCWVj1QQ0P1w92','eb60e328-281a-07ad-d76a-1b1746625390',true,'gladysnantunbwe@gmail.com','Nantumbwe Gladys','vendor','user',false,'2026-05-22T10:36:10.976Z'::timestamptz,'2026-05-22T10:37:46.322Z'::timestamptz,'f392ee5c-daab-4cf1-b08c-ed7efb97eb42','Gladen designs','Nantumbwe Gladys','gladysnantunbwe@gmail.com','''+256774183620','Kampala Uganda','Professional','approved',false,array['bridal_shoes_accessories','gowns','lingerie_intimates','traditional_attire']::text[],'2026-05-22T10:41:32.651Z'::timestamptz,'2026-05-22T11:15:37.994Z'::timestamptz),
  ('client',null,'ofEu06x3xZvHurpgJfQR2RGnxt4pLJf5','3ecd3e98-54f1-bacc-cf94-40ce028171af',true,'amanab.449@gmail.com','Amanuel','user','user',false,'2026-05-26T15:23:45.313Z'::timestamptz,'2026-05-26T15:23:54.854Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'Qb92nrWNxUxpLTbKvUu06zWke8lqk9Zb','02c5bb90-fb1f-03c4-bcc2-7da271e6c980',true,'katsdeejay350@gmail.com','Katongole Geofrey','vendor','user',false,'2026-06-02T12:18:22.132Z'::timestamptz,'2026-06-02T12:19:18.635Z'::timestamptz,'c9d45c64-d4b1-477c-837b-c91a66e6f166','Kats SOUND','Katongole Geofrey','katsdeejay350@gmail.com','''+256750121796','Kamapala','Professional','approved',false,array['dj','entertainment','mc','pa']::text[],'2026-06-02T12:21:33.058Z'::timestamptz,'2026-06-03T14:33:59.571Z'::timestamptz),
  ('vendor',null,'9JZWIz7ITW91IsPCOS2sSYHBbggoda8a','6ad21e9d-7b9a-3e64-49fe-f7e9e5d2e036',true,'miracletailored@gmail.com','Miracle tailored','vendor','user',false,'2026-06-02T13:18:15.202Z'::timestamptz,'2026-06-02T13:18:53.320Z'::timestamptz,'74b78c2e-d58f-4969-80ce-b12b0373c730','Miracle Tailored','Miracle tailored','miracletailored@gmail.com','''+256759844874','Kampala, Uganda','Professional','approved',false,'{}'::text[],'2026-06-02T13:21:15.413Z'::timestamptz,'2026-06-02T14:37:47.032Z'::timestamptz),
  ('client',null,'JYwesI1XZbWFwq3XnThckmFQiu2E7cG7','3d854924-866e-5083-ef6f-d33df7010da6',true,'hillarykatumwa@gmail.com','Katland Safaris','user','user',false,'2026-06-08T11:56:57.744Z'::timestamptz,'2026-06-08T11:57:25.278Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'dTvu5ktAC5J5NphzMFNU2dAaMQ5PCpnb','13158485-16a3-bd9b-6168-02b03e83b5c4',true,'acengdorothyp@gmail.com','Dorothy . A','user','user',false,'2026-06-08T13:27:41.147Z'::timestamptz,'2026-06-08T13:28:02.647Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'bHvUyHvbeC0YkwA1ZJbMVtLGgnN5ZUjj','1e7b56b3-f251-2cd2-b233-9753ec09759b',true,'brianzcakes@gmail.com','Brianz Cake','vendor','user',false,'2026-06-08T14:32:24.904Z'::timestamptz,'2026-06-08T14:35:43.110Z'::timestamptz,'9e48aa81-8f6c-45cd-9698-f33ed2fcdca2','Brianz Cakes Lira','Brianz Cake','brianzcakes@gmail.com','0761314786','Lira, Uganda','Professional','approved',false,'{}'::text[],'2026-06-08T14:45:28.032Z'::timestamptz,'2026-06-08T19:02:01.542Z'::timestamptz),
  ('client',null,'LnokStCB1eWCJ3X2ikWdbvTGe8wyhLTJ','e692951f-0237-8b5f-5659-be38d5b900ed',true,'princessorjoy@gmail.com','Jojo','user','user',false,'2026-06-08T15:48:30.358Z'::timestamptz,'2026-06-08T15:48:45.919Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'SyYPO9RtIKmD8KhSV16Pmn1G2lN48KHT','b7e6307d-4f45-00ad-30ec-ea68a2a1eabd',true,'mojeeb.eth@gmail.com','Mojeeb Titilayo','user','user',false,'2026-06-09T15:20:02.390Z'::timestamptz,'2026-06-09T15:20:45.659Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'1TKnLzrhpgHyM7rymQgp85KWmvyAayWu','2bba428c-1bc6-9b0a-208d-be8fb9cc7959',true,'amorenaluxe@gmail.com','AMORENA events','user','user',false,'2026-06-10T05:21:18.619Z'::timestamptz,'2026-06-10T05:21:39.746Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'FiNsccBbfdkoLjxEMoP8cERMLuB0t50z','ae177432-3006-f623-38dd-1e3d82a53c1d',true,'roylynae@gmail.com','Nandigobe Lydia','vendor','user',false,'2026-06-12T15:04:53.665Z'::timestamptz,'2026-06-12T15:05:07.499Z'::timestamptz,'27829c87-c6a6-4e0a-8fc2-3f6ae30a3c9d','LN Events Limited','Nandigobe Lydia','roylynae@gmail.com','''+256779681170','Equatorial mall, shop 214','Professional','approved',false,array['tents_parasols_shelters']::text[],'2026-06-12T15:08:26.320Z'::timestamptz,'2026-07-13T00:01:38.745Z'::timestamptz),
  ('vendor',null,'kFzMmSGTI01wAAFgRhoo6HH7jV5WJxsr','baaf1845-4a0b-7ded-168b-0832281b8138',true,'atikaidris59@gmail.com','Xywise bags and suitcases','vendor','user',false,'2026-06-15T07:23:41.623Z'::timestamptz,'2026-06-15T07:24:49.159Z'::timestamptz,'439ef95e-fb09-4b91-9cdf-3d72a17808fe','Xywise bags and suitcases','Xywise bags and suitcases','atikaidris59@gmail.com','0700578563','Pioneer mall opposite mapera building shop number pf 63','Professional','approved',false,'{}'::text[],'2026-06-15T07:27:47.198Z'::timestamptz,'2026-06-15T07:32:49.627Z'::timestamptz),
  ('vendor',null,'mqx4MzEPPgy9cL3OAnAZgugUqP30e0YA','325f1656-e96d-8e12-3dfe-787c825e0fb7',true,'tulisikiradoreen@gmail.com','Tulisikira Doreen','vendor','user',false,'2026-06-15T07:30:49.233Z'::timestamptz,'2026-06-15T07:31:15.397Z'::timestamptz,'69b70214-b284-44d1-94e5-faeab5c8f5db','Appnut Scents','Tulisikira Doreen','tulisikiradoreen@gmail.com','''+256740405491','Pioneer mall Pf 102','Professional','approved',false,'{}'::text[],'2026-06-15T07:42:38.068Z'::timestamptz,'2026-07-16T00:01:42.306Z'::timestamptz),
  ('client',null,'GBvEebr8divRiz9tr8ra0QpLkNlyaeBc','45d74ace-807c-79b8-ee86-c416f093bd1a',true,'nyamakobajudith1@gmail.com','Nyamakoba Judith','user','user',false,'2026-06-15T08:08:46.534Z'::timestamptz,'2026-06-15T08:09:22.877Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'OgckFepx9VW0eJqj1P459IqYCJnEgPRM','16c01ad4-0464-db9d-4fd0-79c0edec1a80',true,'janetnabasirye454@gmail.com','Nabasirye janet','vendor','user',false,'2026-06-15T08:14:58.029Z'::timestamptz,'2026-06-15T08:15:39.748Z'::timestamptz,'57fc37b4-d191-4382-93ad-2c0e54a6b492','Smart guys suits','Nabasirye janet','janetnabasirye454@gmail.com','''+256705356677','Luwum street Dtl plaza shop number 131 ground floor','Professional','approved',false,array['suits']::text[],'2026-06-15T08:22:16.212Z'::timestamptz,'2026-06-18T05:15:01.267Z'::timestamptz),
  ('vendor',null,'OuPJcECHR9zo8q1zNyjo9PfMdyJwE4Lr','50396ee8-2189-b128-5d1c-6182cdb5f792',true,'ssekittosimonmuchmney@gmail.com','Ssekitto Simon','vendor','user',false,'2026-06-15T08:41:42.519Z'::timestamptz,'2026-07-14T11:47:13.298Z'::timestamptz,'675975f8-90d2-48a1-a385-2b9dfaa5c092','24hrs Graphics Impressions','Ssekitto Simon','ssekittosimonmuchmney@gmail.com','''+256 783047549','Kampala, DTL Plaza Shop No. 150','Professional','approved',false,array['internet_provider','stationery']::text[],'2026-06-15T09:02:24.451Z'::timestamptz,'2026-07-16T00:01:46.684Z'::timestamptz),
  ('vendor',null,'3vqosmfRrwolmauKgwVO8rZpsV1gHvhX','dc8ccd89-2a9f-e62e-d26e-15def88c1b88',true,'b67713329@gmail.com','Prossy','vendor','user',false,'2026-06-15T09:44:58.186Z'::timestamptz,'2026-06-15T09:45:55.636Z'::timestamptz,'4098cd5e-5450-44df-813a-ad94c698e65f','Prossy cakes','Prossy','b67713329@gmail.com','''+256709495005','Kisaasi','Essential','rejected',false,'{}'::text[],'2026-06-15T09:49:35.020Z'::timestamptz,'2026-06-15T09:59:05.723Z'::timestamptz),
  ('vendor',null,'cHvYxZDg93bjtrBHOIltdXx70Vm7iWkP','6879d31e-d1f5-fa15-f944-f09ccbe0c99d',true,'beckybecky843@gmail.com','Becky Becky','vendor','user',false,'2026-06-15T10:06:13.826Z'::timestamptz,'2026-06-15T10:08:26.313Z'::timestamptz,'1a97a09d-80d9-4dac-81d6-5e3bc5e4d63c','JML bridal','Becky Becky','beckybecky843@gmail.com','''+256704980260','JBK building, ground floor shop number f16','Professional','approved',false,array['bridal_shoes_accessories','cakes','event_rentals','florist','gift_packaging','jeweler','suits','wedding_planner']::text[],'2026-06-15T10:24:47.917Z'::timestamptz,'2026-06-15T10:47:13.070Z'::timestamptz),
  ('vendor',null,'TYdTklcwHIJk1GRIER5cBjuclllXKQlv','0b5d9fa4-626c-d315-b290-3b0ab92413ce',true,'estherviolah96@gmail.com','Esther Violah','vendor','user',false,'2026-06-15T10:30:45.831Z'::timestamptz,'2026-06-15T10:31:21.491Z'::timestamptz,'c5479105-2f34-48d1-ab02-80a6bd76f918','JML Bridal centre','Esther Violah','estherviolah96@gmail.com','''+256 - 772671324','JBK First floor shop No 01','Professional','approved',false,'{}'::text[],'2026-06-15T10:39:47.745Z'::timestamptz,'2026-06-15T10:54:46.855Z'::timestamptz),
  ('vendor',null,'cPSRLaV1AsFeYHZnTEakb2hgpfYaocb7','a22579fa-d6a3-f924-9e19-d8afa60ff14d',true,'samsonkizito6@gmail.com','Kizito Samson','vendor','user',false,'2026-06-16T07:05:24.959Z'::timestamptz,'2026-06-16T07:06:04.261Z'::timestamptz,'37fe9e3f-e106-48c2-97d8-ff93e058c11f','Samson Cakes','Kizito Samson','samsonkizito6@gmail.com','''+256707214360','JBk plaza, first floor','Essential','rejected',false,'{}'::text[],'2026-06-16T07:08:20.819Z'::timestamptz,'2026-06-16T12:53:23.359Z'::timestamptz),
  ('vendor',null,'aUQXhgK8yumigp7buPe18asVSlUmlzdl','00ef3c17-4669-e778-9368-0f574ec773fc',true,'janenakawungu7@gmail.com','Nakawungu Jane','vendor','user',false,'2026-06-16T07:13:41.210Z'::timestamptz,'2026-06-16T07:13:59.100Z'::timestamptz,'d6e274ee-3a3b-4014-b5fc-6fea5f17e8c3','Nissi’s boutique','Nakawungu Jane','janenakawungu7@gmail.com','''+256752225770','Luwum street Kampala','Professional','approved',false,'{}'::text[],'2026-06-16T07:18:04.977Z'::timestamptz,'2026-06-16T07:52:35.618Z'::timestamptz),
  ('vendor',null,'MjznWDwihijB9JvUBdudxZzFtkF9phKF','c9c87cc2-bbb3-c528-d9fb-036367e2739d',true,'kalemam853@gmail.com','Rasta Nails','vendor','user',false,'2026-06-16T08:17:14.289Z'::timestamptz,'2026-06-16T08:18:32.846Z'::timestamptz,'5df5a99b-6b94-455c-a5dd-c0e119ca83d3','Rasta Nails','Rasta Nails','kalemam853@gmail.com','''+256703869927','William Street Temuseo plaza, level 3,RM 406.','Professional','approved',false,array['beauticians','makeup_artist','nail_technicians']::text[],'2026-06-16T08:32:58.275Z'::timestamptz,'2026-07-17T00:01:41.275Z'::timestamptz),
  ('vendor',null,'EQvwsrcjHAxNGkGNBcuY5qh5dClHr6Ja','e13de40b-f3de-23b5-69ff-c0b9296d8c46',true,'emmykalyango2@gmail.com','NAKATO EMMY','vendor','user',false,'2026-06-16T08:23:37.887Z'::timestamptz,'2026-06-16T09:08:29.393Z'::timestamptz,'151d7373-667a-4624-ad6f-10a097137280','Mosh enterprises','NAKATO EMMY','emmykalyango2@gmail.com','''+256787721062','Temisewo mpoza Luwum street kamapala','Professional','approved',false,array['traditional_attire']::text[],'2026-06-16T08:31:03.779Z'::timestamptz,'2026-06-16T12:24:25.492Z'::timestamptz),
  ('vendor',null,'r4oQ4cCR6rGJ6vbv527DyC4Kra1oFJfp','58084635-32c8-51b9-fc1f-e295b3e3ff71',true,'sylnambalirwa@gmail.com','Nambalirwa Slyvia','vendor','user',false,'2026-06-16T09:52:28.043Z'::timestamptz,'2026-06-16T09:53:44.925Z'::timestamptz,'09b48a64-26e4-4f7c-a0a3-ca9a7fde5906','Sylvia''s saloon','Nambalirwa Slyvia','sylnambalirwa@gmail.com','''+256704214001','Kampala ,Temisewo mpoza level 4 shop no.512','Professional','approved',false,array['beauticians']::text[],'2026-06-16T10:03:41.835Z'::timestamptz,'2026-07-17T00:01:45.652Z'::timestamptz),
  ('vendor',null,'CS9oVlb1hA1t3LsJ89KY04oYyy77h4HZ','de42767a-d8b7-886e-d100-a3883220a7d1',true,'lamygibson888@gmail.com','Male lameck','vendor','user',false,'2026-06-16T11:27:48.654Z'::timestamptz,'2026-06-16T11:29:35.319Z'::timestamptz,'59c36090-f0ea-4d6b-ab9f-03e7b97c1659','Lamy nails beauty parlour','Male lameck','lamygibson888@gmail.com','''+256759473668','Kampala majestic plaza','Professional','approved',false,'{}'::text[],'2026-06-16T11:31:33.388Z'::timestamptz,'2026-07-17T00:01:48.060Z'::timestamptz),
  ('vendor',null,'xhUNIiOCavdWyQnnRzbGTQDPlLKK0TM8','8f9f9f96-c7d7-ffdd-f350-b9d945d8cc0b',true,'jennydarisons7@gmail.com','Jenny Darisons','vendor','user',false,'2026-06-16T11:32:52.059Z'::timestamptz,'2026-06-16T11:33:33.256Z'::timestamptz,'ec247913-9bd7-41c4-8390-6381677f32ef','Jenny','Jenny Darisons','jennydarisons7@gmail.com','''+256748496220','Majestic plaza L55','Professional','approved',false,array['event_rentals','favors','florist','gift_packaging','gowns','invitations','juice_beverages','lighting_trussing_production','officiant_church','photo_booths','tents_parasols_shelters','wedding_planner']::text[],'2026-06-16T11:42:06.891Z'::timestamptz,'2026-06-16T13:23:03.334Z'::timestamptz),
  ('vendor',null,'O5SzmMFFbsOpaAMftizGBwKwkhfhjkmM','56038d63-4154-7800-6937-ddefde3e63e4',true,'tracyjewelys12@gmail.com','Tracy Brenda','vendor','user',false,'2026-06-16T12:07:34.495Z'::timestamptz,'2026-06-16T12:09:02.666Z'::timestamptz,'2726e636-c668-4b27-b05d-a3b6be80ad1c','Sasha Events','Tracy Brenda','tracyjewelys12@gmail.com','''+256788384723/ +256745009290','William Street, ground floor RM L248B','Professional','approved',false,array['beauticians','decorator','florist','gowns','invitations','kids_play','lighting_trussing_production','photo_booths','wedding_planner']::text[],'2026-06-16T12:51:01.554Z'::timestamptz,'2026-06-16T13:05:57.625Z'::timestamptz),
  ('vendor',null,'DE4sGonIinoAymWGrRhTLNbAmcUtzTko','6fc873bc-0a12-df7a-fb73-2b09c1a22e56',true,'mariambirungi15@gmail.com','Mariam Birungi','vendor','user',false,'2026-06-16T12:15:20.202Z'::timestamptz,'2026-06-16T12:15:47.370Z'::timestamptz,'920f8836-b35b-48bb-b6c1-e178b58e5860','Mia events and deco','Mariam Birungi','mariambirungi15@gmail.com','0703022496','Kampala majestic plaza basement L1 -55','Professional','approved',false,array['decorator','florist','gift_packaging','lighting_trussing_production','mc','photo_booths','photographer','wedding_planner']::text[],'2026-06-16T12:28:46.070Z'::timestamptz,'2026-07-06T15:56:27.337Z'::timestamptz),
  ('vendor',null,'uL43nAnSQg5oM9rwhuvC700p7hHlyKhY','96e364b3-a7cf-011f-7f27-01e60eb1b6c6',true,'rachelyawekigozi@gmail.com','Rachel K Yawe','vendor','user',false,'2026-06-17T09:02:44.071Z'::timestamptz,'2026-06-17T09:08:06.949Z'::timestamptz,'0a883851-8f5f-4b89-8706-f1d9170fce29','Yawe collections','Rachel K Yawe','rachelyawekigozi@gmail.com','''+256775424100','Kampala MM plaza ground floor shop no.L6','Professional','approved',false,array['gowns','suits','traditional_attire']::text[],'2026-06-17T09:11:48.585Z'::timestamptz,'2026-06-17T09:32:43.956Z'::timestamptz),
  ('vendor',null,'WLA6zGkL8sY3G59c0sjAdqA5i9XyEiqM','df4c7c08-6c63-047f-4f52-bc80bd3c9b8c',true,'prossyhector@gmail.com','Muluya Peter','vendor','user',false,'2026-06-17T10:29:27.531Z'::timestamptz,'2026-06-17T10:30:26.360Z'::timestamptz,'0b979f4a-07c9-4d2e-aa3c-bd56ab0cfc84','Stuart studio','Muluya Peter','prossyhector@gmail.com','''+256750826482','Kampala luwum street. Shop L22','Professional','approved',false,'{}'::text[],'2026-06-17T10:37:22.169Z'::timestamptz,'2026-06-17T11:15:03.675Z'::timestamptz),
  ('vendor',null,'DuAsRsJSVrXuBtne9vedfXEim9g5xd4N','13c43e64-e2c2-4459-d3f6-67c5a4e7ced0',true,'bristolleviticus.cn@gmail.com','Mulonzi Leviticus','vendor','user',false,'2026-06-17T20:03:37.949Z'::timestamptz,'2026-06-17T20:04:31.373Z'::timestamptz,'7dddc851-b419-44c3-8aeb-606e5a3c7e0e','Mukaaya breeders Namugongo','Mulonzi Leviticus','bristolleviticus.cn@gmail.com','078514303','Namugongo-Nsawo','Professional','approved',false,'{}'::text[],'2026-06-17T20:12:10.435Z'::timestamptz,'2026-06-18T05:48:35.759Z'::timestamptz),
  ('client',null,'kBg1lWDdgnYYngosSWPwFFKcFzemekpM','0ec58538-1f22-30ae-5571-29c13d1675c5',true,'nsubugadeogratius@gmail.com','Deogratius  Nsubuga','user','user',false,'2026-06-26T13:39:47.051Z'::timestamptz,'2026-06-26T13:40:08.290Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'bOdlnX0Jnz8FgVA4HD70KcMqo17yEIpP','27c364ee-2020-0635-3fa7-055d67cb3941',true,'rnamaganda3@gmail.com','Namaganda Rehema','vendor','user',false,'2026-06-26T13:47:40.221Z'::timestamptz,'2026-06-26T13:47:57.124Z'::timestamptz,'54ade7db-231d-4123-9db9-25eb970f110e','Rhema Visuals Ltd','Namaganda Rehema','rnamaganda3@gmail.com','0755311193','Wilson Rd Kampala Jesco Plaza CE-10','Professional','approved',false,array['airbnb','content_creators','makeup_artist','photographer']::text[],'2026-06-26T13:52:17.000Z'::timestamptz,'2026-06-26T14:21:28.846Z'::timestamptz),
  ('vendor',null,'9M92RD6jhbyzCvrpXc7BtTBV0Q8a35Ht','a03d7b58-ae73-89d9-8a03-268442c79e22',true,'judith.mutabazi@gmail.com','Judy','vendor','user',false,'2026-06-26T14:19:42.987Z'::timestamptz,'2026-06-26T14:20:03.334Z'::timestamptz,'744605d5-a373-4f2b-8612-2677522fcbbc','Judy''s bridal','Judy','judith.mutabazi@gmail.com','0777912566','Twese plaza, Wilson Rd Shop F5','Professional','approved',false,array['gowns','jeweler']::text[],'2026-06-26T14:26:54.752Z'::timestamptz,'2026-06-26T14:36:47.488Z'::timestamptz),
  ('vendor',null,'9zjFzic73BxTJrigxTijRydU3ADoNisI','0290b1f9-fd3a-f5f5-94a7-201e141a4665',true,'janatnabulime174@gmail.com','Janat','vendor','user',false,'2026-06-26T14:45:13.477Z'::timestamptz,'2026-06-26T14:46:09.745Z'::timestamptz,'66f5a4ac-391f-4672-83ea-684ea0f5d2e3','C4 bridal avenue','Janat','janatnabulime174@gmail.com','0708646904','Bweyogerere butto','Professional','approved',false,array['gowns']::text[],'2026-06-26T14:55:01.553Z'::timestamptz,'2026-06-26T15:03:29.989Z'::timestamptz),
  ('vendor',null,'6zEVC4pnBvkAWeBUlp6AEQIczPg4Suya','5a5cff40-6f6a-d2a3-5d08-06e9c4ec199c',true,'fitsumwoldu01@gmail.com','Fitsum Woldu','vendor','user',false,'2026-06-26T15:10:26.420Z'::timestamptz,'2026-06-26T15:10:49.688Z'::timestamptz,'69044f94-9579-4233-8306-7008d91f7802','Amanetto Bakery Cafe &Restaurant','Fitsum Woldu','fitsumwoldu01@gmail.com','''+256789892991','Near Legends, Forest mall','Professional','approved',false,array['cakes','caterer','icecream','juice_beverages','meeting_venues','tea_coffee','venue']::text[],'2026-06-26T15:18:00.370Z'::timestamptz,'2026-07-27T00:01:44.720Z'::timestamptz),
  ('vendor',null,'kUpmirxR2L0zstb8XtXUGVA8fwwxcOrA','ef3b44a2-2860-bd3f-76ef-eb5319148c3e',true,'andrew@silverspringshotelug.com','Andrew Bwanika','vendor','user',false,'2026-06-29T09:29:43.018Z'::timestamptz,'2026-07-01T05:29:37.951Z'::timestamptz,'a3ae239a-d906-4973-ae75-67126e126ae8','Silver Springs Hotel','Andrew Silver Springs','andrew@silverspringshotelug.com','''+256 702159802','Kampala, Uganda','Professional','approved',false,'{}'::text[],'2026-06-29T09:33:26.573Z'::timestamptz,'2026-07-01T16:14:21.566Z'::timestamptz),
  ('client','bot_signup','92CQVGxXYKaq1cA9YZeepYp0pGTV09xm','fffeae2c-86d8-6e22-21d5-129b5838eead',true,'sjk@sjkcpa.com','GNRWKleGYahmTpuRopAV','user','user',false,'2026-07-06T21:41:26.704Z'::timestamptz,'2026-07-06T21:41:49.092Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','Ohdw9f5sxmOlR5TLmnMEZnPuqUpl6Wa6','e0811830-ce1a-b053-8fff-9191dc9b044b',true,'sams@marqtrans.com','GAUlUamPKDAYNWnGzvvou','user','user',false,'2026-07-07T13:16:32.699Z'::timestamptz,'2026-07-07T13:17:38.229Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client','bot_signup','UOVYqRYiNRnDEFPawZze4mUwFxI9pfpa','36db78bc-ad66-a2d3-ac5f-d43bc6a014b5',true,'travisr@hurstharbor.com','mamemsQNjPmuOOtGzKf','user','user',false,'2026-07-08T04:58:01.448Z'::timestamptz,'2026-07-08T04:58:25.100Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'HfiBecxBd46u1tlJ6hHh8qVJuEDbqUSs','867bbba7-c28f-f802-2e3f-903ea5ed2ae5',true,'florence_achom@yahoo.com','ALVARIA EVENTS HIRE','vendor','user',false,'2026-07-17T09:03:21.342Z'::timestamptz,'2026-07-17T09:03:41.541Z'::timestamptz,'48c3e7af-0d18-47b2-8560-ea33026ba681','ALVARIA EVENTS HIRE','ALVARIA EVENTS HIRE','florence_achom@yahoo.com','0789469577','Kyato Complex B1-21 - Bombo road , Kampala','Professional','approved',false,array['decorator','event_rentals','florist']::text[],'2026-07-17T09:07:23.919Z'::timestamptz,'2026-07-17T09:15:09.056Z'::timestamptz),
  ('vendor',null,'H0eYJuBN1Ko5VXeCbFtD87Judi560XKY','244a8309-1ced-9505-3df7-8aa95ce179b5',true,'amadoshakilah5@gmail.com','Shakilah','vendor','user',false,'2026-07-17T13:33:08.984Z'::timestamptz,'2026-07-17T13:36:47.421Z'::timestamptz,'827c6c37-9bee-403d-a4a8-69cf5c4fcaed','Bouncing palour','Shakilah','amadoshakilah5@gmail.com','0787428705','Kampala uganda','Professional','approved',false,array['entertainment','kids_play']::text[],'2026-07-17T13:46:57.717Z'::timestamptz,'2026-07-17T13:55:07.508Z'::timestamptz),
  ('vendor',null,'xESDi7IxLNRIMr7pGKtD5OyRVHBMngov','ae3d8360-4536-1a81-f8e9-64876cf95481',true,'arindapatricia59@gmail.com','Patricia Arinda','vendor','user',false,'2026-07-17T15:32:02.488Z'::timestamptz,'2026-07-17T15:33:50.102Z'::timestamptz,'46cdc798-52aa-4dc5-b7ca-6de922789cea','Gold Rock Hotel','Patricia Arinda','arindapatricia59@gmail.com','0775943877','Kyaliwajala, Nabwojjo','Professional','approved',false,array['affordable_housing','caterer','dj','entertainment','honeymoon_destinations','meeting_venues','pa','tea_coffee','venue','wellness_spa']::text[],'2026-07-17T15:51:59.663Z'::timestamptz,'2026-07-17T16:09:56.150Z'::timestamptz),
  ('client',null,'O2DImOWFsIMl8WQm0uzY8f5fzqRgVsUB','538c0b4c-ae2c-85e6-38cf-111483646be1',true,'kawothark@gmail.com','Kawothar Kakiika','user','user',false,'2026-07-18T20:12:02.319Z'::timestamptz,'2026-07-18T20:14:11.626Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'bOLvkohJpZ8D9bXoDW4XsSHNCxPAMaDE','00cb09e2-2750-d5db-6b5e-7e2890102349',true,'nzizalaura4@gmail.com','Nziza Laura','vendor','user',false,'2026-07-20T12:57:55.375Z'::timestamptz,'2026-07-20T12:58:42.372Z'::timestamptz,'61048d35-d3a9-4d87-b436-65cf829b62d2','Maamakachai','Nziza Laura','nzizalaura4@gmail.com','''+256751994219','Kampala, Uganda','Professional','approved',false,array['caterer','juice_beverages']::text[],'2026-07-20T13:03:41.560Z'::timestamptz,'2026-08-20T00:01:38.801Z'::timestamptz),
  ('vendor',null,'2bsQ0GKwlX7mur5JoXM8LVwhagQJqMwY','614bfac0-250f-edc9-02dd-62707bcb9ba0',true,'ivannuwamanya2@gmail.com','NUWAMANYA IVAN','vendor','user',false,'2026-07-21T13:42:25.741Z'::timestamptz,'2026-07-21T13:42:51.638Z'::timestamptz,'26e7e329-294f-4e22-b775-d26aafa69c43','N''VANZ CULINA SERVICES LTD','NUWAMANYA IVAN','ivannuwamanya2@gmail.com','0781711409','Kampala,Uganda','Professional','approved',false,'{}'::text[],'2026-08-05T07:33:52.349Z'::timestamptz,'2026-08-10T07:34:15.072Z'::timestamptz),
  ('client',null,'2T9Q8AHJT24A0FBc8enpRksqOseuMWfa','5ea395b9-4a26-deba-8470-e04e162e9bc1',true,'leahwanyana63@gmail.com','Wannyana Leah Rebecca','user','user',false,'2026-08-05T20:24:01.999Z'::timestamptz,'2026-08-05T20:24:22.752Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'Y3fd6gtL4Pm4awDz7NVVMot0Smy1KaOY','340bb55a-b8bd-d4b6-7050-0a1bb0087820',true,'lubambulashilla@gmail.com','Shilla Tumwebaze','user','user',false,'2026-08-06T06:33:54.421Z'::timestamptz,'2026-08-06T06:35:02.594Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'X653xumKJksgON9CwmzxSzTqlKck9nFY','fdcf13e2-1fff-6318-2186-cd55bbfa3004',true,'tracybonita0@gmail.com','Tusiime Tracy Bonita','vendor','user',false,'2026-08-07T13:22:55.295Z'::timestamptz,'2026-08-07T13:23:17.141Z'::timestamptz,'2639e2a7-9d3b-4ff4-aa43-45e8d973d6a1','Zen Hospitality Solutions','Tusiime Tracy Bonita','tracybonita0@gmail.com','''+256701703573','Kampala Uganda','Professional','approved',false,'{}'::text[],'2026-08-07T13:29:48.063Z'::timestamptz,'2026-08-18T12:28:05.529Z'::timestamptz),
  ('client',null,'XqVtFp9P2vRT5Tep369X8ogkuraiyskr','6164852c-18d6-a28c-e060-39820f5d2abb',true,'mejaganrea256@gmail.com','MEJA REAGAN','user','user',false,'2026-08-10T15:02:04.791Z'::timestamptz,'2026-08-10T15:08:47.936Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'bJ5TiCL3pcusG3nrDsnsRGx12LYmwL9F','aab8f37b-f03a-7e76-390c-9ba56cd643f3',true,'harrisongabemedia@gmail.com','Harrison Gabe Media','vendor','user',false,'2026-08-10T20:10:08.256Z'::timestamptz,'2026-08-10T20:10:39.781Z'::timestamptz,'a56b6574-d1a5-45fd-8f6f-af555a710ad0','Harrison Gabe Media','Harrison Gabe Media','harrisongabemedia@gmail.com','''+256 759 381 149','Kampala, uganda','Professional','approved',false,'{}'::text[],'2026-08-10T20:18:40.366Z'::timestamptz,'2026-08-18T12:28:02.643Z'::timestamptz),
  ('client',null,'k90OIDFEwFsyb7JcwWSTfzmHK6XMZyWG','62fd9fac-faf0-440c-8b92-254d07c92d49',true,'arthuronaba@gmail.com','Arthur J.','user','user',false,'2026-08-17T06:55:46.488Z'::timestamptz,'2026-08-17T06:56:20.244Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('vendor',null,'ruh3c2JFIYmw2LkuZR88pKCujw7SwgMk','bb6a9250-2433-6836-0aec-a3d38649c489',true,'makulacakes3@gmail.com','NAMAKULA MARGARET','vendor','user',false,'2026-08-18T12:02:40.671Z'::timestamptz,'2026-08-18T12:06:10.274Z'::timestamptz,'764ed6fc-43d4-45a0-b9c2-caedfffe5464','GARET CAKES & MORE','NAMAKULA MARGARET','makulacakes3@gmail.com','''+256705531204','Namugongo & Mukono  district Uganda','Professional','approved',false,array['cakes','tea_coffee']::text[],'2026-08-18T12:18:45.095Z'::timestamptz,'2026-08-18T13:18:43.949Z'::timestamptz),
  ('client',null,'bteVrB1O3C3rULIN5PofOQDgDlA7rLFR','93261c56-3138-e701-408b-609e2b75d36e',true,'patriciachristine1@gmail.com','Patricia','user','user',false,'2026-08-18T12:19:34.645Z'::timestamptz,'2026-08-18T12:20:44.919Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'2Qcg0ukSiXv0RBRekkr2LfCiaqy9lmkK','5fdf5b68-f0bf-ac56-cef6-c6fd8d6381f9',true,'moenblends@gmail.com','Moen Blends','user','user',false,'2026-08-18T19:15:51.524Z'::timestamptz,'2026-08-18T19:21:12.832Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null),
  ('client',null,'4HKlGV2dBubAiXjDbmbow4Q80nK4VdAG','189c2967-d23b-c944-9155-552e35cb289c',true,'anatoleeventsug@gmail.com','Robinah Nalwoga','user','user',false,'2026-08-18T20:10:20.180Z'::timestamptz,'2026-08-18T20:10:42.184Z'::timestamptz,null,null,null,null,null,null,null,null,null,'{}'::text[],null,null)
;


-- =====================================================================
-- CITY DERIVATION RULES
--
-- `vendors` has two location columns and they are not the same thing:
--
--   business_location  the address line. Gets the legacy `location` string
--                      verbatim, dirt and all — it is what the vendor wrote
--                      about themselves and rewriting it would be inventing
--                      an address.
--   base_city          a city. It is indexed into `search_tsv` at weight B
--                      (20260618000004:104) and is what `public_vendor_
--                      search_rpc` matches a text query against, so it has
--                      to be one value per city, not forty.
--
-- The legacy field is one free-text box that produced, across 100 vendors,
-- 85 distinct strings: `Kampala`, `kampala`, `KampalA`, `Kamapala`,
-- `Kampala, Uganda`, `Kampala,Uganda`, `Kampala-uganda`, `kampala_uganda`
-- — and 40-odd downtown shop addresses that never say the city at all
-- (`Equatorial mall shop 501 William street`), two foreign addresses, and
-- one row of keyboard noise.
--
-- WHY A TABLE AND NOT A CASE EXPRESSION
-- A CASE buried in file 3 would be a derivation nobody could review. This
-- is the same logic as data you can read, sort, edit and re-run. File 2
-- prints what every one of the 85 strings resolves to, and if you disagree
-- with a single one you change a row here and re-run file 2 — no editing of
-- the import itself.
--
-- HOW IT RESOLVES
-- Highest `priority` among the matching patterns wins. A rule whose `city`
-- is NULL is an explicit refusal, not a miss — it is how an address in
-- Botswana avoids being swept into a Ugandan city. No match at all also
-- yields NULL, and NULL `base_city` is a supported state: the vendor is
-- still found by an unfiltered search and the onboarding wizard asks them
-- for their city on first sign-in.
--
-- 90  the city is named outright (including the four misspellings)
-- 80  a different Ugandan town is named
-- 75  a greater-Kampala neighbourhood is named
-- 70  a Kampala CBD landmark is named but no city is
-- 100 explicit refusals: foreign addresses and unusable strings
-- =====================================================================
create table public.migration_city_rules (
  pattern  text    not null,          -- ILIKE pattern, matched against `location`
  city     text,                      -- null = explicitly "no city"
  priority integer not null,
  note     text
);
revoke all on public.migration_city_rules from anon, authenticated;
alter table public.migration_city_rules enable row level security;

insert into public.migration_city_rules(pattern, city, priority, note) values
  -- 100 — explicit refusals. These must outrank everything, or 'Dar-es-salaam,
  -- Tanzania' would never be reached and a bare 'Uganda' would stay a city.
  ('%botswana%',           null, 100, 'foreign address — leave to onboarding'),
  ('%tanzania%',           null, 100, 'foreign address — leave to onboarding'),
  ('Uganda',               null, 100, 'country, not a city'),
  ('Lokes',                null, 100, 'unrecognisable'),
  ('uUWyTUWHPhimiShwv',    null, 100, 'keyboard noise'),

  -- 90 — the city is named. The three misspellings are in the data as
  -- written; `%kampla%` is defensive rather than observed.
  ('%kampala%',        'Kampala', 90, null),
  ('%kamapala%',       'Kampala', 90, 'misspelling present in the source'),
  ('%kampla%',         'Kampala', 90, 'defensive'),

  -- 80 — a different Ugandan town is named. Ranked BELOW Kampala on purpose:
  -- two rows name both ('Mbarara,  Kampala', 'Kampala, Wakiso , Uganda') and
  -- in each the vendor also wrote Kampala, which is the likelier base.
  ('%wakiso%',          'Wakiso', 80, null),
  ('%mukono%',          'Mukono', 80, null),
  ('%seeta%',           'Mukono', 80, 'Seeta is in Mukono district'),
  ('%jinja%',            'Jinja', 80, null),
  ('%entebbe%',        'Entebbe', 80, null),
  ('%mbarara%',        'Mbarara', 80, null),
  ('%lira%',              'Lira', 80, null),
  ('%gulu%',              'Gulu', 80, null),
  ('%masaka%',          'Masaka', 80, null),

  -- 75 — a greater-Kampala neighbourhood. Resolved to Kampala rather than to
  -- itself: `base_city` feeds a city filter, and forty one-vendor "cities"
  -- would make that filter useless.
  ('%bukoto%',         'Kampala', 75, 'greater Kampala'),
  ('%ntinda%',         'Kampala', 75, 'greater Kampala'),
  ('%kireka%',         'Kampala', 75, 'greater Kampala'),
  ('%kisaasi%',        'Kampala', 75, 'greater Kampala'),
  ('%kyanja%',         'Kampala', 75, 'greater Kampala'),
  ('%munyonyo%',       'Kampala', 75, 'greater Kampala'),
  ('%bugolobi%',       'Kampala', 75, 'greater Kampala'),
  ('%bweyogerere%',    'Kampala', 75, 'greater Kampala'),
  ('%namugongo%',      'Kampala', 75, 'greater Kampala'),
  ('%nabweru%',        'Kampala', 75, 'greater Kampala'),
  ('%kyaliwaj%',       'Kampala', 75, 'greater Kampala — two spellings in source'),
  ('%kungu%',          'Kampala', 75, 'greater Kampala'),
  ('%nabwojjo%',       'Kampala', 75, 'greater Kampala'),

  -- 70 — a Kampala CBD landmark, with no city named anywhere in the string.
  -- Every pattern below is a downtown Kampala mall, plaza or street that
  -- appears in the source. This is the tier to scrutinise hardest: it is the
  -- only one inferring a city the vendor did not write.
  ('%luwum%',          'Kampala', 70, 'Luwum Street, Kampala CBD'),
  ('%william street%', 'Kampala', 70, 'William Street, Kampala CBD'),
  ('%equatorial%',     'Kampala', 70, 'Equatorial Mall, Kampala CBD'),
  ('%equotorial%',     'Kampala', 70, 'Equatorial Mall — misspelling in source'),
  ('%equtorial%',      'Kampala', 70, 'Equatorial Mall — misspelling in source'),
  ('%pioneer mall%',   'Kampala', 70, 'Pioneer Mall, Kampala CBD'),
  ('%namaganda%',      'Kampala', 70, 'Namaganda Plaza, Kampala CBD'),
  ('%majestic plaza%', 'Kampala', 70, 'Majestic Plaza, Kampala CBD'),
  ('%jbk%',            'Kampala', 70, 'JBK Plaza, Kampala CBD'),
  ('%arua park%',      'Kampala', 70, 'Arua Park, Kampala CBD — NOT the town of Arua'),
  ('%burton street%',  'Kampala', 70, 'Burton Street, Kampala CBD'),
  ('%wilson rd%',      'Kampala', 70, 'Wilson Road, Kampala CBD'),
  ('%dtl plaza%',      'Kampala', 70, 'DTL Plaza, Kampala CBD'),
  ('%faibaah%',        'Kampala', 70, 'Faibaah Plaza, Kampala CBD'),
  ('%avemar%',         'Kampala', 70, 'Avemar Shopping Centre, Kampala CBD'),
  ('%twese plaza%',    'Kampala', 70, 'Twese Plaza, Kampala CBD'),
  ('%mm plaza%',       'Kampala', 70, 'MM Plaza, Kampala CBD'),
  ('%temisewo%',       'Kampala', 70, 'Temisewo/Temuseo Plaza, Kampala CBD'),
  ('%temuseo%',        'Kampala', 70, 'Temisewo/Temuseo Plaza, Kampala CBD'),
  ('%jesco%',          'Kampala', 70, 'Jesco Plaza, Kampala CBD'),
  ('%kyato complex%',  'Kampala', 70, 'Kyato Complex, Bombo Road'),
  ('%forest mall%',    'Kampala', 70, 'Forest Mall, Kampala');


-- =====================================================================
-- WHAT WAS LOADED
--
-- EXPECT exactly:
--   staged_rows 225 · to_import 172
--   clients 71 · vendors 98 · applicants 3
--   excluded_admin 3 · excluded_test 7 · excluded_bot 34 · excluded_operator 9
--   category_links 266 · blocked_to_import 1
--   id_verbatim 70 · id_derived 102 · id_collisions 0
--
-- Any other number means the CSV you have is not the one these files were
-- generated from. STOP and say so.
--
-- `blocked_to_import` is 1, not 5: four of the five accounts the legacy
-- platform had blocked are in the bot set and are excluded outright.
-- =====================================================================
select
  count(*)                                                                      as staged_rows,
  count(*) filter (where excluded_reason is null)                               as to_import,
  count(*) filter (where excluded_reason is null and legacy_kind='client')      as clients,
  count(*) filter (where excluded_reason is null and legacy_kind='vendor')      as vendors,
  count(*) filter (where excluded_reason is null and legacy_kind='applicant')   as applicants,
  count(*) filter (where excluded_reason = 'admin_role')                        as excluded_admin,
  count(*) filter (where excluded_reason = 'test_account')                      as excluded_test,
  count(*) filter (where excluded_reason = 'bot_signup')                        as excluded_bot,
  count(*) filter (where excluded_reason = 'operator_excluded')                 as excluded_operator,
  (select sum(cardinality(category_keys)) from public.migration_legacy_users
    where excluded_reason is null)                                              as category_links,
  count(*) filter (where excluded_reason is null and blocked)                   as blocked_to_import,
  count(*) filter (where excluded_reason is null and not user_id_derived)       as id_verbatim,
  count(*) filter (where excluded_reason is null and user_id_derived)           as id_derived,
  -- The derivation must not have collided, with itself or with a real UUID.
  (select count(*) - count(distinct user_id) from public.migration_legacy_users) as id_collisions
from public.migration_legacy_users;

-- The 53 exclusions, named, so they are a decision you can see rather than
-- rows that quietly failed to arrive. Read the `bot_signup` block in
-- particular: clearing a row's `excluded_reason` here is all it takes to
-- bring that account back into the import.
select excluded_reason, legacy_kind, user_registered_at::date as registered,
       email, full_name, business_name, blocked
from public.migration_legacy_users
where excluded_reason is not null
order by excluded_reason, user_registered_at;


-- =====================================================================
-- DERIVATION HELPERS
--
-- Defined here, in the staging file, so that file 2 (which shows you what
-- the import WILL do) and file 3 (which does it) run the SAME code. If the
-- derivations were written inline in both, they could drift, and the report
-- you approved would stop describing the import you ran.
--
-- All are `migration_`-prefixed and dropped by 99_rollback.sql. None is
-- granted to anon or authenticated.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PHONE — normalise, never invent.
--
-- The source is Excel-damaged and inconsistent: `'+256741656649`,
-- `'+256 782 839231`, `0784275243`, `07812327887`, `13655584477`. The
-- leading apostrophe is Excel's text marker; the spaces are typing.
--
-- The rule only promotes a number to E.164 when the shape is UNAMBIGUOUS:
-- a Ugandan mobile is 9 digits after the country code, so `0` + 9 digits
-- and `256` + 9 digits are safe to rewrite and nothing else is. An
-- 11-digit local number is one digit too long and a foreign number is not
-- ours to guess — both are returned cleaned but otherwise untouched, and
-- file 2 lists every one of them for you to look at.
--
-- Truncating to fit would be the worst option available: it produces a
-- plausible-looking number that belongs to somebody else.
-- ---------------------------------------------------------------------
create or replace function public.migration_norm_phone(p text)
returns text language plpgsql immutable as $$
declare v text;
begin
  if p is null then return null; end if;
  v := btrim(p);
  v := regexp_replace(v, '^''+', '');          -- Excel's text marker

  -- One vendor put TWO numbers in the box: `'+256788384723/ +256745009290`.
  -- Stripping punctuation first would weld them into a single 24-digit
  -- string that dials nobody — worse than the raw input, because it looks
  -- like a phone number. Split on the separator and keep the first.
  v := btrim(split_part(split_part(split_part(v, '/', 1), ',', 1), ' or ', 1));

  -- A plus is meaningful only in the leading position. Handled explicitly
  -- rather than with a lookahead, so the intent is legible on the page.
  if left(v, 1) = '+' then
    v := '+' || regexp_replace(substr(v, 2), '[^0-9]', '', 'g');
  else
    v := regexp_replace(v, '[^0-9]', '', 'g');
  end if;
  if v = '' or v = '+' then return null; end if;

  if v ~ '^\+256[0-9]{9}$' then return v; end if;                 -- already E.164
  if v ~ '^256[0-9]{9}$'   then return '+' || v; end if;          -- missing the plus
  if v ~ '^0[0-9]{9}$'     then return '+256' || substr(v, 2); end if; -- local mobile

  return v;   -- anything else: cleaned, not reshaped. Reported by file 2.
end;
$$;

-- ---------------------------------------------------------------------
-- CITY — highest-priority matching rule wins; no match is NULL.
--
-- `order by priority desc` with `limit 1` rather than an aggregate so that
-- an explicit refusal (a rule with city NULL at priority 100) beats a
-- lower-priority match instead of being mistaken for "no rule matched".
-- ---------------------------------------------------------------------
create or replace function public.migration_base_city(p_location text)
returns text language sql stable as $$
  select r.city
  from public.migration_city_rules r
  where p_location is not null
    and p_location ilike r.pattern
  order by r.priority desc, r.pattern
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- SLUG — `ux_vendors_slug` is unique, so this must not collide.
--
-- `approve_vendor` (20260618000014:101) builds the same shape but seeds the
-- suffix from `gen_random_uuid()`. That is right for a live approval and
-- wrong here: a re-run of this import would then produce a DIFFERENT slug
-- for a vendor that already exists, and public URLs would move. Seeding
-- from the vendor's own (legacy, preserved) id makes the slug a pure
-- function of the row, so the import is idempotent and the two vendors
-- sharing a business name — `Ruby Bakery` and `Unalloyed Spa` — still get
-- distinct slugs.
--
-- The trailing `btrim(...,'-')` matters: several business names end in a
-- space, which the character-class replace turns into a trailing hyphen.
-- ---------------------------------------------------------------------
create or replace function public.migration_slug(p_name text, p_vendor_id uuid)
returns text language sql immutable as $$
  select btrim(
           lower(regexp_replace(btrim(coalesce(p_name, 'vendor')), '[^a-zA-Z0-9]+', '-', 'g')),
           '-'
         ) || '-' || substr(md5(p_vendor_id::text), 1, 6);
$$;

-- ---------------------------------------------------------------------
-- PLAN — legacy tier to `pricing_plans.key`.
--
-- Nobody paid on the legacy platform (your Q4), so the tier is not a
-- commercial fact being carried over — it is the feature set the vendor's
-- 30-day trial runs on. It still has to be set: `tg_enforce_media_limit`
-- (20260618000014:200) resolves `portfolio_video` THROUGH
-- `subscriptions.plan_id`, and `coalesce(v_video,false) = false` RAISES.
-- A trial with a null plan would therefore mean no imported vendor could
-- upload a portfolio video during the onboarding this import is designed
-- to send them into.
--
-- `Essential` → starter (your answer). Both rows carrying it are rejected
-- vendors, which land hidden regardless.
-- ---------------------------------------------------------------------
create or replace function public.migration_plan_key(p_tier text)
returns text language sql immutable as $$
  select case btrim(coalesce(p_tier, ''))
           when 'Professional' then 'professional'
           when 'Basic Tier'   then 'starter'
           when 'Essential'    then 'starter'
           else                     'starter'
         end;
$$;

-- ---------------------------------------------------------------------
-- DISPLAY NAME — a profile names a human.
--
-- For 7 vendors the legacy `full_name` is the BUSINESS and
-- `contact_full_name` is the person: `Gifts & more ` / `Rebecca Nambuya`,
-- `DJ STEF ` / `Timothy Maganyi `. On one row they are different people
-- outright. `contact_full_name` is the field that was asked as "who are
-- you", so for vendors it wins where it exists; clients have no such field
-- and keep `full_name`.
--
-- The final fallback matches `handle_new_user` (20260802000002:63), which
-- uses the email local-part rather than leaving `profiles.full_name` — a
-- NOT NULL column — to fail.
-- ---------------------------------------------------------------------
create or replace function public.migration_display_name(
  p_kind text, p_full_name text, p_contact_name text, p_email text)
returns text language sql immutable as $$
  select coalesce(
           case when p_kind in ('vendor','applicant')
                then nullif(btrim(coalesce(p_contact_name, '')), '') end,
           nullif(btrim(coalesce(p_full_name, '')), ''),
           split_part(p_email, '@', 1)
         );
$$;

-- ---------------------------------------------------------------------
-- ONE-TIME PASSWORD
--
-- A SQL transliteration of `supabase/functions/_shared/password.ts`, so a
-- credential issued by this import is the same shape as one issued by
-- `create-staff` or `promote-intake`: 16 characters, at least one from each
-- class, ambiguous glyphs (0/O, 1/l/I) excluded because the string is
-- transcribed by hand from an email exactly once.
--
-- Randomness comes from pgcrypto's `gen_random_bytes`, which is the same
-- CSPRNG `gen_reference_token()` (20260807000002) draws on — not
-- `random()`, which is seeded and predictable.
--
-- `floor(byte / 256.0 * n)` is very slightly biased for n that do not
-- divide 256; over a 16-character password drawn from a 67-character
-- alphabet that is immaterial for a single-use credential the holder is
-- forced to replace on first sign-in. Say so rather than imply otherwise.
-- ---------------------------------------------------------------------
create or replace function public.migration_gen_password()
returns text language plpgsql volatile as $$
declare
  lower_c  text := 'abcdefghijkmnpqrstuvwxyz';
  upper_c  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  digit_c  text := '23456789';
  symbol_c text := '!@#$%^&*-_?';
  all_c    text;
  chars    text[] := '{}';
  b        bytea;
  i        int;
  j        int;
  tmp      text;
begin
  all_c := lower_c || upper_c || digit_c || symbol_c;
  -- Unqualified on purpose: pgcrypto lives in `public` on some projects and
  -- `extensions` on others (the 42883 that 20260916000002 was written to fix).
  -- Every file here opens with `set search_path = public, extensions`, and a
  -- plpgsql function with no `set search_path` of its own resolves against
  -- the caller's, so this finds it wherever it actually lives.
  b := gen_random_bytes(64);

  -- One guaranteed character per class, then fill to 16.
  chars := array[
    substr(lower_c,  1 + floor(get_byte(b,0) / 256.0 * length(lower_c))::int,  1),
    substr(upper_c,  1 + floor(get_byte(b,1) / 256.0 * length(upper_c))::int,  1),
    substr(digit_c,  1 + floor(get_byte(b,2) / 256.0 * length(digit_c))::int,  1),
    substr(symbol_c, 1 + floor(get_byte(b,3) / 256.0 * length(symbol_c))::int, 1)
  ];
  for i in 4..15 loop
    chars := chars || substr(all_c, 1 + floor(get_byte(b,i) / 256.0 * length(all_c))::int, 1);
  end loop;

  -- Fisher-Yates, so the four guaranteed classes are not always in the
  -- first four positions.
  for i in reverse 16..2 loop
    j := 1 + floor(get_byte(b, 16 + i) / 256.0 * i)::int;
    tmp := chars[i]; chars[i] := chars[j]; chars[j] := tmp;
  end loop;

  return array_to_string(chars, '');
end;
$$;

revoke all on function public.migration_norm_phone(text)                       from anon, authenticated;
revoke all on function public.migration_base_city(text)                        from anon, authenticated;
revoke all on function public.migration_slug(text, uuid)                       from anon, authenticated;
revoke all on function public.migration_plan_key(text)                         from anon, authenticated;
revoke all on function public.migration_display_name(text,text,text,text)      from anon, authenticated;
revoke all on function public.migration_gen_password()                         from anon, authenticated;
