-- =====================================================================
-- Sinnapi — 0930d One live vendor per owner
--
-- WHY THIS IS A CONSTRAINT AND NOT A CODE CHECK
-- `approve_vendor` has always done an unconditional `insert into public.vendors`,
-- and nothing stopped a second one for the same `owner_id`. Approving two
-- intakes from the same applicant therefore produced two live, publicly visible
-- vendor rows and two 'trialing' subscriptions — `ux_subscription_active` is
-- unique per vendor_id, so a second vendor slips straight past it.
--
-- The damage is not cosmetic. `VendorProvider` resolves the signed-in vendor
-- with `.eq('owner_id', user.id).is('deleted_at', null).maybeSingle()`, and
-- maybeSingle() ERRORS when more than one row comes back. A vendor with two
-- rows cannot open the vendor portal at all — they see "no vendor", with a
-- valid password and an approved, listed business.
--
-- One vendor per owner is already assumed everywhere that resolution happens,
-- so it belongs in the schema. A guard in `approve_vendor` alone would still
-- leave every other insert path (backfills, imports, support scripts) free to
-- recreate the state that breaks the portal.
--
-- PRECONDITION
-- This migration REFUSES to apply while any owner still has two live vendors,
-- naming them, rather than failing on an opaque unique-violation. That refusal
-- has already happened once, on 2026-09-30, and it is what revealed that FOUR
-- owners were affected rather than one — so the guard has already earned itself.
--
-- The two migrations before it clear that state: `0930b` retires both listings
-- belonging to the original incident's applicant so her final submission can be
-- approved from scratch, and `0930c` reconciles every other duplicated owner
-- under a keep-rule. If the exception below still fires after those, some owner
-- has two listings that BOTH carry client history and 0930c refused to choose
-- between them — run `scripts/ops/2026-09-30-duplicate-vendors-diagnose.sql`
-- (result set 5) to see which. Failing closed is the point: a half-applied fix
-- would be worse than no fix.
-- =====================================================================

do $$
declare v_dupes text;
begin
  select string_agg(format('owner_id=%s (%s vendors)', owner_id, n), '; ')
    into v_dupes
  from (
    select owner_id, count(*) as n
    from public.vendors
    where deleted_at is null
    group by owner_id
    having count(*) > 1
  ) d;

  if v_dupes is not null then
    raise exception
      'cannot add one-vendor-per-owner constraint: duplicate live vendors exist -> %',
      v_dupes
      using hint = 'Soft-delete or remove the duplicate vendor rows first, then re-run this migration.';
  end if;
end$$;

-- Partial, so soft-deleted vendors do not block an owner from being re-approved
-- later — the same `deleted_at is null` scope the portal's own lookup uses.
create unique index if not exists ux_vendors_one_live_per_owner
  on public.vendors(owner_id)
  where deleted_at is null;

comment on index public.ux_vendors_one_live_per_owner is
  'One live vendor per owner. VendorProvider resolves the signed-in vendor with '
  'maybeSingle() on owner_id, which errors on a second row and locks the vendor '
  'out of their own portal.';
