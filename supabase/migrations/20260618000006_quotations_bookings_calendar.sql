-- =====================================================================
-- Sinnapi — 0006 Quotations, Bookings, Calendar & Availability
-- quote_templates (+ items), quotations (+ items, history),
-- bookings (+ history), vendor_availability, vendor_blocked_dates.
-- =====================================================================

-- ---------------------------------------------------------------------
-- QUOTE TEMPLATES
-- ---------------------------------------------------------------------
create table public.quote_templates (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references public.vendors(id) on delete cascade,
  name       text not null,
  currency   text references public.currencies(code) default 'UGX',
  notes      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  version    integer not null default 1
);
create index ix_quote_templates_vendor on public.quote_templates(vendor_id);

create table public.quote_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.quote_templates(id) on delete cascade,
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  sort_order  integer not null default 0
);
create index ix_qti_template on public.quote_template_items(template_id);

-- ---------------------------------------------------------------------
-- QUOTATIONS
-- ---------------------------------------------------------------------
create table public.quotations (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references public.vendors(id) on delete cascade,
  client_id           uuid not null references public.profiles(id) on delete cascade,
  event_id            uuid references public.events(id),
  template_id         uuid references public.quote_templates(id),
  reference_no        text not null,
  status              quotation_status not null default 'requested',
  currency            text not null references public.currencies(code) default 'UGX',
  subtotal            numeric(14,2) not null default 0,
  discount_total      numeric(14,2) not null default 0,
  tax_total           numeric(14,2) not null default 0,
  total               numeric(14,2) not null default 0,
  valid_until         timestamptz,
  version_no          integer not null default 1,
  parent_quotation_id uuid references public.quotations(id),
  request_details     text,
  sent_at             timestamptz,
  responded_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  deleted_by          uuid references public.profiles(id),
  version             integer not null default 1
);
create unique index ux_quotations_ref on public.quotations(reference_no);
create index ix_quotations_vendor on public.quotations(vendor_id, status);
create index ix_quotations_client on public.quotations(client_id, status);
create index ix_quotations_event  on public.quotations(event_id);

create table public.quotation_items (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  description  text not null,
  quantity     numeric(12,2) not null default 1,
  unit_price   numeric(14,2) not null default 0,
  line_total   numeric(14,2) not null default 0,
  sort_order   integer not null default 0
);
create index ix_quotation_items_q on public.quotation_items(quotation_id);

create table public.quotation_status_history (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  from_status  quotation_status,
  to_status    quotation_status not null,
  actor_id     uuid references public.profiles(id),
  metadata     jsonb,
  occurred_at  timestamptz not null default now()
);
create index ix_qsh_q on public.quotation_status_history(quotation_id, occurred_at);

-- ---------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------
create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references public.vendors(id) on delete cascade,
  client_id           uuid not null references public.profiles(id) on delete cascade,
  vendor_service_id   uuid references public.vendor_services(id),
  quotation_id        uuid references public.quotations(id),
  event_id            uuid references public.events(id),
  reference_no        text not null,
  status              booking_status not null default 'requested',
  event_date          date not null,
  start_time          time,
  end_time            time,
  location            text,
  currency            text not null references public.currencies(code) default 'UGX',
  amount              numeric(14,2) not null default 0 check (amount >= 0),
  payment_type        payment_type,
  cancelled_by        uuid references public.profiles(id),
  cancellation_reason text,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  deleted_at          timestamptz,
  deleted_by          uuid references public.profiles(id),
  version             integer not null default 1
);
create unique index ux_bookings_ref on public.bookings(reference_no);
create index ix_bookings_vendor on public.bookings(vendor_id, status);
create index ix_bookings_client on public.bookings(client_id, status);
create index ix_bookings_date   on public.bookings(event_date);

create table public.booking_status_history (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  from_status booking_status,
  to_status   booking_status not null,
  actor_id    uuid references public.profiles(id),
  reason      text,
  occurred_at timestamptz not null default now()
);
create index ix_bsh_booking on public.booking_status_history(booking_id, occurred_at);

-- ---------------------------------------------------------------------
-- CALENDAR / AVAILABILITY
-- ---------------------------------------------------------------------
create table public.vendor_availability (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid not null references public.vendors(id) on delete cascade,
  day_of_week   integer check (day_of_week between 0 and 6),
  specific_date date,
  start_time    time not null,
  end_time      time not null,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  version       integer not null default 1,
  check (day_of_week is not null or specific_date is not null),
  check (end_time > start_time)
);
create index ix_avail_vendor_dow  on public.vendor_availability(vendor_id, day_of_week);
create index ix_avail_vendor_date on public.vendor_availability(vendor_id, specific_date);

create table public.vendor_blocked_dates (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references public.vendors(id) on delete cascade,
  blocked_date date not null,
  reason       text,
  source       blocked_date_source not null default 'manual',
  booking_id   uuid references public.bookings(id) on delete cascade,
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id),
  unique (vendor_id, blocked_date, source)
);
create index ix_blocked_vendor on public.vendor_blocked_dates(vendor_id);
