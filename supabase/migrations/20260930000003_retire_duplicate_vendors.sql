-- =====================================================================
-- Sinnapi — 0930c Retire duplicate live vendors (platform-wide)
--
-- WHY THIS EXISTS
-- 0930d adds `ux_vendors_one_live_per_owner` and refused to apply, naming FOUR
-- owners with more than one live vendor — one of them with four. The duplicate
-- application incident that started this work was never specific to one
-- applicant: `approve_vendor` has always inserted into `vendors` unconditionally,
-- so any owner who was approved twice is in this state, and so is any vendor the
-- legacy import created who then applied through the public form and was approved
-- (those show `application_id is null` on the imported row).
--
-- Every one of them is broken in the same way and it is not cosmetic:
-- `VendorProvider` resolves the signed-in vendor with `.maybeSingle()` on
-- `owner_id`, which ERRORS on a second row. Each of these owners currently sees
-- "no vendor" in the Business Portal while their listings sit live and public.
--
-- THE KEEP RULE
--   1. If exactly ONE of an owner's live listings has client-facing history
--      (a quotation, booking or review), that one survives. Retiring it would
--      hide a listing a client has actually transacted against.
--   2. If NONE has client history, the NEWEST survives — the later approval is
--      the corrected one, which is the whole shape of the original incident.
--   3. If TWO OR MORE have client history, this migration REFUSES and names the
--      owner. Choosing between two listings that both have real client activity
--      means deciding what happens to that activity, and that is a person's
--      call, not a script's.
--
-- Rule 3 is why this can be trusted to run unattended: the ambiguous case stops
-- the push instead of guessing. `scripts/ops/2026-09-30-duplicate-vendors-diagnose.sql`
-- predicts which branch each owner takes before you push.
--
-- SOFT DELETE, AND WHAT THAT MEANS HERE
-- `tg_soft_delete` (20260618000010) turns every DELETE on a table with a
-- `deleted_at` column into `deleted_at = now()` and cancels the physical delete.
-- So nothing below destroys anything, `ON DELETE CASCADE` never fires, and a
-- retired listing keeps all its media, services, quotations and bookings. It also
-- means `get diagnostics row_count` reads 0 for these statements, so counts here
-- are taken by SELECT.
--
-- Retiring is reversible: `update public.vendors set deleted_at = null where id = …`
-- puts a listing back, provided the owner has no other live one.
--
-- SUBSCRIPTIONS
-- Retired explicitly, because `subscription-lifecycle` filters `deleted_at` on the
-- SUBSCRIPTION and never looks at whether the vendor is soft-deleted. A trialing
-- row left on a retired listing keeps mailing its owner trial-expiry reminders.
--
-- Aisha's own case is handled by 0930b, which runs first and retires BOTH of her
-- listings so her final submission can be approved from scratch. By the time this
-- runs she has no live vendor, so the rule below does not see her.
-- =====================================================================

do $$
declare
  r            record;
  v_keep       uuid;
  v_retire     uuid[];
  v_with_hist  uuid[];
  v_count      int;
  v_owners     int := 0;
  v_retired    int := 0;
begin
  for r in
    select v.owner_id, count(*) as live_vendors
    from public.vendors v
    where v.deleted_at is null
    group by v.owner_id
    having count(*) > 1
    order by v.owner_id
  loop
    v_owners := v_owners + 1;

    -- Which of this owner's live listings have client-facing history?
    select coalesce(array_agg(v.id), '{}'::uuid[]) into v_with_hist
    from public.vendors v
    where v.owner_id = r.owner_id
      and v.deleted_at is null
      and (
        exists (select 1 from public.quotations q
                 where q.vendor_id = v.id and q.deleted_at is null)
        or exists (select 1 from public.bookings b
                 where b.vendor_id = v.id and b.deleted_at is null)
        or exists (select 1 from public.reviews rv
                 where rv.vendor_id = v.id and rv.deleted_at is null)
      );

    -- Rule 3: ambiguous. Stop, and say exactly which listings are in conflict.
    if array_length(v_with_hist, 1) > 1 then
      raise exception
        '[0930c] refusing: owner % has % live listings with client history (%) — pick the survivor by hand',
        r.owner_id, array_length(v_with_hist, 1), v_with_hist
        using hint = 'Soft-delete the loser yourself (set deleted_at), deciding what happens to its quotations/bookings, then re-run the push.';
    end if;

    -- Rule 1, else rule 2.
    if array_length(v_with_hist, 1) = 1 then
      v_keep := v_with_hist[1];
    else
      select id into v_keep
      from public.vendors
      where owner_id = r.owner_id and deleted_at is null
      order by created_at desc, id
      limit 1;
    end if;

    select coalesce(array_agg(id), '{}'::uuid[]) into v_retire
    from public.vendors
    where owner_id = r.owner_id and deleted_at is null and id <> v_keep;

    raise notice '[0930c] owner %: % live, keeping % (%), retiring %',
      r.owner_id, r.live_vendors, v_keep,
      case when array_length(v_with_hist, 1) = 1 then 'has client history' else 'newest' end,
      v_retire;

    -- Subscriptions first — see the header.
    delete from public.subscriptions where vendor_id = any(v_retire);

    delete from public.vendors where id = any(v_retire);
    select count(*) into v_count
    from public.vendors where id = any(v_retire) and deleted_at is not null;
    v_retired := v_retired + v_count;

    -- Per-owner assertion: exactly one live listing left.
    if (select count(*) from public.vendors
        where owner_id = r.owner_id and deleted_at is null) <> 1 then
      raise exception '[0930c] owner % does not have exactly 1 live vendor after retirement',
        r.owner_id;
    end if;
  end loop;

  if v_owners = 0 then
    raise notice '[0930c] no owner has more than one live vendor — nothing to do';
  else
    raise notice '[0930c] OK — % owner(s) reconciled, % listing(s) retired', v_owners, v_retired;
  end if;
end$$;

-- Media and services on the retired listings are deliberately LEFT ALONE. They
-- belong to a soft-deleted vendor, nothing reads them, and leaving them intact is
-- what makes `deleted_at = null` a complete undo if the wrong listing was kept.
