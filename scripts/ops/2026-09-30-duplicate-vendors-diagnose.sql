-- =====================================================================
-- READ-ONLY diagnostic — ALL owners with more than one live vendor
--
-- `20260930000003_one_vendor_per_owner.sql` refused to apply and named four
-- owners (one with FOUR vendor rows). This finds out, for each of them, which
-- listing should survive and whether the others are safe to retire.
--
-- Nothing here writes. Paste all five result sets back.
--
-- The key column is `cause`, which separates two very different histories:
--   • 'approved twice'  — two intakes promoted, the bug this started from.
--   • 'no application'  — a vendor with `application_id is null`: created by the
--                          legacy import or by staff directly, NOT by approval.
--                          Very likely an imported vendor who then applied
--                          through the public form and was approved, which
--                          produces the same duplicate by a different route.
-- =====================================================================

-- 1) Every live vendor belonging to a duplicated owner, with its history and
--    everything hanging off it. This is the decision table.
with dupes as (
  select owner_id
  from public.vendors
  where deleted_at is null
  group by owner_id
  having count(*) > 1
)
select
  v.owner_id,
  p.email                                as owner_email,
  v.id                                   as vendor_id,
  v.public_id,
  v.business_name,
  v.slug,
  v.status,
  v.visibility,
  v.created_at,
  case
    when v.application_id is null then 'no application (import/manual)'
    else 'from an approved application'
  end                                    as cause,
  v.trial_ends_at,
  (select count(*) from public.quotations q where q.vendor_id = v.id) as quotations,
  (select count(*) from public.bookings  b where b.vendor_id = v.id) as bookings,
  (select count(*) from public.reviews   r where r.vendor_id = v.id) as reviews,
  (select count(*) from public.vendor_services      s  where s.vendor_id  = v.id) as services,
  (select count(*) from public.vendor_media         m  where m.vendor_id  = v.id) as media,
  (select count(*) from public.vendor_service_regions sr where sr.vendor_id = v.id) as regions,
  (select count(*) from public.subscriptions su
     where su.vendor_id = v.id and su.deleted_at is null
       and su.status in ('trialing','active','past_due','grace'))                  as live_subs
from public.vendors v
join dupes d   on d.owner_id = v.owner_id
join public.profiles p on p.id = v.owner_id
where v.deleted_at is null
order by p.email, v.created_at;

-- 2) The same owners' intake submissions, so you can see what they applied for
--    and in which order.
with dupes as (
  select owner_id from public.vendors where deleted_at is null
  group by owner_id having count(*) > 1
)
select p.email, i.id as intake_id, i.public_id, i.status, i.business_name,
       i.created_at, i.promoted_application_id
from public.vendor_application_intake i
join public.profiles p on p.email = i.owner_email
join dupes d on d.owner_id = p.id
order by p.email, i.created_at;

-- 3) Has any of these owners ever signed in? Decides whether an approval email
--    can still carry a password.
with dupes as (
  select owner_id from public.vendors where deleted_at is null
  group by owner_id having count(*) > 1
)
select p.id, p.email, p.full_name, p.status, p.last_login_at, p.created_at
from public.profiles p
join dupes d on d.owner_id = p.id
order by p.email;

-- 4) Totals, so the scale is unambiguous.
select
  (select count(*) from (
     select owner_id from public.vendors where deleted_at is null
     group by owner_id having count(*) > 1) x)                    as duplicated_owners,
  (select count(*) from public.vendors where deleted_at is null)  as live_vendors_total,
  (select count(*) from public.vendors
     where deleted_at is null and application_id is null)         as live_vendors_without_application;

-- 5) THE SAFETY QUESTION, one row per duplicated owner.
--    `retirable` counts that owner's vendors with NO client-facing activity.
--    If retirable = live_vendors - 1, one clean choice exists and the cleanup is
--    mechanical. If it is lower, two or more of that owner's listings have real
--    client history and merging them is a judgement call, not a script.
with dupes as (
  select owner_id, count(*) as live_vendors
  from public.vendors where deleted_at is null
  group by owner_id having count(*) > 1
)
select p.email, d.live_vendors,
  (select count(*) from public.vendors v
    where v.owner_id = d.owner_id and v.deleted_at is null
      and not exists (select 1 from public.quotations q where q.vendor_id = v.id)
      and not exists (select 1 from public.bookings  b where b.vendor_id = v.id)
      and not exists (select 1 from public.reviews   r where r.vendor_id = v.id)
  ) as retirable_no_client_activity
from dupes d
join public.profiles p on p.id = d.owner_id
order by d.live_vendors desc, p.email;
