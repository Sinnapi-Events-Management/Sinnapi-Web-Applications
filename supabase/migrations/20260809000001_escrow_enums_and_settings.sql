-- =====================================================================
-- Sinnapi — Escrow v2, step 1: enum values, new enums, platform settings.
--
-- Enum VALUES added to an existing type cannot be referenced in the same
-- transaction that adds them, and Supabase runs each migration file in one
-- transaction. So this file only *declares* — everything that uses these
-- values lives in 000002 onwards. Brand-new types have no such restriction.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Existing enums: values the two-tranche model needs
-- ---------------------------------------------------------------------

-- 'awaiting_advance'  funded, advance not yet due
-- 'advance_released'  advance tranche raised as a payout; balance still held
alter type escrow_status add value if not exists 'awaiting_advance' after 'held';
alter type escrow_status add value if not exists 'advance_released' after 'awaiting_advance';

-- These two mirror the escrow_status values above by name. The status-change
-- trigger in 0010 casts status::text::escrow_event_type, so a status without a
-- same-named event type would hard-fail every transition into it.
alter type escrow_event_type add value if not exists 'awaiting_advance';
alter type escrow_event_type add value if not exists 'advance_released';

alter type escrow_event_type add value if not exists 'advance_scheduled';
alter type escrow_event_type add value if not exists 'advance_settled';
alter type escrow_event_type add value if not exists 'balance_settled';
alter type escrow_event_type add value if not exists 'auto_release_triggered';
alter type escrow_event_type add value if not exists 'release_reminder_sent';
alter type escrow_event_type add value if not exists 'payment_failed';
alter type escrow_event_type add value if not exists 'payment_reversed';

-- Manual settlement is a two-person job: 'settlement_recorded' is the maker's
-- state, waiting on a different Finance admin to approve into 'completed'.
alter type payout_status add value if not exists 'settlement_recorded' after 'approved';

-- Refunds settle manually too, so they need the same maker state.
alter type refund_status add value if not exists 'settlement_recorded' after 'approved';

-- The ledger needs somewhere to book the processing fee the client paid
-- through to the PSP, kept apart from Sinnapi's own commission revenue.
alter type ledger_account add value if not exists 'psp_fee_expense';
-- Money owed back to Sinnapi by a vendor (over-settlement, upheld dispute
-- after an advance was paid). Netted off that vendor's next payout.
alter type ledger_account add value if not exists 'vendor_receivable';

-- ---------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------

-- Which tranche a payout row represents.
do $$ begin
  create type payout_kind as enum ('advance', 'balance', 'refund', 'adjustment');
exception when duplicate_object then null; end $$;

-- How Finance actually moved the money. Sinnapi holds no payout API — the
-- transfer happens off-platform and is recorded here with evidence.
do $$ begin
  create type settlement_method as enum
    ('bank_deposit', 'mtn_momo', 'airtel_money', 'merchant', 'cash', 'other');
exception when duplicate_object then null; end $$;

-- Drives the refund composition looked up from platform_settings.refund_policy.
do $$ begin
  create type refund_reason as enum
    ('vendor_no_show', 'vendor_cancelled', 'service_not_as_described',
     'duplicate_payment', 'client_cancelled', 'admin_discretion');
exception when duplicate_object then null; end $$;

-- Reconciliation exception queue classifications.
do $$ begin
  create type reconciliation_kind as enum
    ('stuck_payment', 'unbalanced_escrow', 'psp_amount_mismatch', 'psp_fee_variance',
     'orphan_payment', 'missing_payout', 'overdue_settlement', 'webhook_replay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reconciliation_status as enum ('open', 'investigating', 'resolved', 'ignored');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Platform settings
--
-- Every rate here is a *default*. What an individual escrow charges is
-- snapshotted onto its row at funding time and never re-read from settings,
-- so editing these can't re-price money that is already held.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('psp_fee_rates',
   '{"pesapal":{"mtn_momo":3.0,"airtel_money":3.0,"card":3.5},"paypal":{"card":4.4}}'::jsonb,
   'json',
   'Processing fee percentage charged on to the client, by provider and method. Estimated at checkout; variance against the PSP''s actual fee is reconciled to psp_fee_expense.'),

  ('advance_rate_default', '30'::jsonb, 'number',
   'Advance percentage pre-filled on a new quotation.'),
  ('advance_rate_max', '50'::jsonb, 'number',
   'Ceiling a vendor may propose as an advance. Enforced in the DB, not just the UI.'),

  ('advance_release_days_default', '7'::jsonb, 'number',
   'Default days before the event that the advance becomes due. Vendors set this per quotation.'),
  ('advance_release_days_max', '30'::jsonb, 'number',
   'Furthest ahead of an event a vendor may request their advance.'),

  ('escrow_auto_release_days', '7'::jsonb, 'number',
   'Days after a booking completes before an unconfirmed escrow auto-requests release. A Finance admin still approves — this only breaks the stalemate, it never moves money on its own.'),
  ('escrow_release_reminder_days', '[1,3,6]'::jsonb, 'json',
   'Days after completion to remind the client to confirm.'),

  ('escrow_settlement_sla_hours', '48'::jsonb, 'number',
   'How long a requested payout may sit unsettled before it is raised as a reconciliation exception.'),

  ('refund_policy',
   '{
      "vendor_no_show":           {"agreed":100,"commission":100,"psp_fee":100},
      "vendor_cancelled":         {"agreed":100,"commission":100,"psp_fee":100},
      "service_not_as_described": {"agreed":100,"commission":100,"psp_fee":0},
      "duplicate_payment":        {"agreed":100,"commission":100,"psp_fee":100},
      "client_cancelled":         {"agreed":100,"commission":0,  "psp_fee":0},
      "admin_discretion":         {"agreed":100,"commission":0,  "psp_fee":0}
    }'::jsonb,
   'json',
   'Refundable percentage of each cost component, by reason. The approving admin may override the computed amount; this is the default they start from.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Permissions for the manual-settlement flow
-- ---------------------------------------------------------------------
insert into public.permissions (key, category, description) values
  ('payout.settle',        'finance', 'Record a manual payout settlement (maker)'),
  ('payout.settle.approve','finance', 'Approve a recorded settlement (checker)'),
  ('finance.reconcile',    'finance', 'Work the reconciliation exception queue')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.key in ('payout.settle', 'payout.settle.approve', 'finance.reconcile')
where r.key = 'finance'
on conflict do nothing;

-- Super Admin's grant was a one-time cross join at seed time, so permissions
-- added after it need backfilling or the role silently loses coverage.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;
