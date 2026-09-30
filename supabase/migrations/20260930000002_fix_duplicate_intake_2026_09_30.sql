-- =====================================================================
-- Sinnapi — 0930b DATA FIX: the duplicate application incident
-- Incident: 2026-09-30, murungiaisha872@gmail.com
--
-- WHAT HAPPENED
-- One applicant submitted three times (a typo in the business name on the first,
-- corrected on the next two). Compliance approved the FIRST, was asked to
-- disregard it, then approved the SECOND. Because `approve_vendor` inserts into
-- `vendors` unconditionally, that produced TWO live vendors and TWO trial
-- subscriptions for one owner; and because `promote-intake` reused the account
-- the first approval had created, the second approval email carried no password.
-- She could not have used the portal either way — `VendorProvider` resolves the
-- signed-in vendor with `.maybeSingle()` on `owner_id`, which errors on a second
-- row.
--
-- WHAT THIS DOES
-- Retires BOTH of her vendors and returns her NEWEST submission to 'submitted'
-- so it can be approved from scratch, which is what finally mails her a working
-- password. The two earlier submissions become 'withdrawn', linked to the
-- survivor. This owner is the one case where *every* listing goes, rather than
-- one being kept — she has no history worth preserving on either, and a clean
-- re-approval is what produces the credential she never received.
--
-- 0930c handles the OTHER owners the constraint found, under a different rule
-- (keep the listing with client activity). Do not merge the two: applying 0930c's
-- keep-rule here would leave one of her duplicates standing.
--
-- EVERYTHING HERE IS A SOFT DELETE, AND NOT BY CHOICE
-- `20260618000010_triggers.sql` puts a BEFORE DELETE trigger on every table with
-- a `deleted_at` column (`tg_soft_delete`) which sets `deleted_at` and RETURNS
-- NULL, cancelling the physical delete. So a `delete from public.vendors` here
-- sets `deleted_at` and nothing more. Two consequences worth stating, because
-- both are easy to get wrong:
--
--   • `ON DELETE CASCADE` never fires. The row is not actually deleted, so a
--     vendor's quotations, bookings and reviews are untouched by this. Verified,
--     not assumed.
--   • `get diagnostics row_count` reports 0, because the trigger suppressed the
--     row. Counts below are therefore taken by SELECT, not from row_count —
--     an earlier draft of this migration reported "deleted 0 vendor(s)" while
--     correctly retiring two.
--
-- Soft-delete is also what `ux_vendors_one_live_per_owner` (0930d) wants: it is
-- partial on `deleted_at is null`, so a retired listing frees the owner's slot
-- while staying fully recoverable if the wrong one was retired.
--
-- SUBSCRIPTIONS MUST BE RETIRED EXPLICITLY
-- `subscription-lifecycle` selects on `status in ('trialing','active')` and
-- `deleted_at is null` on the SUBSCRIPTION, and never checks whether the vendor
-- behind it is soft-deleted. Leaving a trialing subscription on a retired vendor
-- would keep mailing the applicant trial-expiry reminders for a listing that no
-- longer exists, which is precisely the sort of thing this incident already did
-- to her once.
--
-- PUBLIC IDENTIFIERS
-- The retired vendors keep their `SV…` ids, and the registry keeps them even for
-- rows that are gone, so `resolve_public_id` can answer "that record was
-- retired" rather than "no such id". Her surviving intake keeps its frozen
-- `SL…`, so the reference in the confirmation email she already holds stays
-- valid, and approval mints a fresh `SV…`.
--
-- SAFETY
-- Fingerprinted and idempotent: it acts only on the exact state described above
-- and otherwise raises a notice and does nothing, so it is a no-op on develop, on
-- a fresh database, and on any re-run. It refuses outright only if one of her
-- listings has client-facing history — not because a delete would cascade (it
-- would not) but because retiring a listing a client holds a live booking
-- against is a decision a person has to make.
-- =====================================================================

do $$
declare
  v_email    citext := 'murungiaisha872@gmail.com';
  v_keep     uuid;
  v_owner    uuid;
  v_total    int;
  v_children int;
  v_unwind   uuid[];
  v_apps     uuid[];
  v_vendors  uuid[];
  v_count    int;
