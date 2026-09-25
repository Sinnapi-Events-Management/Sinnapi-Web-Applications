-- =====================================================================
-- Sinnapi — LEGACY IMPORT  ·  FILE 3 of 4  ·  THE IMPORT
--
--   RUN 00_preflight.sql, 01_staging.sql AND 02_validate.sql FIRST.
--   READ 02's output. This file is the only one that writes.
--
-- WHAT IT CREATES
--   172 auth.users + auth.identities   (71 clients · 98 vendors · 3 applicants)
--   172 profiles                        via the existing signup trigger
--   172 client role grants              via the same trigger
--    98 vendor role grants
--   101 vendor_applications             98 approved/rejected + 3 submitted
--    98 vendors
--    98 subscriptions                   trialing, 30 days from today
--   266 vendor_services
--    55 service_categories              45 new, 10 already seeded
--     1 audit_logs row
--
-- IT IS ONE TRANSACTION. The Supabase SQL editor wraps a multi-statement
-- script in one, so a raise anywhere below aborts everything — the same
-- contract supabase/reset-vendor-password.sql relies on. Nothing is ever
-- half-applied. Do not run it in pieces.
--
-- IT IS IDEMPOTENT. Every id it writes is either carried from the legacy
-- platform or derived deterministically from one (file 1's header explains
-- why), and every insert is `on conflict do nothing` or guarded by a `not
-- exists`. Running it twice imports nothing the second time. That is the
-- property that makes a production run recoverable rather than frightening.
--
-- ---------------------------------------------------------------------
-- THE THINGS IT DELIBERATELY DOES NOT DO
--
-- IT SENDS NO EMAIL. Your Q5: the front end is not deployed, so the
-- one-time passwords are generated and PARKED in
-- `migration_legacy_users.temp_password`. Nobody is notified. The final
-- section of this file tells you how to get them out when you are ready.
--
-- IT DOES NOT CALL `approve_vendor`. That RPC (20260618000014:95) is the
-- canonical way a vendor comes into being and this file reproduces all five
-- of its effects by hand — vendor row, trial subscription, application
-- marked approved, vendor role granted, slug minted. It cannot be called:
-- it gates on `has_permission('vendor.approve')`, which reads `auth.uid()`,
-- and `auth.uid()` is null in the SQL editor. Where this file departs from
-- it, the comment says so and why.
--
-- IT LEAVES `onboarding_completed_at` NULL ON EVERY VENDOR. The CSV has no
-- biography, category, pricing model, starting price, lead time, years in
-- operation, socials, national ID, proof of work, bank details, media or
-- service regions — very nearly everything a listing needs.
-- 20260916000001 built a wizard that collects exactly that on first
-- sign-in. Importing these vendors as incomplete routes all 98 into the
-- product's own repair path instead of a second hand migration later.
--
-- IT SETS NO `primary_category_id`. Your answer: the legacy categories all
-- become `vendor_services` rows and the vendor chooses their primary during
-- onboarding. Search and facets already match on services
-- (20260722000002:114), so nothing is lost in the meantime.
-- =====================================================================

set search_path = public, extensions;


-- =====================================================================
-- 0. GUARDS
--
-- Five things must be true before a production database is written to, and
-- each failure below is a different mistake that would otherwise pass
-- silently: no staging table (files run out of order), the wrong CSV
-- (counts disagree), a session that cannot actually write (RLS), missing
-- reference rows (null FKs downstream), or pgcrypto unreachable (the
-- password step dies at the last moment, after everything else).
-- =====================================================================
do $$
declare
  v_staged  int;
  v_scope   int;
  v_bypass  boolean;
begin
  if to_regclass('public.migration_legacy_users') is null then
    raise exception 'run 01_staging.sql first — there is nothing to import'
      using errcode = 'P0002';
  end if;

  select count(*), count(*) filter (where excluded_reason is null)
    into v_staged, v_scope
    from public.migration_legacy_users;

  if v_staged <> 225 then
    raise exception 'staging holds % rows, expected 225 — this is not the 2026-09-06 CSV', v_staged
      using errcode = 'P0003';
  end if;

  -- Not pinned to 172: you are explicitly invited to change `excluded_reason`
  -- after reading file 2, and doing so is meant to work. The bound is a
  -- sanity check, not a lock.
  if v_scope = 0 or v_scope > 225 then
    raise exception '% rows would be imported — refusing', v_scope using errcode = 'P0003';
  end if;

  select rolbypassrls into v_bypass from pg_roles where rolname = current_user;
  if not coalesce(v_bypass, false) then
    raise exception 'current_user % has no BYPASSRLS and every public table is FORCE RLS (20260618000011:25) — inserts would be silently refused', current_user
      using errcode = 'P0004';
  end if;

  if not exists (select 1 from public.roles where key='client')
     or not exists (select 1 from public.roles where key='vendor') then
    raise exception 'roles client/vendor missing — is 20260618000012 applied?' using errcode = 'P0005';
  end if;

  if not exists (select 1 from public.pricing_plans where key='starter' and billing_cycle='monthly')
     or not exists (select 1 from public.pricing_plans where key='professional' and billing_cycle='monthly') then
    raise exception 'monthly starter/professional plans missing — subscriptions would have a null plan_id, and tg_enforce_media_limit then blocks every portfolio video'
      using errcode = 'P0005';
  end if;

  -- Proves the function resolves NOW rather than 300 lines later.
  perform gen_salt('bf', 10);

  raise notice 'guards passed — % of % staged rows will be imported', v_scope, v_staged;
