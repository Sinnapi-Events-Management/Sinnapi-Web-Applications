-- =====================================================================
-- Sinnapi — 0806 Vendor service-region coverage
-- Closes the gap that left `vendor_service_regions` empty for every vendor
-- on the platform, and with it the "Location" facet on every surface that
-- filters by region.
--
-- WHAT WAS BROKEN
-- `vendor_service_regions` was read in three places — `_vendors_public_match`
-- and `count_vendor_facets_public` (0722), and the /vendors/region landing
-- pages — but written in none, so every region reported a count of 0, every
-- filter option rendered disabled, and the region landing pages listed nothing
-- — while the cards beside them showed a `base_city`, which reads as a flat
-- contradiction to anyone using the page.
--
-- WHERE THE DATA WAS LOST
-- A vendor's declared coverage is collected once, on the public application
-- form, and lands in `vendor_application_intake.service_region_keys` (0702).
-- That is the ONLY place on the platform it has ever existed:
-- `vendor_applications` has no region column at all, and neither does
-- `vendors`.
--
-- The `promote-intake` Edge Function mirrors an approved intake into
-- `vendor_applications` — business name, `primary_category_key` resolved to
-- `primary_category_id`, base city, pricing — and then calls `approve_vendor`.
-- `service_region_keys` has nowhere to go in that mirror, so it is dropped
-- there, before `approve_vendor` ever runs. The keys never reach the vendor.
--
-- This migration therefore reaches back to the intake rather than reading the
-- application, via `vendor_application_intake.promoted_application_id` (0710).
-- That link is safe to depend on at approval time: promote-intake claims the
-- intake by setting it *before* it calls `approve_vendor`, precisely so a
-- concurrent double-promote can't create two vendors.
--
-- Note the contrast with the category facet, which worked throughout: its
-- predicate falls back to `vendors.primary_category_id` when a vendor has no
-- `vendor_services` rows, and that one column *is* carried across the mirror.
-- The region predicate has no such fallback — coverage is only ever the join
-- table — which is why this had to be fixed in the data rather than the query.
-- (`service_category_keys` is dropped at the same point and for the same
-- reason; that loss is deliberately left alone here, since the fallback hides
-- it and populating `vendor_services` raises its own questions about what a
-- service row created from a bare category key should contain.)
--
-- WHAT THIS DOES
--   1. `approve_vendor`             -> copies the intake's regions onto the vendor
--   2. one-off backfill             -> the same copy for already-approved vendors
--   3. `set_vendor_service_regions` -> the write path for the two editors
--   4. `vsr_read`                   -> staff can read coverage they can manage
--
-- DELIBERATELY NOT DONE: nothing is inferred. A vendor whose intake left
-- `service_region_keys` empty gets no coverage here, rather than having a
-- region guessed from `base_city` — being based somewhere is not the same as
-- serving it, and a guess would be indistinguishable from a declaration
-- afterwards. Those vendors stay unfindable by location until someone sets
-- their coverage through one of the editors below, which is the honest state.
-- =====================================================================

-- The lookup both statements below hang off. `promoted_application_id` is a
-- foreign key, which Postgres does not index automatically, and it is now on
-- the approval path rather than only in admin screens.
create index if not exists ix_intake_promoted_application
  on public.vendor_application_intake(promoted_application_id)
  where promoted_application_id is not null;

