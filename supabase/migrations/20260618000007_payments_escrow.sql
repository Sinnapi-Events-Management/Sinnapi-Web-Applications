-- =====================================================================
-- Sinnapi — 0007 Payments, Escrow, Ledger, Payouts, Refunds, Disputes
-- The financial core. Append-only ledger & logs; snapshotted commission/FX.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PAYMENTS  (PSP charge / escrow funding / subscription)
-- ---------------------------------------------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  payer_id        uuid not null references public.profiles(id),
  purpose         payment_purpose not null,
  booking_id      uuid references public.bookings(id),
  subscription_id uuid references public.subscriptions(id),
  escrow_id       uuid,  -- FK added after escrow_transactions exists (below)
  provider        payment_provider not null,
  provider_method payment_method not null,
  provider_ref    text,
  idempotency_key text not null,
  amount          numeric(14,2) not null check (amount >= 0),
  currency        text not null references public.currencies(code) default 'UGX',
  fx_rate_id      uuid references public.exchange_rates(id),
  base_amount     numeric(14,2),
  base_currency   text references public.currencies(code),
  status          payment_status not null default 'pending',
  failure_reason  text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  version         integer not null default 1
);
create unique index ux_payments_idem on public.payments(idempotency_key);
create unique index ux_payments_provider_ref on public.payments(provider, provider_ref)
  where provider_ref is not null;
create index ix_payments_payer   on public.payments(payer_id);
create index ix_payments_status  on public.payments(status);
create index ix_payments_booking on public.payments(booking_id);

-- append-only raw PSP I/O log
create table public.payment_logs (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid references public.payments(id) on delete set null,
  provider        payment_provider not null,
  direction       payment_log_direction not null,
  event_type      text,
  http_status     integer,
  payload         jsonb,
  signature_valid boolean,
  received_at     timestamptz not null default now()
);
create index ix_payment_logs_payment  on public.payment_logs(payment_id);
create index ix_payment_logs_provider on public.payment_logs(provider, received_at);

-- ---------------------------------------------------------------------
-- ESCROW TRANSACTIONS (+ append-only events)
-- ---------------------------------------------------------------------
create table public.escrow_transactions (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.bookings(id) on delete cascade,
  client_id          uuid not null references public.profiles(id),
  vendor_id          uuid not null references public.vendors(id),
  funding_payment_id uuid references public.payments(id),
  currency           text not null references public.currencies(code) default 'UGX',
  gross_amount       numeric(14,2) not null check (gross_amount >= 0),
  commission_rate    numeric(5,2) not null default 0,   -- snapshot at funding
  commission_amount  numeric(14,2) not null default 0,
  net_payout_amount  numeric(14,2) not null default 0,
  fx_rate_id         uuid references public.exchange_rates(id),
  status             escrow_status not null default 'initiated',
  client_confirmed_at timestamptz,
  admin_approved_by  uuid references public.profiles(id),
  admin_approved_at  timestamptz,
  released_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references public.profiles(id),
  updated_by         uuid references public.profiles(id),
  version            integer not null default 1
);
create unique index ux_escrow_booking on public.escrow_transactions(booking_id);
create index ix_escrow_status on public.escrow_transactions(status);
create index ix_escrow_vendor on public.escrow_transactions(vendor_id);
create index ix_escrow_client on public.escrow_transactions(client_id);

-- payments.escrow_id FK (deferred until escrow table exists)
alter table public.payments
  add constraint fk_payments_escrow
  foreign key (escrow_id) references public.escrow_transactions(id);

create table public.escrow_events (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid not null references public.escrow_transactions(id) on delete cascade,
  event_type  escrow_event_type not null,
  actor_id    uuid references public.profiles(id),
  amount      numeric(14,2),
  metadata    jsonb,
  occurred_at timestamptz not null default now()
);
create index ix_escrow_events_e on public.escrow_events(escrow_id, occurred_at);