end$$;


-- =====================================================================
-- 1. THE TAXONOMY
--
-- 55 terms: the 54 you supplied, plus `Interior Designers`, which is in the
-- CSV on one vendor (`Remy's Bags & Gifts`) but was not on your list. Added
-- rather than dropped — it costs one row and saves a real category link.
--
-- TEN OF THEM REUSE KEYS THAT 20260618000012 ALREADY SEEDED rather than
-- minting a near-duplicate beside them:
--
--   Catering → caterer     Photographers → photographer   Florists → florist
--   Decor → decorator      Venue security/ bouncers → security
--   Makeup Artist → makeup_artist   Venue → venue   DJ → dj
--   Entertainment → entertainment   Mc → mc
--
-- `on conflict (key) do nothing` makes that reuse automatic AND makes this
-- whole block a no-op on a second run. It also means an existing category
-- KEEPS ITS CURRENT NAME — if production calls `caterer` "Caterer", it stays
-- "Caterer" and does not become "Catering". Renaming is a separate decision
-- about what the UI says, not something an import should do behind your back.
--
-- `videographer` and `equipment` are seeded but not on your list. They are
-- left exactly as they are: untouched, still active.
-- =====================================================================
insert into public.service_categories(key, name, sort_order) values
  ('caterer','Catering',1),
  ('photographer','Photographers',2),
  ('cakes','Cakes',3),
  ('florist','Florists',4),
  ('wedding_planner','Wedding planner',5),
  ('makeup_artist','Makeup Artist',6),
  ('venue','Venue',7),
  ('dj','DJ',8),
  ('pa','PA',9),
  ('officiant_church','Officiant/Church',10),
  ('jeweler','Jeweler',11),
  ('entertainment','Entertainment',12),
  ('event_rentals','Event rentals',13),
  ('transportation','Transportation',14),
  ('traditional_attire','Traditional Attire',15),
  ('gowns','Gowns',16),
  ('suits','Suits',17),
  ('favors','Favors(Smoke, fireworks & props)',18),
  ('bridal_shoes_accessories','Bridal shoes & accessories',19),
  ('decorator','Decor',20),
  ('invitations','Invitations',21),
  ('photo_booths','Photo booths',22),
  ('stationery','Stationery',23),
  ('vendor_management','Vendor management',24),
  ('security','Venue security/ bouncers',25),
  ('honeymoon_destinations','Honeymoon destinations',26),
  ('tour_guide','Tour guide',27),
  ('lighting_trussing_production','Lighting, trussing & production',28),
  ('counseling','Counseling',29),
  ('financier','Financier',30),
  ('insurance','Insurance',31),
  ('juice_beverages','Juice & beverages',32),
  ('tea_coffee','Tea & coffee',33),
  ('hair_stylists','Hair stylists',34),
  ('dentists','Dentists',35),
  ('wellness_spa','Wellness & Spa',36),
  ('nail_technicians','Nail technicians/ manicurists',37),
  ('beauticians','Beauticians',38),
  ('fertility_specialists','Fertility specialists',39),
  ('furniture_rentals','Furniture rentals',40),
  ('tents_parasols_shelters','Tents, parasols & shelters',41),
  ('content_creators','Content creators',42),
  ('mobile_charging','Mobile charging',43),
  ('internet_provider','Internet provider',44),
  ('affordable_housing','Affordable housing',45),
  ('icecream','Icecream',46),
  ('kids_play','Kids play (bouncing castles, swings, face art etc)',47),
  ('mc','Mc',48),
  ('ushering','Ushering',49),
  ('lingerie_intimates','Lingerie & intimates',50),
  ('gift_packaging','Gift packaging',51),
  ('meeting_venues','Meeting venues',52),
  ('cleaning_services','Cleaning services',53),
  ('airbnb','Airbnb',54),
  ('interior_designers','Interior Designers',55)
on conflict (key) do nothing;


-- =====================================================================
-- 2. COLLISION CHECK — decided here, recorded on the row
--
-- You said no vendor has registered on the new platform, and file 0 proved
-- it. This re-checks anyway, at the moment of writing rather than minutes
-- earlier, and records the verdict in `import_status` so that what was
-- skipped is a fact on the row and not something you have to infer from a
-- count that came up short.
--
-- Three keys can collide independently, so all three are checked. Email
-- first, because `ux_profiles_email` is the constraint that would actually
-- fire, and because an address already in use is the only case where a
-- human decision (merge? rename?) might be wanted.
-- =====================================================================
update public.migration_legacy_users m
   set import_status = 'skipped_email_exists'
 where m.excluded_reason is null
   and m.import_status is null
   and exists (select 1 from public.profiles p
                where lower(p.email::text) = m.email and p.deleted_at is null);

update public.migration_legacy_users m
   set import_status = 'skipped_user_id_exists'
 where m.excluded_reason is null
   and m.import_status is null
   and exists (select 1 from auth.users u where u.id = m.user_id);

update public.migration_legacy_users m
   set import_status = 'skipped_vendor_id_exists'
 where m.excluded_reason is null
   and m.import_status is null
   and m.vendor_id is not null
   and exists (select 1 from public.vendors v where v.id = m.vendor_id);


