-- =====================================================================
-- Sinnapi — LEGACY IMPORT  ·  FILE 2 of 4  ·  VALIDATE (READ-ONLY)
--
-- THIS FILE CHANGES NOTHING. It shows you exactly what 03_import.sql will
-- write, derivation by derivation, while it is still free to change your
-- mind. Run it after 01_staging.sql and read all of it.
--
-- Anything you disagree with is fixed HERE, by updating the staging table,
-- not by editing the import:
--
--   bring an excluded account back   update public.migration_legacy_users
--                                      set excluded_reason = null
--                                    where email = '…';
--   exclude one that is included     update public.migration_legacy_users
--                                      set excluded_reason = 'test_account'
--                                    where email = '…';
--   change a city rule               update/insert/delete in
--                                    public.migration_city_rules, then re-run
--                                    this file.
--
-- Then re-run this file and read it again.
-- =====================================================================

set search_path = public, extensions;

-- =====================================================================
-- 1. THE SHAPE OF THE IMPORT
--
-- EXPECT: staged 225 · to_import 172 · clients 71 · vendors 98 ·
--         applicants 3 · excluded 53
-- =====================================================================
select
  count(*)                                                                    as staged,
  count(*) filter (where excluded_reason is null)                             as to_import,
  count(*) filter (where excluded_reason is null and legacy_kind='client')    as clients,
  count(*) filter (where excluded_reason is null and legacy_kind='vendor')    as vendors,
  count(*) filter (where excluded_reason is null and legacy_kind='applicant') as applicants,
  count(*) filter (where excluded_reason is not null)                         as excluded,
  count(*) filter (where excluded_reason is null and blocked)                 as will_be_blocked
from public.migration_legacy_users;


-- =====================================================================
-- 2. COLLISIONS WITH WHAT IS ALREADY IN THE DATABASE
--
-- EXPECT: no rows. You said nobody has registered on the new platform.
--
-- Any row here WILL BE SKIPPED by file 3, not merged and not overwritten.
-- If you would rather it were merged, that is a decision to make now, by
-- hand, before the import — not something an automated script should
-- attempt on a production account that somebody is already using.
-- =====================================================================
select m.email, m.legacy_kind,
       case
         when exists (select 1 from public.profiles p
                       where lower(p.email::text)=m.email and p.deleted_at is null)
              then 'email already registered'
         when exists (select 1 from auth.users u where u.id=m.user_id)
              then 'user id already present'
         else 'vendor id already present'
       end as collision
from public.migration_legacy_users m
where m.excluded_reason is null
  and (exists (select 1 from public.profiles p
                where lower(p.email::text)=m.email and p.deleted_at is null)
    or exists (select 1 from auth.users u where u.id=m.user_id)
    or (m.vendor_id is not null
        and exists (select 1 from public.vendors v where v.id=m.vendor_id)))
order by m.email;


-- =====================================================================
-- 3. THE 53 EXCLUSIONS — READ THIS BLOCK PROPERLY
--
-- These accounts will NOT be imported. The `bot_signup` group is the one
-- that deserves a minute of your attention: 34 accounts whose `full_name`
-- is a random string, mostly on foreign corporate domains, 13 of them
-- registering inside eleven days in February 2026. Four of the five
-- accounts your legacy platform had already blocked are in this set.
--
-- If any one of them is a real customer, clear its `excluded_reason` and
-- re-run this file.
-- =====================================================================
select excluded_reason, legacy_kind, user_registered_at::date as registered,
       email, full_name, business_name, blocked
from public.migration_legacy_users
where excluded_reason is not null
order by excluded_reason, user_registered_at;