-- ---------------------------------------------------------------------
-- PAYOUTS / REFUNDS / DISPUTES
-- ---------------------------------------------------------------------
create table public.payouts (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid not null references public.vendors(id),
  escrow_id       uuid not null references public.escrow_transactions(id),
  bank_account_id uuid references public.vendor_bank_accounts(id),
  amount          numeric(14,2) not null check (amount >= 0),
  currency        text not null references public.currencies(code) default 'UGX',
  provider        payment_provider,
  provider_ref    text,
  status          payout_status not null default 'requested',
  requested_by    uuid references public.profiles(id),
  approved_by     uuid references public.profiles(id),
  approved_at     timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  version         integer not null default 1,
  -- maker-checker: approver must differ from requester
  check (approved_by is null or requested_by is null or approved_by <> requested_by)
);
create unique index ux_payouts_provider_ref on public.payouts(provider, provider_ref)
  where provider_ref is not null;
create index ix_payouts_vendor on public.payouts(vendor_id);
create index ix_payouts_escrow on public.payouts(escrow_id);
create index ix_payouts_status on public.payouts(status);

create table public.disputes (
  id               uuid primary key default gen_random_uuid(),
  escrow_id        uuid not null references public.escrow_transactions(id) on delete cascade,
  booking_id       uuid not null references public.bookings(id),
  raised_by        uuid not null references public.profiles(id),
  against_id       uuid references public.profiles(id),
  reason           text not null,
  status           dispute_status not null default 'open',
  sla_due_at       timestamptz,
  resolution_notes text,
  resolved_by      uuid references public.profiles(id),
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  version          integer not null default 1
);
create index ix_disputes_escrow on public.disputes(escrow_id);
create index ix_disputes_status on public.disputes(status);
create index ix_disputes_sla    on public.disputes(sla_due_at);

create table public.dispute_evidence (
  id           uuid primary key default gen_random_uuid(),
  dispute_id   uuid not null references public.disputes(id) on delete cascade,
  submitted_by uuid references public.profiles(id),
  note         text,
  storage_path text,
  file_name    text,
  created_at   timestamptz not null default now()
);
create index ix_dispute_evidence_d on public.dispute_evidence(dispute_id);

create table public.refunds (
  id          uuid primary key default gen_random_uuid(),
  escrow_id   uuid not null references public.escrow_transactions(id) on delete cascade,
  dispute_id  uuid references public.disputes(id),
  client_id   uuid not null references public.profiles(id),
  amount      numeric(14,2) not null check (amount >= 0),
  currency    text not null references public.currencies(code) default 'UGX',
  type        refund_type not null,
  reason      text,
  status      refund_status not null default 'requested',
  requested_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  version     integer not null default 1,
  check (approved_by is null or requested_by is null or approved_by <> requested_by)
);
create index ix_refunds_escrow on public.refunds(escrow_id);
create index ix_refunds_status on public.refunds(status);

-- ---------------------------------------------------------------------
-- LEDGER (append-only, double-entry)
-- ---------------------------------------------------------------------
create table public.ledger_entries (
  id             uuid primary key default gen_random_uuid(),
  entry_group_id uuid not null,         -- balanced legs share this id
  escrow_id      uuid references public.escrow_transactions(id),
  payment_id     uuid references public.payments(id),
  payout_id      uuid references public.payouts(id),
  refund_id      uuid references public.refunds(id),
  account        ledger_account not null,
  direction      ledger_direction not null,
  amount         numeric(14,2) not null check (amount > 0),
  currency       text not null references public.currencies(code) default 'UGX',
  base_amount    numeric(14,2),
  description    text,
  occurred_at    timestamptz not null default now()
);
create index ix_ledger_group   on public.ledger_entries(entry_group_id);
create index ix_ledger_escrow  on public.ledger_entries(escrow_id);
create index ix_ledger_account on public.ledger_entries(account);

-- now wire subscription_events.payment_id -> payments
alter table public.subscription_events
  add constraint fk_sub_events_payment
  foreign key (payment_id) references public.payments(id);

-- ---------------------------------------------------------------------
-- DISCOUNT REDEMPTIONS (defined here; depends on bookings/quotations)
-- discounts/promotions live in 0008; redemptions reference them via FK added there.
-- ---------------------------------------------------------------------