-- =====================================================================
-- 3. ONE-TIME PASSWORDS
--
-- Generated BEFORE auth.users, and stored, so the plaintext exists on the
-- row before it is needed as a hash. Doing it the other way round —
-- hashing inline inside the insert — would mean the only copy of the
-- password was a bcrypt digest, and since you are not mailing these yet
-- (your Q5), that copy is the whole point.
--
-- `where temp_password is null` so a re-run does not reissue credentials
-- for accounts that already have one. An operator who exported the list,
-- then re-ran this file, would otherwise be holding 172 passwords that no
-- longer work.
--
-- THE PASSWORD IS NOT WRITTEN TO auth, to profiles, or to audit_logs. It
-- exists in exactly one column, on a table with RLS on and no policies.
-- =====================================================================
update public.migration_legacy_users
   set temp_password = public.migration_gen_password()
 where excluded_reason is null
   and import_status is null
   and temp_password is null;


-- =====================================================================
-- 4. auth.users
--
-- Inserting here fires `handle_new_user` (20260802000002:47), which is the
-- product's own signup path and is used deliberately rather than worked
-- around: it creates the `profiles` row, grants the `client` role, and lets
-- `trg_public_id` mint the account's `SC…` identifier. Writing profiles by
-- hand instead would mean reimplementing three things that already work and
-- would collide with the public_id registry.
--
-- WHAT EACH COLUMN IS DOING
--
-- `email_confirmed_at` is set from the legacy registration date, not
-- `now()`. Every one of the 225 CSV rows has `email_verified = true`, so
-- these addresses were confirmed — on the old platform, on that date. It
-- also matters mechanically: `handle_new_user` reads this exact column to
-- decide `status`, and a null here would create 172 `pending` profiles that
-- `_evaluate_portal_access` then refuses to let in.
--
-- `confirmed_at` is NOT set and must not be. It is a generated column in
-- current GoTrue and any write to it fails the whole transaction.
--
-- The eight `*_token` columns are set to '' rather than left null. GoTrue
-- scans them into Go strings and a NULL raises `converting NULL to string
-- is unsupported` on the user's NEXT SIGN-IN — a failure that reads as a
-- broken login rather than as a data problem, long after this script has
-- been forgotten. Rows created through GoTrue itself already hold ''.
--
-- `raw_user_meta_data.role` is 'client' for everyone, including vendors.
-- That is correct and is not a downgrade: `profile_public_id_prefix`
-- (20260829000003:76) reads this field for the DISPLAY prefix only, and
-- 20260829000003's header says in as many words that a vendor's owner is
-- `SC` — the person is an account, the business is a separate `SV…` row.
-- Authorisation comes from `user_roles`, which section 6 writes.
--
-- `must_change_password` is true, so the vendor portal's ProtectedRoute
-- sends them to /change-password on first sign-in and the parked credential
-- is single-use.
--
-- `migrated_from` / `migration_batch` / `legacy_user_id` are stamped so
-- that "which accounts came from the import, and what were they called
-- before?" is one query forever, not archaeology.
-- =====================================================================
-- ---------------------------------------------------------------------
-- ONLY THE COLUMNS EVERY GoTrue VERSION HAS.
--
-- `auth` is not our schema. GoTrue migrates it on its own schedule, and the
-- column set genuinely differs between versions — a stock
-- supabase/postgres:17.6 image ships the 2020 bootstrap with no
-- `email_change_token_new`, no `banned_until` and no `auth.identities` at
-- all, while a live project has all three. A hardcoded column list is
-- therefore a script that works on the box it was written against and
-- fails, mid-transaction, on the one that matters.
--
-- So the INSERT names only what has been present since the beginning, and
-- the version-dependent columns are filled afterwards, each guarded by its
-- own existence check.
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000',
  m.user_id,
  'authenticated',
  'authenticated',
  m.email,
  crypt(m.temp_password, gen_salt('bf', 10)),   -- cost 10, what GoTrue writes
  m.user_registered_at,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'full_name',            public.migration_display_name(m.legacy_kind, m.full_name, m.contact_full_name, m.email),
    'role',                 'client',
    'must_change_password', true,
    'migrated_from',        'legacy',
    'migration_batch',      '2026-09-06',
    'legacy_user_id',       m.legacy_user_id
  ),
  m.user_registered_at,
  now()
from public.migration_legacy_users m
where m.excluded_reason is null
  and m.import_status is null
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- THE TOKEN COLUMNS MUST BE '', NOT NULL.
--
-- GoTrue scans these into Go strings. A NULL raises
-- `converting NULL to string is unsupported` on the user's NEXT SIGN-IN —
-- a failure that reads as a broken login rather than as a data problem,
-- long after this script has been forgotten. Rows created through GoTrue
-- itself already hold ''. supabase/reset-vendor-password.sql documents the
-- same trap.
--
-- Driven by a loop over `information_schema` so that a project missing any
-- of these columns (an older GoTrue) skips it instead of aborting the whole
-- transaction on a column that was never going to matter there.
-- ---------------------------------------------------------------------
do $$
declare
  c text;
  n int := 0;
begin
  foreach c in array array[
    'confirmation_token', 'recovery_token', 'email_change',
    'email_change_token_new', 'email_change_token_current',
    'phone_change', 'phone_change_token', 'reauthentication_token'
  ] loop
    if exists (select 1 from information_schema.columns
                where table_schema = 'auth' and table_name = 'users'
                  and column_name = c) then
      -- %L rather than a nest of doubled quotes: the empty string is passed
      -- as a parameter and quoted by format() itself, so there is nothing to
      -- miscount.
      execute format(
        'update auth.users u set %I = coalesce(u.%I, %L) '
        'from public.migration_legacy_users m '
        'where m.user_id = u.id and m.excluded_reason is null and m.import_status is null',
        c, c, '');
      n := n + 1;
    end if;
  end loop;
  raise notice 'auth token columns normalised to the empty string: % of 8 present on this project', n;
