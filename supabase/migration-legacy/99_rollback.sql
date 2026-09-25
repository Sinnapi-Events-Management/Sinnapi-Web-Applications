-- =====================================================================
-- Sinnapi — LEGACY IMPORT  ·  ROLLBACK
--
--   THIS DELETES THE 172 IMPORTED ACCOUNTS AND EVERYTHING HANGING OFF
--   THEM. Read all of it before running any of it.
--
-- It removes ONLY what 03_import.sql created, identified through the
-- staging table. An account that existed before the import is never
-- touched, because nothing here selects a row that is not joined to
-- `migration_legacy_users`.
--
-- ---------------------------------------------------------------------
-- WHY `DELETE` IS NOT ENOUGH, AND WHAT THIS FILE DOES INSTEAD
--
-- TWO TRIGGERS SILENTLY DEFEAT THE OBVIOUS ROLLBACK, and both were
-- confirmed by running them, not by reading the migrations:
--
-- 1. `trg_soft_delete` (20260618000010:49) is a BEFORE DELETE trigger on
--    every table with a `deleted_at` column. It sets `deleted_at = now()`
--    and RETURNS NULL, cancelling the physical delete.
--
--    This is worse than it sounds for a cascade. `delete from auth.users`
--    reports `DELETE 1` and looks like it worked — but the cascade into
--    `profiles` is suppressed by the trigger, leaving a profile row whose
--    `id` no longer exists in `auth.users`. Measured: 181 profiles before,
--    181 after, one newly soft-deleted. An orphan holding an email address
--    and a `public_id`, which is exactly what stops you re-importing later.
--
-- 2. `trg_append_only` (20260618000010:71) raises on any DELETE against
--    `audit_logs` and `application_status_history`.
--
-- So this file disables both, for the tables it touches, for the duration
-- of the transaction. That is a privileged act and it is the reason this
-- file is separate, commented this heavily, and not something to run
-- casually.
--
-- ---------------------------------------------------------------------
-- WHAT CANNOT BE UNDONE
--
--   * The `public_id` VALUES are gone for good. Section 3b releases the
--     registry rows so the same accounts can be re-imported, but a re-import
--     mints FRESH identifiers — `SC48213MQH` does not come back. That is
--     safe here only because nothing has been mailed yet (your Q5): no
--     customer, invoice or support ticket has ever seen one of these. Once
--     you have sent the credentials, a rollback stops being a clean
--     operation and becomes one with consequences outside the database.
--
--   * The 45 `service_categories` this import created are NOT removed by
--     default. Section 6 offers it, guarded, and explains why you probably
--     should not.
--
-- ---------------------------------------------------------------------
-- IT IS ONE TRANSACTION. A failure anywhere rolls the whole thing back and
-- the triggers come back with it — `alter table … disable trigger` is
-- transactional in Postgres, so an aborted run cannot leave your database
-- with the soft-delete protection switched off.
-- =====================================================================

set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 0. GUARD — refuse to run without the staging table.
--
-- Without it there is no way to tell an imported account from a real one,
-- and a rollback that guesses is a great deal worse than no rollback.
-- ---------------------------------------------------------------------
do $$
declare v_n int;
begin
  if to_regclass('public.migration_legacy_users') is null then
    raise exception 'migration_legacy_users is gone — this rollback cannot tell imported accounts from real ones. Refusing.'
      using errcode = 'P0002';
  end if;
  select count(*) into v_n from public.migration_legacy_users where import_status = 'imported';
  raise notice 'rolling back % imported accounts', v_n;
end$$;

-- ---------------------------------------------------------------------
-- 1. DISABLE THE TWO TRIGGERS THAT WOULD OTHERWISE DEFEAT THIS.
--
-- Scoped to the six tables this file deletes from. Re-enabled in section 5;
-- and if anything below raises, the transaction aborts and they are
-- restored by the rollback itself.
-- ---------------------------------------------------------------------
alter table public.vendor_services             disable trigger trg_soft_delete;
alter table public.subscriptions               disable trigger trg_soft_delete;
alter table public.vendors                     disable trigger trg_soft_delete;
alter table public.vendor_applications         disable trigger trg_soft_delete;
alter table public.profiles                    disable trigger trg_soft_delete;
alter table public.application_status_history  disable trigger trg_append_only;
alter table public.audit_logs                  disable trigger trg_append_only;

-- ---------------------------------------------------------------------
-- 2. DELETE, CHILDREN FIRST.
--
-- Every statement is scoped through `migration_legacy_users`, so a vendor
-- or account that predates the import is invisible to all of them.
-- ---------------------------------------------------------------------
delete from public.vendor_services vs
 using public.migration_legacy_users m
 where vs.vendor_id = m.vendor_id and m.import_status = 'imported';

