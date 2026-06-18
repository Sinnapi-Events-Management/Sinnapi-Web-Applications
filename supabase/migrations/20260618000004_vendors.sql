-- =====================================================================
-- Sinnapi — 0004 Vendor Domain
-- vendor_applications (+ history), vendors, services, service_regions,
-- media, bank_accounts (secure), social_links, references, documents,
-- terms_acceptances.
-- =====================================================================

-- ---------------------------------------------------------------------
-- VENDOR APPLICATIONS (onboarding + approval workflow)
-- ---------------------------------------------------------------------
create table public.vendor_applications (
  id                      uuid primary key default gen_random_uuid(),
  applicant_id            uuid not null references public.profiles(id) on delete cascade,
  business_name           text not null,
  business_location       text,
  biography               text,
  primary_category_id     uuid references public.service_categories(id),
  base_city               text,
  website                 text,
  years_in_operation      years_in_operation,
  business_reg_number     text,
  tax_id                  text,
  icandy_alumni           boolean not null default false,
  pricing_model           pricing_model,
  starting_price          numeric(14,2),
  starting_price_currency text references public.currencies(code) default 'UGX',
  lead_time               lead_time,
  status                  application_status not null default 'draft',
  is_reapplication        boolean not null default false,
  previous_application_id uuid references public.vendor_applications(id),
  reviewed_by             uuid references public.profiles(id),
  review_notes            text,
  rejection_reason        text,
  submitted_at            timestamptz,
  decided_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  deleted_at              timestamptz,
  deleted_by              uuid references public.profiles(id),
  version                 integer not null default 1,
  check (starting_price is null or starting_price >= 0)
);
create index ix_app_status        on public.vendor_applications(status) where deleted_at is null;
create index ix_app_applicant      on public.vendor_applications(applicant_id);
create index ix_app_category       on public.vendor_applications(primary_category_id);
create index ix_app_reapplication  on public.vendor_applications(is_reapplication) where is_reapplication;

-- append-only application status / workflow history
create table public.application_status_history (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.vendor_applications(id) on delete cascade,
  from_status    application_status,
  to_status      application_status not null,
  actor_id       uuid references public.profiles(id),
  reason         text,
  metadata       jsonb,
  occurred_at    timestamptz not null default now()
);
create index ix_app_history_app on public.application_status_history(application_id, occurred_at);

-- ---------------------------------------------------------------------
-- VENDORS (approved business / public listing entity)
-- ---------------------------------------------------------------------
create table public.vendors (
  id                      uuid primary key default gen_random_uuid(),
  application_id          uuid references public.vendor_applications(id),
  owner_id                uuid not null references public.profiles(id) on delete cascade,
  business_name           text not null,
  slug                    text not null,
  biography               text,
  primary_category_id     uuid references public.service_categories(id),
  base_city               text,
  website                 text,
  years_in_operation      years_in_operation,
  pricing_model           pricing_model,
  starting_price          numeric(14,2),
  starting_price_currency text references public.currencies(code) default 'UGX',
  lead_time               lead_time,
  profile_image_url       text,
  primary_image_url       text,
  status                  vendor_status not null default 'active',
  visibility              vendor_visibility not null default 'hidden',
  is_featured             boolean not null default false,
  search_weight           integer not null default 0,
  avg_rating              numeric(3,2) not null default 0,
  review_count            integer not null default 0,
  trial_ends_at           timestamptz,
  search_tsv              tsvector,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references public.profiles(id),
  updated_by              uuid references public.profiles(id),
  deleted_at              timestamptz,
  deleted_by              uuid references public.profiles(id),
  version                 integer not null default 1
);
create unique index ux_vendors_slug on public.vendors(slug) where deleted_at is null;
create index ix_vendors_visibility on public.vendors(status, visibility) where deleted_at is null;
create index ix_vendors_category   on public.vendors(primary_category_id);
create index ix_vendors_featured    on public.vendors(is_featured) where is_featured;
create index ix_vendors_rating      on public.vendors(avg_rating desc);
create index ix_vendors_search      on public.vendors using gin(search_tsv);

-- keep search vector current
create or replace function public.tg_vendor_search_tsv()
returns trigger language plpgsql as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', coalesce(new.business_name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.base_city,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.biography,'')), 'C');
  return new;
end;
$$;
create trigger trg_vendor_search_tsv
  before insert or update of business_name, base_city, biography
  on public.vendors for each row execute function public.tg_vendor_search_tsv();