end$$;


-- =====================================================================
-- 5. auth.identities
--
-- WITHOUT THIS ROW THE ACCOUNT CANNOT SIGN IN. Current GoTrue resolves a
-- password sign-in through `auth.identities`, so an `auth.users` row on its
-- own produces an account that exists, looks complete in the dashboard, and
-- rejects its own correct password. It is the single most common way a
-- hand-written user import fails, and it fails silently until somebody
-- tries to log in.
--
-- `provider_id` is the user's id as text — the convention for the `email`
-- provider, where the provider's notion of "who" is just us.
--
-- `identity_data` carries `sub` and `email`; GoTrue reads both.
-- `last_sign_in_at` is null on purpose: nobody has signed in yet, and
-- claiming otherwise would also disable `resend-vendor-credentials`, which
-- refuses any account whose sign-in is already recorded.
--
-- The whole block is dynamic for the same reason as the tokens above: the
-- table did not always exist, and its own `id` column was added later
-- (before that, the primary key was (provider, provider_id)). Both shapes
-- are handled; a project with no `auth.identities` at all is told so rather
-- than failing.
-- =====================================================================
do $$
declare
  v_has_id boolean;
  v_n      int;
begin
  if to_regclass('auth.identities') is null then
    raise warning 'auth.identities does not exist on this project — skipping. If this is a live Supabase project, STOP: the imported accounts will not be able to sign in.';
    return;
  end if;

  select exists (select 1 from information_schema.columns
                  where table_schema='auth' and table_name='identities' and column_name='id')
    into v_has_id;

  if v_has_id then
    insert into auth.identities (id, provider_id, user_id, identity_data, provider,
                                 last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), m.user_id::text, m.user_id,
           jsonb_build_object('sub', m.user_id::text, 'email', m.email,
                              'email_verified', true, 'phone_verified', false),
           'email', null, m.user_registered_at, now()
    from public.migration_legacy_users m
    where m.excluded_reason is null and m.import_status is null
      and exists (select 1 from auth.users u where u.id = m.user_id)
      and not exists (select 1 from auth.identities i
                       where i.user_id = m.user_id and i.provider = 'email');
  else
    insert into auth.identities (provider_id, user_id, identity_data, provider,
                                 last_sign_in_at, created_at, updated_at)
    select m.user_id::text, m.user_id,
           jsonb_build_object('sub', m.user_id::text, 'email', m.email,
                              'email_verified', true, 'phone_verified', false),
           'email', null, m.user_registered_at, now()
    from public.migration_legacy_users m
    where m.excluded_reason is null and m.import_status is null
      and exists (select 1 from auth.users u where u.id = m.user_id)
      and not exists (select 1 from auth.identities i
                       where i.user_id = m.user_id and i.provider = 'email');
  end if;

  get diagnostics v_n = row_count;
  raise notice 'auth.identities: % email identities written', v_n;
end$$;


-- =====================================================================
-- 6. PROFILES — the two fields the trigger could not know
--
-- `handle_new_user` has already created every row with the right name,
-- email and status. Two things it does not carry:
--
-- created_at — it defaults to now(), which would say all 172 of these
--   accounts were created the day you ran this file. They were not, and the
--   admin console's "member since" would be a lie on every one of them.
--
-- phone — the current version of the trigger (20260802000002) writes only
--   id, full_name, email and status; the phone handling that 20260718000001
--   had was dropped when 0802b replaced it. So it is set here.
--
--   The source is `contact_phone`, not `phone_number`: the account phone
--   column is EMPTY on all 225 CSV rows, while 98 vendors have a contact
--   number. Your Q6 answer. `migration_norm_phone` promotes a number to
--   E.164 only when the shape is unambiguous and otherwise leaves it alone —
--   file 2 lists the 8 it declines to reshape.
--
-- `updated_at` is NOT preserved, and cannot be: `trg_updated_at`
-- (20260618000010:18) fires BEFORE UPDATE on every table that has the
-- column and overwrites it with now(). Since this IS an update, now() is
-- also the honest answer.
-- =====================================================================
update public.profiles p
   set created_at = m.user_registered_at,
       phone      = coalesce(p.phone, public.migration_norm_phone(m.contact_phone))
  from public.migration_legacy_users m
 where m.user_id = p.id
   and m.excluded_reason is null
   and m.import_status is null;


-- =====================================================================
-- 7. THE ONE BLOCKED ACCOUNT
--
-- Five accounts carried `blocked = true` on the legacy platform. Four of
-- them are in the bot set and are not imported at all, which leaves one.
--
-- Both halves are set, in the order `manage-vendor-account` uses: the
-- profile status first, then the auth ban. They are independent gates —
-- `_evaluate_portal_access` refuses any profile that is not `active`, and
-- GoTrue refuses a banned user — and an account with one set and not the
-- other is the confusing middle state that function's header warns about.
--
-- `blocked` rather than `suspended`: 20260810000001 draws the distinction
-- deliberately. `suspended` is temporary and must carry `suspended_until`;
-- this is a bar carried over from the old platform with no end date, which
-- is what `blocked` means.
--
-- 100 years rather than `infinity`, which some GoTrue paths handle poorly.
-- =====================================================================
update public.profiles p
   set status            = 'blocked',
       status_reason     = 'Blocked on the legacy platform; carried over by the 2026-09-06 import.',
       status_changed_at = now()
  from public.migration_legacy_users m
 where m.user_id = p.id
   and m.excluded_reason is null
   and m.import_status is null
   and m.blocked;

