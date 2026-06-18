-- =====================================================================
-- Sinnapi — 0003 Identity / Access & Reference Data
-- profiles, roles, permissions, role_permissions, user_roles,
-- service_categories, service_regions, currencies, exchange_rates,
-- platform_settings.
-- =====================================================================

-- ---------------------------------------------------------------------
-- IDENTITY & ACCESS
-- ---------------------------------------------------------------------

-- profiles : 1:1 with auth.users. One account may hold multiple roles.
create table public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null,
  email              citext not null,
  phone              text,
  avatar_url         text,
  status             profile_status not null default 'pending',
  locale             text default 'en',
  preferred_currency text default 'UGX',
  mfa_enabled        boolean not null default false,
  last_login_at      timestamptz,
  -- standard columns
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id),
  updated_by         uuid references public.profiles(id),
  deleted_at         timestamptz,
  deleted_by         uuid references public.profiles(id),
  version            integer not null default 1
);
create unique index ux_profiles_email on public.profiles(email) where deleted_at is null;
create index ix_profiles_status on public.profiles(status);
create index ix_profiles_phone  on public.profiles(phone);

-- roles : Client, Planner, Vendor + admin sub-roles (Super/Compliance/Finance/Support).
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  key         text not null,
  name        text not null,
  description text,
  is_admin    boolean not null default false,  -- true for admin sub-roles
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id),
  updated_by  uuid references public.profiles(id),
  version     integer not null default 1
);
create unique index ux_roles_key on public.roles(key);

-- permissions : atomic permission catalog (e.g. escrow.release, payout.approve).
create table public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  category    text,
  description text,
  created_at  timestamptz not null default now()
);

-- role_permissions : runtime-configurable mapping (Super Admin manages).
create table public.role_permissions (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id),
  unique (role_id, permission_id)
);
create index ix_role_permissions_permission on public.role_permissions(permission_id);

-- user_roles : assign roles to users (multi-role per account).
create table public.user_roles (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  role_id     uuid not null references public.roles(id) on delete cascade,
  granted_by  uuid references public.profiles(id),
  granted_at  timestamptz not null default now(),
  unique (profile_id, role_id)
);
create index ix_user_roles_role on public.user_roles(role_id);

-- ---------------------------------------------------------------------
-- REFERENCE / LOOKUP  (global; no soft delete needed)
-- ---------------------------------------------------------------------

create table public.service_categories (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  parent_id  uuid references public.service_categories(id),
  icon       text,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index ix_service_categories_parent on public.service_categories(parent_id);

create table public.service_regions (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  scope      text not null check (scope in ('city','region','national','continental','international')),
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.currencies (
  code       text primary key,          -- ISO-4217 (UGX, USD)
  name       text not null,
  symbol     text not null,
  minor_unit integer not null default 2,
  is_active  boolean not null default true
);

create table public.exchange_rates (
  id             uuid primary key default gen_random_uuid(),
  base_currency  text not null references public.currencies(code),
  quote_currency text not null references public.currencies(code),
  rate           numeric(18,8) not null check (rate > 0),
  source         text,
  fetched_at     timestamptz not null default now(),
  valid_from     timestamptz not null default now(),
  valid_to       timestamptz
);
create index ix_exchange_rates_pair on public.exchange_rates(base_currency, quote_currency, fetched_at desc);

-- platform_settings : global config singleton-by-key (commission %, grace
-- period, FX, quote expiry, cancellation policy, retention).
create table public.platform_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  data_type   text,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id),
  version     integer not null default 1
);