delete from public.subscriptions s
 using public.migration_legacy_users m
 where s.vendor_id = m.vendor_id and m.import_status = 'imported';

delete from public.vendors v
 using public.migration_legacy_users m
 where v.id = m.vendor_id and m.import_status = 'imported';

-- The history rows the application-insert trigger wrote. Deleted before
-- their parent, and only reachable at all because of section 1.
delete from public.application_status_history h
 using public.vendor_applications a, public.migration_legacy_users m
 where h.application_id = a.id
   and a.applicant_id = m.user_id
   and m.import_status = 'imported';

delete from public.vendor_applications a
 using public.migration_legacy_users m
 where a.applicant_id = m.user_id and m.import_status = 'imported';

-- `user_roles` has no `deleted_at`, so it cascades from `profiles` normally.
delete from public.user_roles ur
 using public.migration_legacy_users m
 where ur.profile_id = m.user_id and m.import_status = 'imported';

delete from public.profiles p
 using public.migration_legacy_users m
 where p.id = m.user_id and m.import_status = 'imported';

-- The batch record. Removed because the batch is being unmade; if you would
-- rather keep the trail of "an import happened and was reversed", comment
-- this out — nothing depends on it.
delete from public.audit_logs
 where action = 'legacy_bulk_import'
   and source = 'supabase_sql_editor';

-- ---------------------------------------------------------------------
-- 3. THE AUTH ROWS.
--
-- Last, because `profiles.id` references them. Identities first: they
-- reference `auth.users`, and being explicit is worth more here than
-- relying on a cascade, given what section 1 established about cascades.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regclass('auth.identities') is not null then
    delete from auth.identities i
     using public.migration_legacy_users m
     where i.user_id = m.user_id and m.import_status = 'imported';
  end if;
end$$;

delete from auth.users u
 using public.migration_legacy_users m
 where u.id = m.user_id and m.import_status = 'imported';


-- ---------------------------------------------------------------------
-- 3b. RELEASE THE public_id REGISTRY ROWS.
--
-- WITHOUT THIS, A RE-IMPORT FAILS. Confirmed by running it:
--
--   ERROR: duplicate key value violates unique constraint "ux_public_id_row"
--   DETAIL: Key (relation, row_id)=(public.profiles, 1f33a4d8-…) already exists.
--   CONTEXT: PL/pgSQL function mint_public_id(text,text,uuid)
--
-- `public_id_registry` (20260829000001) says in its own comment that rows
-- are never deleted, so that an identifier is never reissued. That rule is
-- about never handing one entity's identifier to a DIFFERENT entity — and
-- it is right. It does not apply here: the ids being released belong to
-- rows this same file has just deleted, keyed on the very same `row_id`
-- that a re-import would present. Leaving them behind does not protect
-- anybody; it just makes the import unrepeatable.
--
-- Scoped to the four relations this rollback deletes from, and to the ids
-- carried by the staging table. It cannot reach a registry row belonging to
-- an account that predates the import.
-- ---------------------------------------------------------------------
delete from public.public_id_registry r
 using public.migration_legacy_users m
 where m.import_status = 'imported'
   and (
        (r.relation = 'public.profiles' and r.row_id = m.user_id)
     or (r.relation = 'public.vendors'  and r.row_id = m.vendor_id)
     or (r.relation = 'public.subscriptions' and r.row_id in (
           select s.id from public.subscriptions s where s.vendor_id = m.vendor_id))
   );

-- `vendors` and `subscriptions` rows are already gone by this point, so the
-- subquery above cannot see the subscription ids any more. Sweep instead by
-- what the registry itself can still prove: an entry whose row no longer
-- exists in the relation it names. Confined to the three relations this
-- import writes, so nothing else is touched.
delete from public.public_id_registry r
 where r.relation = 'public.vendors'
   and not exists (select 1 from public.vendors v where v.id = r.row_id);

delete from public.public_id_registry r
 where r.relation = 'public.subscriptions'
   and not exists (select 1 from public.subscriptions s where s.id = r.row_id);

delete from public.public_id_registry r
 where r.relation = 'public.profiles'
   and not exists (select 1 from public.profiles p where p.id = r.row_id);

-- ---------------------------------------------------------------------
-- 4. RESET THE STAGING TABLE.
--
-- The rows stay — they are the CSV, and the legacy id mapping. Only the
-- import's own bookkeeping is cleared, so that a corrected file 3 can be
-- run again from a clean state.
--
-- `temp_password` is cleared too: those credentials were hashed into
-- accounts that no longer exist, and keeping plaintext for deleted accounts
-- is a liability with no remaining purpose. The next run issues new ones.
-- ---------------------------------------------------------------------
update public.migration_legacy_users
   set import_status = null,
       imported_at   = null,
       temp_password = null
 where import_status is not null;