-- `banned_until` post-dates the original auth bootstrap, so it is guarded
-- the same way the token columns are.
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='auth' and table_name='users' and column_name='banned_until') then
    update auth.users u
       set banned_until = now() + interval '100 years'
      from public.migration_legacy_users m
     where m.user_id = u.id
       and m.excluded_reason is null
       and m.import_status is null
       and m.blocked;
  else
    raise warning 'auth.users has no banned_until on this project — the blocked account is stopped by its profile status alone.';
  end if;
end$$;


-- =====================================================================
-- 8. THE VENDOR ROLE
--
-- What `approve_vendor` does with `insert … select … where r.key='vendor'
-- on conflict do nothing` (20260618000014:122). `granted_by` is null rather
-- than `auth.uid()` — there is no acting user in the SQL editor, and a
-- fabricated grantor would be worse than an absent one.
--
-- The 3 applicants are NOT granted it. They have an application awaiting
-- review, not an approved business, and the vendor portal's gate is exactly
-- the thing that should keep them out until somebody approves them.
-- =====================================================================
insert into public.user_roles (profile_id, role_id)
select m.user_id, r.id
from public.migration_legacy_users m
cross join public.roles r
where r.key = 'vendor'
  and m.excluded_reason is null
  and m.import_status is null
  and m.legacy_kind = 'vendor'
on conflict do nothing;


-- =====================================================================
-- 9. vendor_applications
--
-- You asked for these specifically, and the schema needs them: every
-- `vendors` row points at one through `application_id`, the admin portal's
-- intake screens read them, and a vendor with a dangling application is a
-- vendor whose history the console cannot show.
--
-- 101 rows — 98 for the vendors, 3 for the applicants you asked to bring
-- across as pending (your Q1b).
--
-- THE ID IS DERIVED, NOT RANDOM. `gen_random_uuid()` would mean a re-run
-- created a second application for every vendor, since nothing else
-- identifies one. Seeding md5 from the vendor id (or, for an applicant, the
-- user id) makes the row a pure function of its subject, so `on conflict
-- (id) do nothing` actually does something on the second run.
--
-- STATUS
--   approved  → 'approved', decided_at = legacy vendor_updated_at
--   rejected  → 'rejected', decided_at = legacy vendor_updated_at
--   applicant → 'submitted', decided_at null — awaiting review, which is
--               what you asked for
--
-- `rejection_reason` is left NULL for the 6 rejected. The CSV records that
-- a decision was made and not why, and inventing a reason would put words
-- into a compliance officer's mouth on a record that is meant to be
-- evidence.
--
-- BUSINESS NAME FOR THE 3 APPLICANTS. The column is NOT NULL and those rows
-- have no `business_name` — they never got far enough to have one. Their
-- `full_name` is the only thing available, and for one of them it is
-- literally a business ('Orient events and hospitality Ltd'); the other two
-- are personal names, which is a fair description of a sole trader mid-
-- application. Flagged in `review_notes` so a reviewer is not misled.
--
-- Everything else — biography, category, pricing, lead time, years in
-- operation, registration number, tax id — is NULL. The CSV has none of it.
--
-- `trg_application_history` (20260618000010:89) fires on insert and writes
-- one `application_status_history` row per application, automatically. Note
-- that table is APPEND-ONLY (`tg_block_mutations`), so those 101 rows
-- cannot be removed by the rollback. They are harmless; see 99_rollback.sql.
-- =====================================================================
insert into public.vendor_applications (
  id, applicant_id, business_name, business_location, status,
  is_reapplication, review_notes, submitted_at, decided_at, created_at, updated_at
)
select
  md5('sinnapi-legacy-app:' || coalesce(m.vendor_id::text, m.user_id::text))::uuid,
  m.user_id,
  coalesce(nullif(btrim(m.business_name), ''), nullif(btrim(m.full_name), ''), 'Unnamed business'),
  m.location,
  case m.certification_status
    when 'approved' then 'approved'::application_status
    when 'rejected' then 'rejected'::application_status
    else                 'submitted'::application_status
  end,
  false,
  case
    when m.legacy_kind = 'applicant'
      then 'Imported from legacy platform 2026-09-06. Never completed a vendor record on the old platform; business name taken from the account name for want of any other value. Awaiting review.'
    else 'Imported from legacy platform 2026-09-06.'
  end,
  coalesce(m.vendor_registered_at, m.user_registered_at),
  case when m.certification_status in ('approved','rejected') then m.vendor_updated_at end,
  coalesce(m.vendor_registered_at, m.user_registered_at),
  coalesce(m.vendor_updated_at, m.user_updated_at, m.user_registered_at)
from public.migration_legacy_users m
where m.excluded_reason is null
  and m.import_status is null
  and m.legacy_kind in ('vendor', 'applicant')
on conflict (id) do nothing;


