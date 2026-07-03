-- =====================================================================
-- Sinnapi — 0014 Public Vendor Application Intake
-- A decoupled, PUBLIC-facing intake for the web-public "Become a vendor"
-- form. Deliberately separate from the auth-bound `vendor_applications`
-- (which requires a profile/auth.users row): prospective vendors apply
-- WITHOUT an account. Compliance later reviews an intake and promotes an
-- approved one into a real `vendor_applications` (creating the auth user).
--
-- Security model:
--   • Row writes go ONLY through the `vendor-application` Edge Function
--     (service_role) — no anon INSERT policy on the table, so payload is
--     validated server-side and sensitive fields (bank, national id) are
--     never written with arbitrary client SQL.
--   • Files upload directly from the browser (anon) into the PRIVATE
--     `application-intake` bucket, keyed by a client-generated submission
--     ref. Reads are compliance-only via short-lived signed URLs.
-- =====================================================================

create table public.vendor_application_intake (
  id                        uuid primary key default gen_random_uuid(),
  submission_ref            uuid not null unique,          -- ties row ↔ storage folder
  status                    text not null default 'submitted'
                              check (status in ('submitted','reviewing','approved','rejected')),

  -- --- Business basics ---
  business_name             text not null,
  applicant_type            text not null
                              check (applicant_type in ('individual','registered_business')),
  biography                 text,
  business_location         text,
  base_city                 text,
  years_in_operation        text
                              check (years_in_operation is null or years_in_operation in
                                     ('lt_1y','1_3y','3_5y','5_10y','10y_plus')),
  website                   text,

  -- --- Services / categories (by reference key; validated against seed) ---
  primary_category_key      text,
  service_category_keys     text[] not null default '{}',

  -- --- Pricing & availability ---
  pricing_model             text
                              check (pricing_model is null or pricing_model in
                                     ('fixed','hourly','custom','combination')),
  starting_price            numeric(14,2) check (starting_price is null or starting_price >= 0),
  starting_price_currency   text not null default 'UGX',
  lead_time                 text
                              check (lead_time is null or lead_time in
                                     ('same_week','1_2_weeks','2_4_weeks','1_3_months','3_plus_months')),
  service_region_keys       text[] not null default '{}',
  icandy_alumni             boolean,

  -- --- Owner / contact ---
  owner_full_name           text not null,
  owner_email               citext not null,
  owner_phone               text not null,

  -- --- Portfolio & media (public-media / vendor-videos style URLs) ---
  profile_image_url         text,
  primary_image_url         text,
  gallery_image_urls        text[] not null default '{}',
  video_urls                text[] not null default '{}',

  -- --- Socials ---
  instagram_url             text,
  tiktok_url                text,
  linkedin_url              text,
  facebook_url              text,

  -- --- Verification docs (PRIVATE bucket → store path, sign on read) ---
  national_id_path          text,
  proof_of_work_path        text,
  business_reg_number       text,                          -- optional (registered only)
  tax_id                    text,                           -- optional

  -- --- Payout (sensitive — compliance-only read, no client SELECT) ---
  bank_name                 text,
  account_name              text,
  account_number            text,
  branch                    text,

  -- --- References (optional array of {full_name,phone,email,event_worked_on,event_date}) ---
  referees                  jsonb not null default '[]',

  -- --- Terms & confirmation (all four required; enforced in the Edge Fn) ---
  accepted_info_accuracy       boolean not null default false,
  accepted_vendor_terms        boolean not null default false,
  accepted_escrow_policy       boolean not null default false,
  accepted_false_info_removal  boolean not null default false,

  -- --- Audit ---
  ip_address                inet,
  user_agent                text,
  review_notes              text,
  reviewed_by               uuid references public.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index ix_intake_status  on public.vendor_application_intake(status);
create index ix_intake_email    on public.vendor_application_intake(owner_email);
create index ix_intake_created  on public.vendor_application_intake(created_at desc);

-- keep updated_at fresh
create or replace function public.tg_intake_touch_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_intake_touch_updated
  before update on public.vendor_application_intake
  for each row execute function public.tg_intake_touch_updated();

-- ---------- RLS: default deny; compliance reads; writes are service_role only ----------
alter table public.vendor_application_intake enable row level security;
alter table public.vendor_application_intake force row level security;

-- No anon/authenticated INSERT policy on purpose: the Edge Function inserts
-- with the service_role (which bypasses RLS). Compliance may read + triage.
create policy intake_read on public.vendor_application_intake for select to authenticated
  using (public.has_permission('vendor.review'));
create policy intake_update on public.vendor_application_intake for update to authenticated
  using (public.has_permission('vendor.review'))
  with check (public.has_permission('vendor.review'));

-- ---------------------------------------------------------------------
-- Storage: PRIVATE intake bucket. Anonymous applicants upload their files
-- directly (National ID, proof, portfolio, videos); nobody but compliance
-- (or the service_role) can read them back. Path convention:
--   {submission_ref}/{kind}/{filename}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('application-intake', 'application-intake', false, 524288000,
   array['image/jpeg','image/png','image/webp','image/avif',
         'application/pdf',
         'video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;

-- Anonymous prospects may create (upload) objects in this bucket only.
create policy intake_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'application-intake');
-- Read is compliance-only (signed URLs); owner is null for anon uploads.
create policy intake_files_read on storage.objects for select to authenticated
  using (bucket_id = 'application-intake' and public.has_permission('vendor.review'));