begin
  select count(*) into v_total
  from public.vendor_application_intake where owner_email = v_email;

  -- --- Fingerprint. Anything but the incident state and we do nothing. ------
  if v_total = 0 then
    raise notice '[0930b] no intakes for % — nothing to fix (expected on develop/fresh db)', v_email;
    return;
  end if;

  if v_total <> 3 then
    raise notice '[0930b] found % intakes for % (expected 3) — skipping, needs a human',
      v_total, v_email;
    return;
  end if;

  if (select count(*) from public.vendor_application_intake
      where owner_email = v_email and status = 'withdrawn') = 2 then
    raise notice '[0930b] already applied for % — skipping', v_email;
    return;
  end if;

  -- The survivor: newest by submission time. This carries the corrected business
  -- name, and is the one the applicant last stood behind.
  select id into v_keep
  from public.vendor_application_intake
  where owner_email = v_email
  order by created_at desc
  limit 1;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_unwind
  from public.vendor_application_intake
  where owner_email = v_email and id <> v_keep;

  select coalesce(array_agg(promoted_application_id), '{}'::uuid[]) into v_apps
  from public.vendor_application_intake
  where id = any(v_unwind) and promoted_application_id is not null;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_vendors
  from public.vendors
  where application_id = any(v_apps) and deleted_at is null;

  raise notice '[0930b] keep=% unwind=% applications=% vendors=%',
    v_keep, v_unwind, v_apps, v_vendors;

  -- --- Refuse if a listing has client-facing history. -----------------------
  -- A soft delete does not cascade, so nothing would be destroyed — but hiding a
  -- listing that a client holds a quotation, booking or review against is not a
  -- call this migration gets to make silently.
  if array_length(v_vendors, 1) > 0 then
    select (select count(*) from public.quotations
              where vendor_id = any(v_vendors) and deleted_at is null)
         + (select count(*) from public.bookings
              where vendor_id = any(v_vendors) and deleted_at is null)
         + (select count(*) from public.reviews
              where vendor_id = any(v_vendors) and deleted_at is null)
      into v_children;

    if v_children > 0 then
      raise exception
        '[0930b] refusing: % live client-facing row(s) (quotations/bookings/reviews) belong to vendors %',
        v_children, v_vendors
        using hint = 'Decide by hand which listing survives and what happens to that client activity.';
    end if;
  end if;

  select owner_id into v_owner from public.vendors where id = any(v_vendors) limit 1;
  if v_owner is null then
    select id into v_owner from public.profiles where email = v_email;
  end if;

  -- --- Retire the listings. ------------------------------------------------
  if array_length(v_vendors, 1) > 0 then
    -- Subscriptions FIRST and explicitly: see the header. A trialing row left
    -- behind keeps the billing cron mailing her about a listing that is gone.
    delete from public.subscriptions where vendor_id = any(v_vendors);
    select count(*) into v_count
    from public.subscriptions where vendor_id = any(v_vendors) and deleted_at is not null;
    raise notice '[0930b] retired % subscription(s)', v_count;

    -- The vendor's own setup. `vendor_service_regions` has no `deleted_at`, so
    -- that one is a genuine physical delete; the other two soft-delete.
    delete from public.vendor_service_regions where vendor_id = any(v_vendors);
    delete from public.vendor_media           where vendor_id = any(v_vendors);
    delete from public.vendor_services        where vendor_id = any(v_vendors);

    delete from public.vendors where id = any(v_vendors);
    select count(*) into v_count
    from public.vendors where id = any(v_vendors) and deleted_at is not null;
    raise notice '[0930b] retired % vendor(s)', v_count;
  end if;

  -- --- Retire the applications behind them. --------------------------------
  -- Soft-deleted, so `vendors.application_id` stays referentially valid and the
  -- history of what was approved survives. The intake's own link is cleared so
  -- the row reads as un-promoted and the queue stops offering to open it.
  if array_length(v_apps, 1) > 0 then
    delete from public.vendor_applications where id = any(v_apps);
    select count(*) into v_count
    from public.vendor_applications where id = any(v_apps) and deleted_at is not null;
    raise notice '[0930b] retired % vendor_application(s)', v_count;
  end if;

  update public.vendor_application_intake
     set promoted_application_id = null
   where id = any(v_unwind);

  -- --- Retire the two superseded submissions. ------------------------------
  update public.vendor_application_intake
     set status = 'withdrawn',
         superseded_by_intake_id = v_keep,
         review_notes = coalesce(nullif(btrim(review_notes), '') || E'\n\n', '')
           || 'Withdrawn 2026-09-30: duplicate submission (business-name typo, re-submitted). '
           || 'The approval it received was unwound — vendor, subscription and application rows '
           || 'retired (soft-deleted). Superseded by the applicant''s final submission.',
         reviewed_at = now()
   where id = any(v_unwind);

  -- --- Put the survivor back in the queue. ---------------------------------
  update public.vendor_application_intake
     set status = 'submitted',
         promoted_application_id = null,
         superseded_by_intake_id = null,
         reviewed_by = null,
         reviewed_at = null,
         review_notes = 'Re-queued 2026-09-30 after two duplicate submissions from the same '
           || 'applicant were withdrawn. This is the only submission to act on.'
   where id = v_keep;

  -- --- Assert the end state, or roll the whole push back. ------------------
  if exists (select 1 from public.vendors where owner_id = v_owner and deleted_at is null) then
    raise exception '[0930b] owner % still has a live vendor after cleanup', v_owner;
  end if;

  if exists (
    select 1 from public.subscriptions s
    join public.vendors v on v.id = s.vendor_id
    where v.owner_id = v_owner and s.deleted_at is null
      and s.status in ('trialing', 'active', 'past_due', 'grace')
  ) then
    raise exception '[0930b] owner % still has a live subscription after cleanup', v_owner;
  end if;

  if (select count(*) from public.vendor_application_intake
      where owner_email = v_email and status = 'submitted') <> 1 then
    raise exception '[0930b] expected exactly 1 submitted intake for % after cleanup', v_email;
  end if;

  if (select count(*) from public.vendor_application_intake
      where owner_email = v_email and status = 'withdrawn') <> 2 then
    raise exception '[0930b] expected exactly 2 withdrawn intakes for % after cleanup', v_email;
  end if;

  raise notice '[0930b] OK — approve intake % in the admin portal', v_keep;
end$$;
