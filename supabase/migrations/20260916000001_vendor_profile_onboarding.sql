-- =====================================================================
-- Sinnapi — vendor profile onboarding
--
-- The public vendor application was cut to one short step (business name,
-- applicant type, services, owner contact) so applicants are not put off by a
-- long form. Everything the listing actually needs is therefore missing at
-- approval time, and is now collected from the VENDOR PORTAL instead, through a
-- guided onboarding wizard the vendor completes on first sign-in.
--
-- This migration adds the columns that wizard writes and that no table yet had.
-- Payout details already have `vendor_bank_accounts` + `set_vendor_bank_account`
-- (the account number is encrypted there, so it must never be duplicated onto
-- `vendors`), gallery/video media already have `vendor_media`, and coverage
-- already has `vendor_service_regions` + `set_vendor_service_regions`.
--
-- No new RLS: `vendors_owner_update` already lets a vendor write their own row,
-- and `vendors_owner_read` lets them read it back. The verification documents
-- below are STORAGE PATHS into the private `vendor-private` bucket, never the
-- file contents, so the column being owner-readable exposes nothing on its own.
-- =====================================================================

alter table public.vendors
  -- Address/landmark under the city already in `base_city`.
  add column if not exists business_location text,

  -- Socials. Kept as four columns rather than a jsonb blob to match
  -- `vendor_application_intake`, which is where older vendors' values came from.
  add column if not exists instagram_url text,
  add column if not exists tiktok_url text,
  add column if not exists linkedin_url text,
  add column if not exists facebook_url text,

  -- Verification documents: PRIVATE bucket paths, signed on read by staff.
  add column if not exists national_id_path text,
  add column if not exists proof_of_work_path text,

  -- Registered-business particulars (optional; individuals leave them null).
  add column if not exists business_reg_number text,
  add column if not exists tax_id text,
  add column if not exists icandy_alumni boolean,

  -- Set once the vendor has supplied every REQUIRED field. Nullable rather than
  -- a boolean so the portal can say when onboarding finished, and so a vendor
  -- who completed it before a future field became required is still recorded as
  -- having finished the version they were shown.
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.vendors.national_id_path is
  'Path in the private `vendor-private` bucket. Never a public URL.';
comment on column public.vendors.onboarding_completed_at is
  'When the vendor finished the portal onboarding wizard; null while incomplete.';