-- =====================================================================
-- 10. vendors
--
-- `id` is the legacy `vendor_id`, verbatim. All 100 were valid UUIDs (the
-- user ids were the ones that were not), so unlike accounts, every vendor
-- keeps the identifier the old platform gave it.
--
-- SLUG — `migration_slug` rather than `approve_vendor`'s inline expression.
-- Same shape, but the 6-character suffix is seeded from the vendor's own id
-- instead of `gen_random_uuid()`, so a re-run produces the SAME slug and
-- public URLs do not move. It is also what keeps the two pairs of
-- duplicate business names — `Ruby Bakery` and `Unalloyed Spa` — from
-- colliding on `ux_vendors_slug`. Verified: 98 vendors, 98 distinct slugs.
--
-- STATUS / VISIBILITY, from `certification_status` (your Q2):
--   approved → active  / public   — live and findable
--   rejected → hidden  / hidden   — present, invisible, one admin click
--                                   from being reinstated if that was wrong
--
-- `trial_ends_at` is 30 days from today. Nobody paid on the legacy
-- platform (your Q4), so this is not a renewal date being carried over — it
-- is a fresh trial starting the day you run this.
--
-- `primary_category_id` is null by your answer; section 12 writes the
-- categories as services instead.
--
-- `business_location` gets the legacy string verbatim. `base_city` gets
-- `migration_base_city`, whose every rule you can read in file 1 and whose
-- every result you can read in file 2. Six vendors resolve to NULL — two
-- foreign addresses, two unusable strings, two blanks — and a null
-- `base_city` is a supported state, not a defect.
--
-- `onboarding_completed_at` stays null. See the file header.
-- =====================================================================
insert into public.vendors (
  id, application_id, owner_id, business_name, slug,
  business_location, base_city,
  status, visibility, is_featured, trial_ends_at,
  created_at, updated_at
)
select
  m.vendor_id,
  md5('sinnapi-legacy-app:' || m.vendor_id::text)::uuid,
  m.user_id,
  btrim(m.business_name),
  public.migration_slug(m.business_name, m.vendor_id),
  m.location,
  public.migration_base_city(m.location),
  case when m.certification_status = 'approved'
       then 'active'::vendor_status else 'hidden'::vendor_status end,
  case when m.certification_status = 'approved'
       then 'public'::vendor_visibility else 'hidden'::vendor_visibility end,
  coalesce(m.featured, false),
  now() + interval '30 days',
  m.vendor_registered_at,
  coalesce(m.vendor_updated_at, m.vendor_registered_at)
from public.migration_legacy_users m
where m.excluded_reason is null
  and m.import_status is null
  and m.legacy_kind = 'vendor'
on conflict (id) do nothing;


-- =====================================================================
-- 11. subscriptions
--
-- One trialing subscription per vendor, 30 days from today — your Q4.
--
-- `plan_id` IS SET, and this is not decoration. `tg_enforce_media_limit`
-- (20260618000014:200) resolves `portfolio_video` by joining
-- `subscriptions → plan_features` through `plan_id`, and then does
-- `if coalesce(v_video,false) = false then raise`. A trial with a null plan
-- would therefore mean not one imported vendor could upload a portfolio
-- video during the onboarding this whole import is designed to send them
-- into. `approve_vendor` leaves it null; that is a gap this file does not
-- copy.
--
-- The legacy tier chooses which plan: Basic Tier → starter,
-- Professional → professional, Essential → starter (your answer; both rows
-- carrying it are rejected vendors). Nobody paid, so the tier is not a
-- commercial claim — it is which feature set the trial runs on.
--
-- `auto_renew` is left at its `true` default. Per the subscription work,
-- that flag drives reminders, not billing.
--
-- GUARDED BY `not exists`, NOT `on conflict`. `ux_subscription_active`
-- (20260618000005:60) is a PARTIAL unique index over vendors with a live
-- subscription, so a second run would raise a unique violation rather than
-- conflict cleanly on a named constraint.
-- =====================================================================
insert into public.subscriptions (
  vendor_id, plan_id, status, trial_ends_at,
  current_period_start, current_period_end, created_at, updated_at
)
select
  m.vendor_id,
  pp.id,
  'trialing'::subscription_status,
  now() + interval '30 days',
  now(),
  now() + interval '30 days',
  now(),
  now()
from public.migration_legacy_users m
join public.pricing_plans pp
  on pp.key::text = public.migration_plan_key(m.subscription_tier)
 and pp.billing_cycle = 'monthly'
where m.excluded_reason is null
  and m.import_status is null
  and m.legacy_kind = 'vendor'
  and not exists (select 1 from public.subscriptions s
                   where s.vendor_id = m.vendor_id and s.deleted_at is null);


-- =====================================================================
-- 12. vendor_services — the 266 category links
--
-- Your answer: every legacy category becomes a service, and the vendor
-- picks their primary during onboarding.
--
-- A vendor could list up to 19 categories on the old platform; `vendors`
-- holds exactly one `primary_category_id`. Dropping the other 167 links
-- would silently narrow 98 businesses to a single line of work. As services
-- they are all preserved AND all searchable — `public_vendor_search_rpc`
-- (20260722000002:114) matches a category against `primary_category_id` OR
-- any active service, and the facet counts (line 306) do the same.
--
-- `title` is the category name. That is a description of what the vendor
-- does, taken from what they themselves selected — not an invented product
-- name. `base_price` and `currency` are left null: 20260823000003 explains
-- at length that those columns are no longer the source of truth and that
-- the real priced offer lives in `quote_templates`.
--
-- `pricing_models` is '{}'. The same migration is explicit that an empty
-- set means "this vendor has not said yet", and that defaulting it to
-- `fixed` would put a claim on a public profile that the vendor never made.
--
-- The id is derived from (vendor, category) so a re-run does not duplicate
-- every service. `trg_vendor_services_default_category` only fills a NULL
-- category, so setting it explicitly bypasses that path entirely.
-- =====================================================================
insert into public.vendor_services (
  id, vendor_id, category_id, title, is_active, pricing_models, created_at, updated_at
)
select
  md5('sinnapi-legacy-svc:' || m.vendor_id::text || ':' || k.key)::uuid,
  m.vendor_id,
  sc.id,
  sc.name,
  true,
  '{}'::public.pricing_model[],
  m.vendor_registered_at,
  now()