-- =====================================================================
-- 4. THE CALEB / LWANGA CLUSTER — all excluded, shown so you can check
--
-- Every account whose `full_name` names Caleb or Lwanga is excluded, plus
-- krkemisha8@gmail.com (instruction of 2026-09-22). That is 12 rows in
-- total: 3 were already out as test accounts, and 9 are newly excluded
-- under `operator_excluded`.
--
-- The one to look at is `zara@lwangzo.com` — an APPROVED VENDOR trading as
-- `Oeuvre Cakes`, whose listing goes with the account. It carried no
-- categories, so no category links are lost with it.
--
-- `excluded_reason` NULL in this list would mean something slipped through.
-- To put any of them back:
--
--   update public.migration_legacy_users
--      set excluded_reason = null
--    where email = '…';
-- =====================================================================
select email, legacy_kind, excluded_reason, full_name, business_name,
       certification_status, user_registered_at::date as registered
from public.migration_legacy_users
where full_name ~* 'lwanga|caleb'
   or email = 'krkemisha8@gmail.com'
   or email like '%lwang%'
order by excluded_reason nulls first, user_registered_at;


-- =====================================================================
-- 5. CITY DERIVATION — every distinct location and what it becomes
--
-- `base_city` feeds the public vendor search; `business_location` keeps the
-- raw string. Scrutinise the `Kampala` group hardest: it contains the rows
-- inferred from a CBD landmark alone (Luwum Street, Equatorial Mall,
-- Pioneer Mall …) where the vendor never wrote a city at all.
--
-- A NULL result is a supported outcome, not a failure — the onboarding
-- wizard asks those vendors for their city on first sign-in.
--
-- To change any of it, edit `public.migration_city_rules` and re-run.
-- =====================================================================
select coalesce(public.migration_base_city(location), '(null)') as base_city,
       count(*) as vendors,
       string_agg(distinct location, '  ·  ' order by location) as from_these_strings
from public.migration_legacy_users
where excluded_reason is null and legacy_kind='vendor'
group by 1
order by 2 desc;


-- =====================================================================
-- 6. PHONE NORMALISATION — only the ones it refused to reshape
--
-- 98 vendors have a contact number; 91 normalise cleanly to +256XXXXXXXXX.
-- The rest are below. Each is genuinely ambiguous — a foreign number, a
-- digit too many, a digit too few — and is stored CLEANED BUT NOT
-- RESHAPED. Guessing would produce a plausible number belonging to
-- somebody else.
--
-- Fix any of them at source if you know the right value:
--   update public.migration_legacy_users set contact_phone='+256…' where email='…';
-- =====================================================================
select contact_phone                              as source,
       public.migration_norm_phone(contact_phone) as will_be_stored,
       email, business_name
from public.migration_legacy_users
where excluded_reason is null
  and contact_phone is not null
  and public.migration_norm_phone(contact_phone) !~ '^\+256[0-9]{9}$'
order by 1;


-- =====================================================================
-- 7. DISPLAY NAME — where the account name and the contact name disagree
--
-- For these vendors the legacy `full_name` is the BUSINESS and
-- `contact_full_name` is the person. `profiles.full_name` names a human, so
-- the contact name wins (your Q6). The business name is not lost — it is
-- `vendors.business_name`.
-- =====================================================================
select email,
       full_name         as legacy_account_name,
       contact_full_name as legacy_contact_name,
       public.migration_display_name(legacy_kind, full_name, contact_full_name, email) as profile_full_name,
       business_name     as vendors_business_name
from public.migration_legacy_users
where excluded_reason is null
  and contact_full_name is not null
  and btrim(coalesce(contact_full_name,'')) <> btrim(coalesce(full_name,''))
order by email;


-- =====================================================================
-- 8. VENDOR STATE AND PLAN
--
-- EXPECT: approved → active/public (92) · rejected → hidden/hidden (6)
--         Basic Tier + Essential → starter · Professional → professional
-- =====================================================================
select certification_status,
       subscription_tier,
       public.migration_plan_key(subscription_tier) as plan_key,
       case when certification_status='approved' then 'active / public'
            else 'hidden / hidden' end             as vendor_state,
       count(*)
