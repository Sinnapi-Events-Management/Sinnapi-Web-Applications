-- =====================================================================
-- READ-ONLY diagnostic — duplicate vendor application intake
-- Incident: 2026-09-30, murungiaisha872@gmail.com
--
-- Run in the SQL editor of the PRODUCTION project (mnecsflrsyackeibixfn).
-- Nothing here writes. Run it BEFORE the cleanup script and keep the output:
-- the cleanup asserts against these same numbers.
--
-- Query 7 is the one to read first if you are short of time — it answers
-- "did this happen to anybody else?", which the incident itself cannot tell you.
-- =====================================================================

-- 1) The intake submissions, oldest first.
select id, submission_ref, status, business_name, owner_full_name,
       owner_phone, promoted_application_id, reviewed_by, reviewed_at,
       created_at
from public.vendor_application_intake
where owner_email = 'murungiaisha872@gmail.com'
order by created_at;

-- 2) The auth account (is there one, and has she ever signed in?).
select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
       u.raw_user_meta_data->>'must_change_password' as must_change_password
from auth.users u
where lower(u.email) = 'murungiaisha872@gmail.com';

select p.id, p.email, p.full_name, p.phone, p.status, p.last_login_at, p.created_at
from public.profiles p
where p.email = 'murungiaisha872@gmail.com';

-- 3) vendor_applications created by promotion.
select va.id, va.business_name, va.status, va.submitted_at, va.decided_at,
       va.created_at, va.deleted_at
from public.vendor_applications va
join public.profiles p on p.id = va.applicant_id
where p.email = 'murungiaisha872@gmail.com'
order by va.created_at;

-- 4) vendors created by approve_vendor  <-- the duplicate-listing check.
select v.id, v.application_id, v.business_name, v.slug, v.status,
       v.visibility, v.trial_ends_at, v.created_at, v.deleted_at
from public.vendors v
join public.profiles p on p.id = v.owner_id
where p.email = 'murungiaisha872@gmail.com'
order by v.created_at;

-- 5) subscriptions attached to those vendors.
select s.id, s.vendor_id, s.status, s.plan_id, s.trial_ends_at,
       s.current_period_start, s.current_period_end, s.created_at
from public.subscriptions s
join public.vendors v on v.id = s.vendor_id
join public.profiles p on p.id = v.owner_id
where p.email = 'murungiaisha872@gmail.com'
order by s.created_at;

-- 6) Anything already hanging off those vendors that a delete would destroy.
--    If every count is 0 the vendor rows are safe to remove.
with mine as (
  select v.id from public.vendors v
  join public.profiles p on p.id = v.owner_id
  where p.email = 'murungiaisha872@gmail.com'
)
select
  (select count(*) from public.vendor_services where vendor_id in (select id from mine)) as vendor_services,
  (select count(*) from public.vendor_media        where vendor_id in (select id from mine)) as media,
  (select count(*) from public.vendor_service_regions where vendor_id in (select id from mine)) as regions,
  (select count(*) from public.quotations          where vendor_id in (select id from mine)) as quotations,
  (select count(*) from public.bookings            where vendor_id in (select id from mine)) as bookings,
  (select count(*) from public.reviews             where vendor_id in (select id from mine)) as reviews;

-- 7) PLATFORM-WIDE: has this hit anyone else?
--    `approve_vendor` never checked for an existing vendor, so any applicant who
--    submitted twice and was approved twice is in this state — two live listings
--    and a vendor portal that refuses to resolve either. Every row here must be
--    cleaned up before `20260930000002_one_vendor_per_owner.sql` will apply.
select p.id as owner_id, p.email, count(*) as live_vendors,
       string_agg(v.business_name || ' [' || v.id || ']', ' | ' order by v.created_at) as vendors
from public.vendors v
join public.profiles p on p.id = v.owner_id
where v.deleted_at is null
group by p.id, p.email
having count(*) > 1
order by count(*) desc;

-- 8) PLATFORM-WIDE: emails with more than one intake still pending.
--    These are the duplicates the new guard would have superseded. They are safe
--    to leave, but each one is a reviewer who could approve the wrong row.
select owner_email, count(*) as submissions,
       string_agg(status || ':' || business_name, ' | ' order by created_at) as rows_
from public.vendor_application_intake
group by owner_email
having count(*) > 1
order by count(*) desc;
