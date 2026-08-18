-- =====================================================================
-- Sinnapi — Escrow v2, step 2: schema.
--
-- Three changes:
--   (a) advance terms live on the quotation, so they bind the deal whether or
--       not it is settled through escrow;
--   (b) escrow_transactions carries the full on-top cost breakdown plus the
--       two tranches, all snapshotted;
--   (c) payouts/refunds carry manual-settlement evidence, and webhooks get a
--       real idempotency table.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (a) ADVANCE TERMS — proposed on the quotation, carried to the booking
-- ---------------------------------------------------------------------
alter table public.quotations
  add column if not exists advance_rate                 numeric(5,2),
  add column if not exists advance_release_days_before  integer,
  add column if not exists advance_terms_note           text;

-- Bounds are enforced here rather than only in the form: a quotation is
-- client-writable through RLS, and the advance is a promise about money.
alter table public.quotations
  drop constraint if exists ck_quotations_advance_rate;
alter table public.quotations
  add constraint ck_quotations_advance_rate
  check (advance_rate is null or (advance_rate >= 0 and advance_rate <= 100));

alter table public.quotations
  drop constraint if exists ck_quotations_advance_days;
alter table public.quotations
  add constraint ck_quotations_advance_days
  check (advance_release_days_before is null or
         (advance_release_days_before >= 0 and advance_release_days_before <= 365));

alter table public.bookings
  add column if not exists advance_rate                 numeric(5,2),
  add column if not exists advance_release_days_before  integer,
  add column if not exists advance_terms_note           text,
  -- The client's explicit consent to the advance schedule. activate_escrow
  -- refuses to run without it; accepting the quote alone is not enough.
  add column if not exists advance_terms_accepted_at    timestamptz,
  add column if not exists advance_terms_accepted_by    uuid references public.profiles(id);

alter table public.bookings
  drop constraint if exists ck_bookings_advance_rate;
alter table public.bookings
  add constraint ck_bookings_advance_rate
  check (advance_rate is null or (advance_rate >= 0 and advance_rate <= 100));

-- ---------------------------------------------------------------------
-- (b) ESCROW — full on-top breakdown, snapshotted at funding
--
--   gross_amount = agreed_amount + commission_amount + psp_fee_amount
--   agreed_amount = advance_amount + balance_amount
--
-- gross_amount already exists and keeps its meaning: what the client pays.
-- What changes is that it is now strictly larger than the agreed amount.
-- ---------------------------------------------------------------------
alter table public.escrow_transactions
  add column if not exists agreed_amount          numeric(14,2) not null default 0,
  add column if not exists psp_fee_rate           numeric(5,2)  not null default 0,
  add column if not exists psp_fee_amount         numeric(14,2) not null default 0,
  add column if not exists advance_rate           numeric(5,2)  not null default 0,
  add column if not exists advance_amount         numeric(14,2) not null default 0,
  add column if not exists balance_amount         numeric(14,2) not null default 0,
  -- When the advance becomes payable: event_date - advance_release_days_before.
  add column if not exists advance_release_due_at timestamptz,
  add column if not exists advance_released_at    timestamptz,
  add column if not exists balance_released_at    timestamptz,
  -- Set when the booking completes; the auto-release cron reads it.
  add column if not exists auto_release_due_at    timestamptz,
  add column if not exists last_reminder_day      integer,
  -- Frozen while a dispute is open so neither timer can fire mid-argument.
  add column if not exists timers_frozen_at       timestamptz,
  -- Funding attempts. A failed payment increments this and reuses the row
  -- rather than inserting a second escrow and tripping ux_escrow_booking.
  add column if not exists attempt_no             integer not null default 1,
  add column if not exists failure_reason         text;

comment on column public.escrow_transactions.gross_amount is
  'What the client pays in: agreed_amount + commission_amount + psp_fee_amount.';
comment on column public.escrow_transactions.net_payout_amount is
  'Total owed to the vendor across both tranches. Equals agreed_amount under the on-top model.';

create index if not exists ix_escrow_advance_due
  on public.escrow_transactions(advance_release_due_at)
  where advance_release_due_at is not null and advance_released_at is null;

create index if not exists ix_escrow_auto_release
  on public.escrow_transactions(auto_release_due_at)
  where auto_release_due_at is not null;

-- The identities that must always hold. Guarded on funded rows only, because
-- an 'initiated' escrow is still being priced and legitimately holds zeros.
alter table public.escrow_transactions
  drop constraint if exists ck_escrow_amount_identity;
alter table public.escrow_transactions
  add constraint ck_escrow_amount_identity check (
    agreed_amount = 0 or (
      gross_amount  = agreed_amount + commission_amount + psp_fee_amount
      and agreed_amount = advance_amount + balance_amount
    )
  );