from public.migration_legacy_users m
cross join lateral unnest(m.category_keys) as k(key)
join public.service_categories sc on sc.key = k.key
where m.excluded_reason is null
  and m.import_status is null
  and m.legacy_kind = 'vendor'
on conflict (id) do nothing;


-- =====================================================================
-- 13. SAY THAT IT HAPPENED
--
-- A bulk account creation performed outside the product is exactly the
-- event the trail exists for. `actor_id` is null and `actor_kind` is
-- 'system' because the SQL editor has no `auth.uid()`; `actor_label` and
-- `source` carry what the enum cannot — the same shape
-- supabase/reset-vendor-password.sql uses.
--
-- No password, and no list of addresses, is recorded here. The counts are.
-- =====================================================================
insert into public.audit_logs
  (actor_id, action, entity_type, entity_id, after, actor_kind, actor_label, source, occurred_at)
select
  null,
  'legacy_bulk_import',
  'profiles',
  null,
  jsonb_build_object(
    'batch',              '2026-09-06',
    'source_file',        'verified-users-and-vendors-2026-09-06.csv',
    'staged_rows',        (select count(*) from public.migration_legacy_users),
    'imported',           (select count(*) from public.migration_legacy_users
                            where excluded_reason is null and import_status is null),
    'clients',            (select count(*) from public.migration_legacy_users
                            where excluded_reason is null and import_status is null and legacy_kind='client'),
    'vendors',            (select count(*) from public.migration_legacy_users
                            where excluded_reason is null and import_status is null and legacy_kind='vendor'),
    'applicants',         (select count(*) from public.migration_legacy_users
                            where excluded_reason is null and import_status is null and legacy_kind='applicant'),
    'excluded',           (select jsonb_object_agg(excluded_reason, n) from (
                             select excluded_reason, count(*) n from public.migration_legacy_users
                             where excluded_reason is not null group by 1) x),
    'skipped_collision',  (select count(*) from public.migration_legacy_users
                            where excluded_reason is null and import_status is not null),
    'ids_derived',        (select count(*) from public.migration_legacy_users
                            where excluded_reason is null and import_status is null and user_id_derived),
    'credentials_mailed', false,
    'performed_via',      'supabase_sql_editor'
  ),
  'system'::audit_actor_kind,
  'legacy_import_2026_09_06',
  'supabase_sql_editor',
  now();


-- =====================================================================
-- 14. MARK THE STAGED ROWS DONE
--
-- Written last, and only for rows that actually landed, so `import_status`
-- describes the database rather than this script's intentions.
-- =====================================================================
update public.migration_legacy_users m
   set import_status = 'imported',
       imported_at   = now()
 where m.excluded_reason is null
   and m.import_status is null
   and exists (select 1 from auth.users u where u.id = m.user_id);


-- =====================================================================
-- 15. VERIFY
--
-- Every number below has an expected value in its comment. These are not
-- "did the INSERT report success" checks — an insert can report success and
-- have written nothing under RLS. They count what is actually in the
-- database, and the last one asks the platform's own gate whether these
-- accounts can sign in.
-- =====================================================================

-- ROW COUNTS.  EXPECT: imported 172 · clients 71 · vendors 98 ·
--              applicants 3 · skipped 0
select
  count(*) filter (where import_status = 'imported')                              as imported,
  count(*) filter (where import_status = 'imported' and legacy_kind='client')     as clients,
  count(*) filter (where import_status = 'imported' and legacy_kind='vendor')     as vendors,
  count(*) filter (where import_status = 'imported' and legacy_kind='applicant')  as applicants,
  count(*) filter (where excluded_reason is null and import_status like 'skipped%') as skipped_collision,
  count(*) filter (where excluded_reason is not null)                             as excluded
from public.migration_legacy_users;

-- WHAT LANDED IN EACH TABLE.  EXPECT: auth_users 172 · identities 172 ·
-- profiles 172 · vendors 98 · applications 101 · subscriptions 98 ·
-- services 266 · vendor_roles 98 · client_roles 172
-- (add whatever already existed before the import — file 0 section 1)
select
  (select count(*) from auth.users u
    join public.migration_legacy_users m on m.user_id = u.id
   where m.import_status='imported')                                        as auth_users,
  (select count(*) from auth.identities i
    join public.migration_legacy_users m on m.user_id = i.user_id
   where m.import_status='imported' and i.provider='email')                 as identities,
  (select count(*) from public.profiles p
    join public.migration_legacy_users m on m.user_id = p.id
   where m.import_status='imported')                                        as profiles,
  (select count(*) from public.vendors)                                     as vendors,
  (select count(*) from public.vendor_applications)                         as applications,
  (select count(*) from public.subscriptions)                               as subscriptions,
  (select count(*) from public.vendor_services)                             as services,
  (select count(*) from public.user_roles ur join public.roles r on r.id=ur.role_id
    join public.migration_legacy_users m on m.user_id=ur.profile_id
   where r.key='vendor' and m.import_status='imported')                     as vendor_roles,
  (select count(*) from public.user_roles ur join public.roles r on r.id=ur.role_id
    join public.migration_legacy_users m on m.user_id=ur.profile_id
   where r.key='client' and m.import_status='imported')                     as client_roles;