-- ---------------------------------------------------------------------
-- 1. approve_vendor
-- Unchanged except for the `vendor_service_regions` insert. Recreated whole
-- rather than patched, since Postgres has no way to amend a function body.
--
-- Sourced from the intake that was promoted into this application, since that
-- is where the keys live — see the header. A vendor approved through any other
-- path has no intake to read and simply gets no coverage, the same as today.
--
-- Keys are resolved through `service_regions` rather than trusted: an intake
-- may carry a key that has since been retired or renamed, and a join drops
-- those instead of failing the approval over reference data. Only active
-- regions are copied, for the same reason the facets only count active ones.
-- ---------------------------------------------------------------------
create or replace function public.approve_vendor(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare a public.vendor_applications; v_vendor uuid; v_slug text; v_trial integer;
begin
  if not public.has_permission('vendor.approve') then perform public._forbidden(); end if;
  select * into a from public.vendor_applications where id = p_application_id;
  if a.id is null then raise exception 'not_found'; end if;
  v_trial := coalesce((public.get_setting('trial_days') #>> '{}')::int, 30);
  v_slug := lower(regexp_replace(a.business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' ||
            substr(replace(gen_random_uuid()::text,'-',''),1,6);

  insert into public.vendors(application_id, owner_id, business_name, slug, biography,
      primary_category_id, base_city, website, years_in_operation, pricing_model,
      starting_price, starting_price_currency, lead_time, status, visibility, trial_ends_at)
  values (a.id, a.applicant_id, a.business_name, v_slug, a.biography, a.primary_category_id,
      a.base_city, a.website, a.years_in_operation, a.pricing_model, a.starting_price,
      a.starting_price_currency, a.lead_time, 'active', 'public', now() + make_interval(days => v_trial))
  returning id into v_vendor;

  -- The coverage the applicant declared. Without this the vendor is invisible
  -- to every location filter on the platform from the moment they're approved.
  insert into public.vendor_service_regions(vendor_id, region_id)
  select v_vendor, sr.id
  from public.vendor_application_intake i
  cross join lateral unnest(coalesce(i.service_region_keys, '{}'::text[])) as k(region_key)
  join public.service_regions sr on sr.key = k.region_key and sr.is_active
  where i.promoted_application_id = p_application_id
  on conflict (vendor_id, region_id) do nothing;

  insert into public.subscriptions(vendor_id, status, trial_ends_at, current_period_start, current_period_end)
  values (v_vendor, 'trialing', now() + make_interval(days => v_trial), now(), now() + make_interval(days => v_trial));

  update public.vendor_applications set status='approved', decided_at=now(), reviewed_by=auth.uid()
   where id = p_application_id;

  -- ensure applicant holds the vendor role
  insert into public.user_roles(profile_id, role_id, granted_by)
  select a.applicant_id, r.id, auth.uid() from public.roles r where r.key='vendor'
  on conflict do nothing;

  return v_vendor;
end;$$;

-- ---------------------------------------------------------------------
-- 2. Backfill
-- The same copy, for every vendor approved before the fix above existed.
--
-- Scoped to vendors that currently have no coverage at all, so re-running the
-- migration cannot resurrect a region an editor has since removed — `on
-- conflict do nothing` alone would protect the rows that exist but would
-- happily re-add a deleted one.
--
-- Vendors created outside the intake flow, or whose intake recorded no regions,
-- are untouched by design. `vendors.application_id` is nullable and the join
-- drops those rows, which is the same outcome.
-- ---------------------------------------------------------------------
insert into public.vendor_service_regions(vendor_id, region_id)
select distinct v.id, sr.id
from public.vendors v
join public.vendor_application_intake i on i.promoted_application_id = v.application_id
cross join lateral unnest(coalesce(i.service_region_keys, '{}'::text[])) as k(region_key)
join public.service_regions sr on sr.key = k.region_key and sr.is_active
where not exists (
  select 1 from public.vendor_service_regions existing where existing.vendor_id = v.id
)
on conflict (vendor_id, region_id) do nothing;

-- ---------------------------------------------------------------------
-- 3. set_vendor_service_regions
-- Replaces a vendor's coverage with exactly `p_keys`, in one statement pair.
--
-- An RPC rather than client-side inserts/deletes because coverage is a *set*,
-- and editing it from the browser would mean a delete followed by an insert
-- with no transaction around them — a failure between the two would leave a
-- vendor with less coverage than they had before they opened the form. Here the
-- pair either both apply or neither does.
--
-- It also gives both editors one authorisation rule instead of two: the owner
-- may set their own coverage, and staff holding `vendor.manage` may set
-- anyone's. Expressing that in RLS would have meant loosening `vsr_write` for
-- every client; here the check sits in one place and the table's write policy
-- stays owner-only.
--
-- The diff is computed rather than "delete everything, re-insert": untouched
-- regions keep their rows, so nothing downstream sees a vendor's coverage
-- briefly vanish and reappear on an unrelated edit.
-- ---------------------------------------------------------------------
create or replace function public.set_vendor_service_regions(p_vendor_id uuid, p_keys text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_region_ids uuid[];
begin
  if not (public.is_vendor_owner(p_vendor_id) or public.has_permission('vendor.manage')) then
    perform public._forbidden();
  end if;

  -- Unknown or retired keys are dropped rather than rejected: the caller's
  -- option list can lag the reference table, and a stale entry in a submitted
  -- form shouldn't cost the vendor the rest of their selection.
  -- `distinct` because a caller may repeat a key; the conflict clause below
  -- would absorb it, but the array also drives the delete and is easier to
  -- reason about as a true set.
  select coalesce(array_agg(distinct sr.id), '{}'::uuid[])
    into v_region_ids
  from unnest(coalesce(p_keys, '{}'::text[])) as k(region_key)
  join public.service_regions sr on sr.key = k.region_key and sr.is_active;

  -- An empty selection matches nothing, so this clears the vendor's coverage —
  -- which is the correct reading of "I serve nowhere in particular yet".
  delete from public.vendor_service_regions
   where vendor_id = p_vendor_id
     and not (region_id = any(v_region_ids));

  insert into public.vendor_service_regions(vendor_id, region_id)
  select p_vendor_id, r.id from unnest(v_region_ids) as r(id)
  on conflict (vendor_id, region_id) do nothing;
end;$$;

revoke execute on function public.set_vendor_service_regions(uuid, text[]) from public, anon;
grant  execute on function public.set_vendor_service_regions(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 4. vsr_read
-- Coverage was readable by the public (for a public vendor) and by the owner,
-- but not by staff — so an admin could not see the coverage they are now able
-- to edit, and a vendor pending review had coverage nobody could inspect.
--
-- This brings the policy in line with `vsvc_read`, the equivalent on
-- `vendor_services`, which has carried the `vendor.manage` clause since 0011.
-- The write policy is deliberately left owner-only: staff edits go through
-- `set_vendor_service_regions`, which is where their permission is checked.
-- ---------------------------------------------------------------------
drop policy if exists vsr_read on public.vendor_service_regions;
create policy vsr_read on public.vendor_service_regions for select to anon, authenticated
  using (
    public.vendor_is_public(vendor_id)
    or public.is_vendor_owner(vendor_id)
    or public.has_permission('vendor.manage')
  );