from public.migration_legacy_users
where excluded_reason is null and legacy_kind='vendor'
group by 1,2,3,4
order by 1,2;


-- =====================================================================
-- 9. SLUGS — uniqueness, and the names that make it interesting
--
-- EXPECT: vendors = distinct_slugs, and `duplicate_business_names` = 2
-- pairs that still produce four different slugs, because the suffix is
-- seeded from the vendor's own id rather than from randomness.
-- =====================================================================
select count(*)                                                        as vendors,
       count(distinct public.migration_slug(business_name, vendor_id)) as distinct_slugs,
       max(length(public.migration_slug(business_name, vendor_id)))     as longest
from public.migration_legacy_users
where excluded_reason is null and legacy_kind='vendor';

select business_name, public.migration_slug(business_name, vendor_id) as slug
from public.migration_legacy_users
where excluded_reason is null and legacy_kind='vendor'
  and (business_name ~ '[^a-zA-Z0-9 ]' or business_name <> btrim(business_name))
order by business_name;


-- =====================================================================
-- 10. THE TAXONOMY — what file 3 will and will not create
--
-- `action` says it all: `reuse existing` means the key is already in
-- `service_categories` and file 3's `on conflict (key) do nothing` leaves
-- its current name alone. `create` means a new row.
--
-- EXPECT: create 45 · reuse existing 10
-- =====================================================================
with wanted(key, name, sort_order) as (values
  ('caterer','Catering',1),('photographer','Photographers',2),('cakes','Cakes',3),
  ('florist','Florists',4),('wedding_planner','Wedding planner',5),
  ('makeup_artist','Makeup Artist',6),('venue','Venue',7),('dj','DJ',8),
  ('pa','PA',9),('officiant_church','Officiant/Church',10),('jeweler','Jeweler',11),
  ('entertainment','Entertainment',12),('event_rentals','Event rentals',13),
  ('transportation','Transportation',14),('traditional_attire','Traditional Attire',15),
  ('gowns','Gowns',16),('suits','Suits',17),('favors','Favors(Smoke, fireworks & props)',18),
  ('bridal_shoes_accessories','Bridal shoes & accessories',19),('decorator','Decor',20),
  ('invitations','Invitations',21),('photo_booths','Photo booths',22),
  ('stationery','Stationery',23),('vendor_management','Vendor management',24),
  ('security','Venue security/ bouncers',25),('honeymoon_destinations','Honeymoon destinations',26),
  ('tour_guide','Tour guide',27),('lighting_trussing_production','Lighting, trussing & production',28),
  ('counseling','Counseling',29),('financier','Financier',30),('insurance','Insurance',31),
  ('juice_beverages','Juice & beverages',32),('tea_coffee','Tea & coffee',33),
  ('hair_stylists','Hair stylists',34),('dentists','Dentists',35),('wellness_spa','Wellness & Spa',36),
  ('nail_technicians','Nail technicians/ manicurists',37),('beauticians','Beauticians',38),
  ('fertility_specialists','Fertility specialists',39),('furniture_rentals','Furniture rentals',40),
  ('tents_parasols_shelters','Tents, parasols & shelters',41),('content_creators','Content creators',42),
  ('mobile_charging','Mobile charging',43),('internet_provider','Internet provider',44),
  ('affordable_housing','Affordable housing',45),('icecream','Icecream',46),
  ('kids_play','Kids play (bouncing castles, swings, face art etc)',47),('mc','Mc',48),
  ('ushering','Ushering',49),('lingerie_intimates','Lingerie & intimates',50),
  ('gift_packaging','Gift packaging',51),('meeting_venues','Meeting venues',52),
  ('cleaning_services','Cleaning services',53),('airbnb','Airbnb',54),
  ('interior_designers','Interior Designers',55))
select case when sc.key is null then 'create' else 'reuse existing' end as action,
       w.key, w.name as name_in_your_list, sc.name as name_already_in_database