-- INTEGRITY.  EXPECT: every column 0.
-- These are the failures that would not announce themselves: an account
-- that cannot sign in, a vendor nobody owns, a listing with no application,
-- a trial with no plan (no portfolio video), a duplicate slug.
select
  (select count(*) from public.migration_legacy_users m
    where m.import_status='imported'
      and not exists (select 1 from auth.identities i
                       where i.user_id=m.user_id and i.provider='email'))   as users_without_identity,
  (select count(*) from public.migration_legacy_users m
    where m.import_status='imported'
      and not exists (select 1 from public.profiles p where p.id=m.user_id)) as users_without_profile,
  (select count(*) from public.profiles p
    join public.migration_legacy_users m on m.user_id=p.id
   where m.import_status='imported' and p.public_id is null)                as profiles_without_public_id,
  (select count(*) from public.vendors where owner_id is null)              as vendors_without_owner,
  (select count(*) from public.vendors where application_id is null)        as vendors_without_application,
  (select count(*) from public.vendors v
    where not exists (select 1 from public.subscriptions s
                       where s.vendor_id=v.id and s.deleted_at is null))    as vendors_without_subscription,
  (select count(*) from public.subscriptions where plan_id is null)         as subscriptions_without_plan,
  (select count(*) from public.vendors v where v.deleted_at is null
     and (select count(*) from public.vendors v2
           where v2.slug=v.slug and v2.deleted_at is null) > 1)             as duplicate_slugs,
  (select count(*) from public.profiles p
    join public.migration_legacy_users m on m.user_id=p.id
   where m.import_status='imported' and not m.blocked and p.status <> 'active') as not_active_unexpectedly;

-- THE GATE ITSELF.  EXPECT: client_allowed 171 · vendor_allowed 97 ·
--                   and `deny_reasons` holding only the one blocked account.
--
-- `_evaluate_portal_access` (20260802000001) is the function the sign-in
-- Edge Function actually calls. Counting its answer is the difference
-- between "the rows look right" and "these people can log in".
select
  count(*) filter (where (select allowed from public._evaluate_portal_access(m.user_id,'client'::portal_app))) as client_allowed,
  count(*) filter (where m.legacy_kind='vendor'
                     and (select allowed from public._evaluate_portal_access(m.user_id,'vendor'::portal_app))) as vendor_allowed,
  jsonb_object_agg(x.reason, x.n) filter (where x.reason is not null) as deny_reasons
from public.migration_legacy_users m
left join lateral (
  select (select deny_reason from public._evaluate_portal_access(m.user_id,'client'::portal_app)) as reason,
         1 as n
) x on true
where m.import_status = 'imported';

-- A SAMPLE, READ IT.  One client, one approved vendor, one rejected vendor,
-- one applicant — with everything the console will show about them.
(select 'client' as cohort, p.public_id, p.email, p.full_name, p.phone, p.status,
        p.created_at::date as member_since, null::text as business, null::text as vendor_state
   from public.profiles p join public.migration_legacy_users m on m.user_id=p.id
  where m.import_status='imported' and m.legacy_kind='client' limit 1)
union all
(select 'vendor approved', p.public_id, p.email, p.full_name, p.phone, p.status,
        p.created_at::date, v.business_name, v.status || '/' || v.visibility
   from public.profiles p join public.migration_legacy_users m on m.user_id=p.id
   join public.vendors v on v.owner_id=p.id
  where m.import_status='imported' and m.certification_status='approved' limit 1)
union all
(select 'vendor rejected', p.public_id, p.email, p.full_name, p.phone, p.status,
        p.created_at::date, v.business_name, v.status || '/' || v.visibility
   from public.profiles p join public.migration_legacy_users m on m.user_id=p.id
   join public.vendors v on v.owner_id=p.id
  where m.import_status='imported' and m.certification_status='rejected' limit 1)
union all
(select 'applicant', p.public_id, p.email, p.full_name, p.phone, p.status,
        p.created_at::date, a.business_name, a.status::text
   from public.profiles p join public.migration_legacy_users m on m.user_id=p.id
   join public.vendor_applications a on a.applicant_id=p.id
  where m.import_status='imported' and m.legacy_kind='applicant' limit 1);


-- =====================================================================
-- AFTERWARDS — THE CREDENTIALS
--
-- 172 one-time passwords are now sitting in plaintext in
-- `migration_legacy_users.temp_password`, on a table with RLS on, no
-- policies, and no grants to anon or authenticated. Nobody has been told
-- anything (your Q5).
--
-- WHEN THE FRONT END IS DEPLOYED, export them and send them:
--
--     select email,
--            migration_display_name(legacy_kind, full_name, contact_full_name, email) as name,
--            legacy_kind,
--            temp_password
--     from   public.migration_legacy_users
--     where  import_status = 'imported'
--     order  by legacy_kind, email;
--
-- Download that as CSV from the dashboard, mail from it, and THEN:
--
--     alter table public.migration_legacy_users drop column temp_password;
--
-- Do that as soon as the mail is out. Every one of these is a live
-- credential until its holder signs in and is forced to replace it, and a
-- production table holding 172 working passwords is a standing liability
-- that has no reason to outlive the send.
--
-- DO NOT drop the whole table with it. `legacy_user_id` → `user_id` is the
-- only record anywhere of what 102 of these accounts used to be called.
--
-- If a credential is lost before it is used, the product has a supported
-- route: `resend-vendor-credentials` issues a fresh one to any vendor whose
-- `last_login_at` is still null, and `send-password-reset` works for
-- anybody. Neither needs this table.
-- =====================================================================