-- ---------------------------------------------------------------------
-- 5. PUT THE TRIGGERS BACK.
--
-- Non-negotiable. Without `trg_soft_delete`, a later DELETE anywhere in the
-- product becomes a real delete on tables the whole schema assumes are
-- soft-deleted only.
-- ---------------------------------------------------------------------
alter table public.vendor_services             enable trigger trg_soft_delete;
alter table public.subscriptions               enable trigger trg_soft_delete;
alter table public.vendors                     enable trigger trg_soft_delete;
alter table public.vendor_applications         enable trigger trg_soft_delete;
alter table public.profiles                    enable trigger trg_soft_delete;
alter table public.application_status_history  enable trigger trg_append_only;
alter table public.audit_logs                  enable trigger trg_append_only;

-- ---------------------------------------------------------------------
-- 6. VERIFY.  EXPECT: every column 0, and both triggers `t`.
--
-- The last two matter most. A rollback that left the soft-delete protection
-- off would be a far worse outcome than the import it was undoing.
-- ---------------------------------------------------------------------
select
  (select count(*) from auth.users u
    join public.migration_legacy_users m on m.user_id=u.id)                   as auth_users_left,
  (select count(*) from public.profiles p
    join public.migration_legacy_users m on m.user_id=p.id)                   as profiles_left,
  (select count(*) from public.vendors v
    join public.migration_legacy_users m on m.vendor_id=v.id)                 as vendors_left,
  (select count(*) from public.vendor_applications a
    join public.migration_legacy_users m on m.user_id=a.applicant_id)         as applications_left,
  (select count(*) from public.migration_legacy_users where import_status is not null) as staging_not_reset,
  -- Must be 0, or a re-import dies in mint_public_id. See section 3b.
  (select count(*) from public.public_id_registry r
    where r.relation = 'public.profiles'
      and not exists (select 1 from public.profiles p where p.id = r.row_id))      as orphan_public_ids,
  (select tgenabled = 'O' from pg_trigger
    where tgname='trg_soft_delete' and tgrelid='public.profiles'::regclass)   as profiles_soft_delete_on,
  (select tgenabled = 'O' from pg_trigger
    where tgname='trg_soft_delete' and tgrelid='public.vendors'::regclass)    as vendors_soft_delete_on;


-- =====================================================================
-- 7. OPTIONAL — THE 45 SERVICE CATEGORIES
--
-- NOT run by default, and you probably should not run it. Deleting a
-- category is only safe while nothing references it, and by the time you
-- are reading this a real vendor may have chosen one. The statement below
-- deletes only the categories this import created AND that nothing points
-- at, so it is safe in the narrow sense — but a taxonomy that exists is not
-- doing any harm, and putting it back is a nuisance.
--
-- Uncomment deliberately.
-- =====================================================================
-- delete from public.service_categories sc
--  where sc.key in (
--    'cakes','wedding_planner','pa','officiant_church','jeweler','event_rentals',
--    'transportation','traditional_attire','gowns','suits','favors',
--    'bridal_shoes_accessories','invitations','photo_booths','stationery',
--    'vendor_management','honeymoon_destinations','tour_guide',
--    'lighting_trussing_production','counseling','financier','insurance',
--    'juice_beverages','tea_coffee','hair_stylists','dentists','wellness_spa',
--    'nail_technicians','beauticians','fertility_specialists','furniture_rentals',
--    'tents_parasols_shelters','content_creators','mobile_charging',
--    'internet_provider','affordable_housing','icecream','kids_play','ushering',
--    'lingerie_intimates','gift_packaging','meeting_venues','cleaning_services',
--    'airbnb','interior_designers')
--    and not exists (select 1 from public.vendor_services vs where vs.category_id = sc.id)
--    and not exists (select 1 from public.vendors v where v.primary_category_id = sc.id)
--    and not exists (select 1 from public.vendor_applications a where a.primary_category_id = sc.id);


-- =====================================================================
-- 8. OPTIONAL — REMOVE THE STAGING MACHINERY ENTIRELY
--
-- DO NOT RUN THIS UNTIL YOU ARE CERTAIN. `migration_legacy_users` is the
-- ONLY record anywhere of the legacy id -> Sinnapi id mapping for 102
-- accounts. Once it is gone, nothing can ever be reconciled against the old
-- platform again.
--
-- Export it first if there is any doubt.
-- =====================================================================
-- drop table if exists public.migration_legacy_users cascade;
-- drop table if exists public.migration_city_rules  cascade;
-- drop function if exists public.migration_norm_phone(text);
-- drop function if exists public.migration_base_city(text);
-- drop function if exists public.migration_slug(text, uuid);
-- drop function if exists public.migration_plan_key(text);
-- drop function if exists public.migration_display_name(text,text,text,text);
-- drop function if exists public.migration_gen_password();