from wanted w
left join public.service_categories sc on sc.key = w.key
order by action, w.sort_order;


-- =====================================================================
-- 11. CATEGORY LINKS — the 266 vendor_services rows
--
-- EXPECT: total_links 266 · unresolved 0 (every legacy category name maps
-- to a key file 3 will have created). 40 vendors have no categories at all
-- and get no services; that is the source data, not a mapping failure.
-- =====================================================================
select count(*)                                                 as total_links,
       count(*) filter (where sc.id is null)                    as unresolved,
       count(distinct m.vendor_id)                              as vendors_with_services,
       (select count(*) from public.migration_legacy_users
         where excluded_reason is null and legacy_kind='vendor'
           and cardinality(category_keys)=0)                    as vendors_with_none
from public.migration_legacy_users m
cross join lateral unnest(m.category_keys) as k(key)
left join public.service_categories sc on sc.key = k.key
where m.excluded_reason is null and m.legacy_kind='vendor';

-- How many categories each vendor carries. The 19-category vendor is real.
select cardinality(category_keys) as categories, count(*) as vendors
from public.migration_legacy_users
where excluded_reason is null and legacy_kind='vendor'
group by 1 order by 1;


-- =====================================================================
-- 12. THE ID MAPPING — 102 accounts get a new identifier
--
-- EXPECT: verbatim 70 · derived 102 · collisions 0
--
-- `derived` accounts could not keep their legacy id because it is not a
-- UUID and `auth.users.id` is a uuid column. File 1's header explains the
-- derivation. `migration_legacy_users` is the only record of this mapping —
-- do not delete that table.
-- =====================================================================
select count(*) filter (where not user_id_derived)                as verbatim,
       count(*) filter (where user_id_derived)                    as derived,
       (select count(*) - count(distinct user_id)
          from public.migration_legacy_users)                     as collisions
from public.migration_legacy_users
where excluded_reason is null;

select legacy_user_id, user_id as sinnapi_user_id, email, legacy_kind
from public.migration_legacy_users
where excluded_reason is null and user_id_derived
order by email
limit 10;


-- =====================================================================
-- 13. A FULL DRY-RUN ROW
--
-- Five accounts, showing every derived value side by side with its source,
-- exactly as file 3 will write them. If these five look right, the other
-- 167 almost certainly do too.
-- =====================================================================
select m.legacy_kind,
       m.email,
       public.migration_display_name(m.legacy_kind, m.full_name, m.contact_full_name, m.email) as profile_name,
       public.migration_norm_phone(m.contact_phone)                                            as profile_phone,
       m.user_registered_at::date                                                              as profile_created,
       case when m.blocked then 'blocked' else 'active' end                                    as profile_status,
       m.business_name,
       public.migration_slug(m.business_name, m.vendor_id)                                     as slug,
       public.migration_base_city(m.location)                                                  as base_city,
       case when m.certification_status='approved' then 'active/public'
            when m.certification_status is null    then '(no vendor row)'
            else 'hidden/hidden' end                                                           as vendor_state,
       public.migration_plan_key(m.subscription_tier)                                          as plan,
       cardinality(m.category_keys)                                                            as services
from public.migration_legacy_users m
where m.excluded_reason is null
  and m.email in (
    (select email from public.migration_legacy_users where excluded_reason is null and legacy_kind='client' order by user_registered_at limit 1),
    (select email from public.migration_legacy_users where excluded_reason is null and certification_status='approved' order by user_registered_at limit 1),
    (select email from public.migration_legacy_users where excluded_reason is null and certification_status='rejected' order by user_registered_at limit 1),
    (select email from public.migration_legacy_users where excluded_reason is null and legacy_kind='applicant' order by user_registered_at limit 1),
    (select email from public.migration_legacy_users where excluded_reason is null and blocked limit 1)
  );