-- ---------------------------------------------------------------------
-- VENDOR SERVICES & REGIONS
-- ---------------------------------------------------------------------
create table public.vendor_services (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references public.vendors(id) on delete cascade,
  category_id   uuid not null references public.service_categories(id),
  title         text not null,
  description   text,
  base_price    numeric(14,2),
  currency      text references public.currencies(code) default 'UGX',
  pricing_model pricing_model,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles(id),
  version       integer not null default 1
);
create index ix_vendor_services_vendor   on public.vendor_services(vendor_id);
create index ix_vendor_services_category on public.vendor_services(category_id);

create table public.vendor_service_regions (
  id        uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  region_id uuid not null references public.service_regions(id) on delete cascade,
  unique (vendor_id, region_id)
);
create index ix_vsr_region on public.vendor_service_regions(region_id);

-- ---------------------------------------------------------------------
-- VENDOR MEDIA (plan-limited; gallery + video)
-- ---------------------------------------------------------------------
create table public.vendor_media (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors(id) on delete cascade,
  media_type   media_type not null,
  storage_path text not null,
  url          text,
  caption      text,
  sort_order   integer not null default 0,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  updated_by   uuid references public.profiles(id),
  deleted_at   timestamptz,
  deleted_by   uuid references public.profiles(id),
  version      integer not null default 1
);
create index ix_vendor_media_vendor on public.vendor_media(vendor_id, media_type);

-- ---------------------------------------------------------------------
-- VENDOR BANK ACCOUNTS  (SECURE — ciphertext, no client SELECT policy)
-- ---------------------------------------------------------------------
create table public.vendor_bank_accounts (
  id                       uuid primary key default gen_random_uuid(),
  vendor_id                uuid not null references public.vendors(id) on delete cascade,
  bank_name                text not null,
  account_name             text not null,
  account_number_encrypted bytea not null,           -- pgsodium/Vault ciphertext
  account_number_last4     text,                      -- display only
  branch                   text,
  is_verified              boolean not null default false,
  is_primary               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references public.profiles(id),
  updated_by               uuid references public.profiles(id),
  deleted_at               timestamptz,
  deleted_by               uuid references public.profiles(id),
  version                  integer not null default 1
);
create index ix_bank_vendor on public.vendor_bank_accounts(vendor_id);
create unique index ux_bank_primary on public.vendor_bank_accounts(vendor_id)
  where is_primary and deleted_at is null;

-- ---------------------------------------------------------------------
-- VENDOR SOCIAL LINKS / REFERENCES / DOCUMENTS / TERMS
-- ---------------------------------------------------------------------
create table public.vendor_social_links (
  id        uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  platform  social_platform not null,
  url       text not null,
  created_at timestamptz not null default now()
);
create index ix_social_vendor on public.vendor_social_links(vendor_id);

create table public.vendor_references (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid references public.vendors(id) on delete cascade,
  application_id  uuid references public.vendor_applications(id) on delete cascade,
  full_name       text not null,
  phone           text,
  email           citext,
  event_worked_on text,
  event_date      date,
  created_at      timestamptz not null default now(),
  check (vendor_id is not null or application_id is not null)
);
create index ix_refs_vendor on public.vendor_references(vendor_id);
create index ix_refs_app    on public.vendor_references(application_id);

create table public.vendor_documents (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid references public.vendors(id) on delete cascade,
  application_id uuid references public.vendor_applications(id) on delete cascade,
  doc_type       document_type not null,
  storage_path   text not null,
  file_name      text,
  mime_type      text,
  status         document_status not null default 'pending',
  scan_status    scan_status not null default 'pending',
  signed_at      timestamptz,
  verified_by    uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles(id),
  updated_by     uuid references public.profiles(id),
  deleted_at     timestamptz,
  deleted_by     uuid references public.profiles(id),
  version        integer not null default 1,
  check (vendor_id is not null or application_id is not null)
);
create index ix_docs_vendor on public.vendor_documents(vendor_id, doc_type);
create index ix_docs_app    on public.vendor_documents(application_id, doc_type);

create table public.vendor_terms_acceptances (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references public.vendor_applications(id) on delete cascade,
  vendor_id      uuid references public.vendors(id) on delete cascade,
  term_type      term_type not null,
  accepted       boolean not null default true,
  accepted_at    timestamptz not null default now(),
  ip_address     inet,
  user_agent     text,
  check (application_id is not null or vendor_id is not null)
);
create unique index ux_terms_app on public.vendor_terms_acceptances(application_id, term_type)
  where application_id is not null;