-- ---------------------------------------------------------------------
-- (c) PAYOUTS — tranche identity + manual-settlement evidence
--
-- Sinnapi runs no payout API. Finance moves the money out of band (bank
-- deposit, mobile money, merchant transfer or cash) and records it here.
-- Two people are required: one records, a different one approves.
-- ---------------------------------------------------------------------
alter table public.payouts
  add column if not exists kind                  payout_kind not null default 'balance',
  add column if not exists settlement_method     settlement_method,
  -- Masked/last-4 destination for display. The full account number stays
  -- encrypted in vendor_bank_accounts and is never copied here.
  add column if not exists destination_label     text,
  add column if not exists settlement_reference  text,
  -- Object path in the private `payout-proofs` bucket. Mandatory to record.
  add column if not exists proof_path            text,
  add column if not exists proof_file_name       text,
  add column if not exists recorded_by           uuid references public.profiles(id),
  add column if not exists recorded_at           timestamptz,
  add column if not exists settled_at            timestamptz,
  add column if not exists notes                 text,
  add column if not exists failure_reason        text,
  -- Set when a vendor has no primary bank account at release time. The payout
  -- is still raised (so the money is visibly owed) but cannot be settled.
  add column if not exists blocked_reason        text,
  add column if not exists due_at                timestamptz;

-- Maker-checker across the whole chain: the person who recorded the settlement
-- cannot be the person who approves it, and neither may equal the requester.
alter table public.payouts
  drop constraint if exists ck_payouts_settlement_segregation;
alter table public.payouts
  add constraint ck_payouts_settlement_segregation check (
    approved_by is null or recorded_by is null or approved_by <> recorded_by
  );

-- One advance and one balance per escrow. Refunds and adjustments are
-- unconstrained because there can legitimately be several.
create unique index if not exists ux_payouts_escrow_tranche
  on public.payouts(escrow_id, kind)
  where kind in ('advance', 'balance');

create index if not exists ix_payouts_due
  on public.payouts(due_at) where status in ('requested', 'approved');

-- ---------------------------------------------------------------------
-- REFUNDS — reason drives composition; settlement is manual here too
-- ---------------------------------------------------------------------
alter table public.refunds
  add column if not exists reason_code           refund_reason,
  add column if not exists agreed_component      numeric(14,2) not null default 0,
  add column if not exists commission_component  numeric(14,2) not null default 0,
  add column if not exists psp_fee_component     numeric(14,2) not null default 0,
  add column if not exists settlement_method     settlement_method,
  add column if not exists settlement_reference  text,
  add column if not exists proof_path            text,
  add column if not exists recorded_by           uuid references public.profiles(id),
  add column if not exists recorded_at           timestamptz,
  add column if not exists settled_at            timestamptz,
  -- What was still held when the refund was raised. Anything the client is
  -- owed beyond this needs admin mediation and is surfaced, not swallowed.
  add column if not exists refundable_ceiling    numeric(14,2),
  add column if not exists shortfall_amount      numeric(14,2) not null default 0;

alter table public.refunds
  drop constraint if exists ck_refunds_component_identity;
alter table public.refunds
  add constraint ck_refunds_component_identity check (
    amount = agreed_component + commission_component + psp_fee_component
  );

-- ---------------------------------------------------------------------
-- PAYMENT EVENTS — the real webhook idempotency gate
--
-- payment_logs is an append-only audit of raw PSP traffic and deliberately has
-- no unique key. Deduping by scanning it (as the PayPal handler did) races.
-- This table is the gate: the insert either wins or raises, before any money
-- moves. A replayed delivery hits the constraint and short-circuits.
-- ---------------------------------------------------------------------
create table if not exists public.payment_events (
  id            uuid primary key default gen_random_uuid(),
  provider      payment_provider not null,
  -- Provider's own delivery/event id (PayPal event.id, Pesapal OrderTrackingId).
  event_id      text not null,
  event_type    text,
  payment_id    uuid references public.payments(id) on delete set null,
  processed_at  timestamptz,
  outcome       text,
  received_at   timestamptz not null default now(),
  unique (provider, event_id)
);
create index if not exists ix_payment_events_payment on public.payment_events(payment_id);

-- ---------------------------------------------------------------------
-- RECONCILIATION EXCEPTIONS — nothing auto-corrects money; it queues here
-- ---------------------------------------------------------------------
create table if not exists public.reconciliation_exceptions (
  id            uuid primary key default gen_random_uuid(),
  kind          reconciliation_kind not null,
  status        reconciliation_status not null default 'open',
  severity      text not null default 'warning',
  escrow_id     uuid references public.escrow_transactions(id) on delete set null,
  payment_id    uuid references public.payments(id) on delete set null,
  payout_id     uuid references public.payouts(id) on delete set null,
  refund_id     uuid references public.refunds(id) on delete set null,
  -- Stable key so a recurring nightly finding updates one row instead of
  -- inserting a duplicate on every run.
  dedupe_key    text not null,
  detail        text,
  metadata      jsonb,
  expected      numeric(14,2),
  actual        numeric(14,2),
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  occurrences   integer not null default 1,
  resolved_by   uuid references public.profiles(id),
  resolved_at   timestamptz,
  resolution_notes text
);
create unique index if not exists ux_recon_open_dedupe
  on public.reconciliation_exceptions(dedupe_key)
  where status in ('open', 'investigating');
create index if not exists ix_recon_status on public.reconciliation_exceptions(status, kind);

-- ---------------------------------------------------------------------
-- Private bucket for settlement proof (receipts, deposit slips, signed cash
-- acknowledgements). Finance-only; never public.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('payout-proofs', 'payout-proofs', false, 20971520,
   array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;
