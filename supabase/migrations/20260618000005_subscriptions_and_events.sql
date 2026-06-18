-- =====================================================================
-- Sinnapi — 0005 Subscriptions, Pricing Plans & Events
-- pricing_plans, plan_features, subscriptions (+ events),
-- events, event_interests.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PRICING PLANS & FEATURES
-- ---------------------------------------------------------------------
create table public.pricing_plans (
  id            uuid primary key default gen_random_uuid(),
  key           plan_key not null,
  name          text not null,
  description   text,
  price         numeric(14,2) not null check (price >= 0),
  currency      text not null references public.currencies(code) default 'UGX',
  billing_cycle billing_cycle not null default 'monthly',
  trial_days    integer not null default 30,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id),
  updated_by    uuid references public.profiles(id),
  version       integer not null default 1,
  unique (key, billing_cycle)
);

create table public.plan_features (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.pricing_plans(id) on delete cascade,
  feature_key text not null,      -- max_portfolio_images, portfolio_video, search_placement,
                                   -- client_analytics, homepage_featured, account_manager, verified_badge
  value       jsonb not null,
  unique (plan_id, feature_key)
);

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  vendor_id            uuid not null references public.vendors(id) on delete cascade,
  plan_id              uuid references public.pricing_plans(id),
  status               subscription_status not null default 'trialing',
  current_period_start timestamptz,
  current_period_end   timestamptz,
  trial_ends_at        timestamptz,
  grace_until          timestamptz,
  auto_renew           boolean not null default true,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references public.profiles(id),
  updated_by           uuid references public.profiles(id),
  deleted_at           timestamptz,
  deleted_by           uuid references public.profiles(id),
  version              integer not null default 1
);
-- one "live" subscription per vendor
create unique index ux_subscription_active on public.subscriptions(vendor_id)
  where status in ('trialing','active','past_due','grace') and deleted_at is null;
create index ix_subscription_status   on public.subscriptions(status);
create index ix_subscription_period   on public.subscriptions(current_period_end);
create index ix_subscription_grace    on public.subscriptions(grace_until);

create table public.subscription_events (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  event_type      subscription_event not null,
  payment_id      uuid,    -- FK added after payments table exists (0007)
  actor_id        uuid references public.profiles(id),
  metadata        jsonb,
  occurred_at     timestamptz not null default now()
);
create index ix_subscription_events_sub on public.subscription_events(subscription_id, occurred_at);

-- ---------------------------------------------------------------------
-- EVENTS (admin-posted + client-posted) & VENDOR INTEREST
-- ---------------------------------------------------------------------
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  posted_by       uuid not null references public.profiles(id) on delete cascade,
  source          event_source not null,
  title           text not null,
  description     text,
  event_type      text,
  event_date      date,
  location        text,
  budget_min      numeric(14,2),
  budget_max      numeric(14,2),
  currency        text references public.currencies(code) default 'UGX',
  status          event_status not null default 'draft',
  is_public       boolean not null default true,
  cover_image_url text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles(id),
  version         integer not null default 1,
  check (budget_min is null or budget_max is null or budget_max >= budget_min)
);
create index ix_events_status on public.events(status) where deleted_at is null;
create index ix_events_source on public.events(source);
create index ix_events_date   on public.events(event_date);
create index ix_events_poster on public.events(posted_by);

create table public.event_interests (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  message   text,
  status    interest_status not null default 'interested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version   integer not null default 1,
  unique (event_id, vendor_id)
);
create index ix_interest_vendor on public.event_interests(vendor_id);

-- now that subscriptions exist, allow subscription_events.payment_id FK later;
-- add deferred FK for plan/payment relationships in 0007.
