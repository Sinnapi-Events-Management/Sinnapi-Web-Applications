-- =====================================================================
-- Sinnapi — 0009 System: Audit, Login History, Outbox, Retention, Erasure
-- =====================================================================

-- append-only audit trail
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id),
  action      text not null,
  entity_type text,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  ip_address  inet,
  user_agent  text,
  occurred_at timestamptz not null default now()
);
create index ix_audit_entity on public.audit_logs(entity_type, entity_id);
create index ix_audit_actor  on public.audit_logs(actor_id);
create index ix_audit_action on public.audit_logs(action, occurred_at);

-- login + device history (feeds new-device notifications)
create table public.login_history (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  ip_address         inet,
  user_agent         text,
  device_fingerprint text,
  is_new_device      boolean not null default false,
  success            boolean not null default true,
  occurred_at        timestamptz not null default now()
);
create index ix_login_history_profile on public.login_history(profile_id, occurred_at);

-- transactional outbox: async fan-out to notifications / email / webhooks / indexing
create table public.outbox (
  id             uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id   uuid,
  event_type     text not null,
  payload        jsonb,
  status         outbox_status not null default 'pending',
  attempts       integer not null default 0,
  available_at   timestamptz not null default now(),
  processed_at   timestamptz,
  error          text,
  created_at     timestamptz not null default now()
);
create index ix_outbox_ready  on public.outbox(status, available_at);
create index ix_outbox_aggr   on public.outbox(aggregate_type, aggregate_id);

-- configurable data-retention policies per data category (GDPR/DPPA)
create table public.data_retention_policies (
  id               uuid primary key default gen_random_uuid(),
  data_category    text not null unique,   -- identity_docs, banking, verification_docs, messages,
                                            -- bookings, quotations, escrow, subscriptions, audit_logs,
                                            -- login_history, media, notifications
  retention_period interval,
  action_on_expiry retention_action not null default 'retain',
  legal_hold       boolean not null default false,
  description      text,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references public.profiles(id),
  version          integer not null default 1
);

-- GDPR right-to-erasure requests (subject to legal/financial holds)
create table public.erasure_requests (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid references public.profiles(id),
  status       erasure_status not null default 'requested',
  scope        jsonb,
  notes        text,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  version      integer not null default 1
);
create index ix_erasure_profile on public.erasure_requests(profile_id);
create index ix_erasure_status  on public.erasure_requests(status);
