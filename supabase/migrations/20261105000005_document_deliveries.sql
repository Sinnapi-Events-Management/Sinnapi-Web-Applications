-- =====================================================================
-- Sinnapi — 1105e Document email history, the daily cap, retention
--
-- One row per attempt to email an invoice or receipt, written by the
-- `send-financial-document` Edge Function through the service-role RPCs in
-- 1105f. The vendor can read their own history; nobody writes it directly.
--
-- A REGISTERED CLIENT'S ADDRESS IS NEVER STORED HERE. The Edge Function
-- resolves it from `profiles` at send time and records only a masked form
-- (`j***@gmail.com`) in `recipient_display`, because this table is
-- readable by the vendor and vendors are not shown client emails
-- (20261031000001).
--
-- `attachment_sha256` fingerprints the exact PDF that was attached, so
-- "what did the client actually receive" has an answer even if the stored
-- file is later replaced (a voided document is re-rendered with its stamp).
-- =====================================================================

create table if not exists public.vendor_document_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references public.vendors(id),
  invoice_id          uuid references public.vendor_invoices(id),
  receipt_id          uuid references public.vendor_receipts(id),
  recipient_kind      public.document_recipient_kind not null,
  recipient_display   text not null,
  cc_self             boolean not null default false,
  subject             text not null,
  message             text,
  status              public.document_delivery_status not null default 'sending',
  error               text,
  provider_message_id text,
  attachment_path     text not null,
  attachment_sha256   text,
  request_key         uuid not null,
  requested_by        uuid references public.profiles(id),
  created_at          timestamptz not null default now(),
  sent_at             timestamptz,
  finished_at         timestamptz,

  constraint ck_delivery_one_document check (num_nonnulls(invoice_id, receipt_id) = 1),
  constraint ck_delivery_sha check (attachment_sha256 is null or attachment_sha256 ~ '^[0-9a-f]{64}$'),
  constraint ck_delivery_finished check (
    (status = 'sending') = (finished_at is null)
    and (status <> 'sent' or sent_at is not null)),
  constraint ck_delivery_text_lengths check (
    char_length(recipient_display) <= 300
    and char_length(subject) <= 300
    and (message is null or char_length(message) <= 2000)
    and (error is null or char_length(error) <= 1000))
);

comment on table public.vendor_document_deliveries is
  'Email attempts for vendor invoices/receipts. Written only by send-financial-document via service-role RPCs; registered-client addresses stored masked.';

-- A double-click sends once: the second request finds the first row.
create unique index if not exists ux_document_deliveries_request
  on public.vendor_document_deliveries (vendor_id, request_key);

-- The daily-cap count and the history list both read this.
create index if not exists ix_document_deliveries_vendor_created
  on public.vendor_document_deliveries (vendor_id, created_at desc);
create index if not exists ix_document_deliveries_invoice
  on public.vendor_document_deliveries (invoice_id, created_at desc) where invoice_id is not null;
create index if not exists ix_document_deliveries_receipt
  on public.vendor_document_deliveries (receipt_id, created_at desc) where receipt_id is not null;

drop trigger if exists trg_audit_log on public.vendor_document_deliveries;
create trigger trg_audit_log after insert or update or delete on public.vendor_document_deliveries
  for each row execute function public.tg_write_audit();

-- ---------------------------------------------------------------------
-- SETTINGS
-- Every document email goes out through Sinnapi's own mail account, so a
-- per-vendor daily ceiling protects its sending reputation for everyone.
-- Admin-editable like every other platform setting (confirmed: 50/day).
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('document_email_daily_limit', '50'::jsonb, 'int',
   'Most invoice/receipt emails one vendor can send in any rolling 24 hours. Counts every attempt, sent or failed.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- RETENTION
-- Issued invoices and receipts are financial records: kept for ten years
-- under a legal hold (confirmed 2026-11-05 — longer than the seven-year
-- hold on banking and verification records). Saved contacts are the
-- vendor's to delete at any time.
-- ---------------------------------------------------------------------
insert into public.data_retention_policies (data_category, retention_period, action_on_expiry, legal_hold, description) values
  ('financial_documents', interval '10 years', 'retain', true,
   'Vendor invoices, receipts and their email history. Financial records: the recipient details frozen on an issued document survive deletion of the saved contact.'),
  ('vendor_contacts', null, 'delete', false,
   'A vendor''s saved external clients. Deleted (soft) whenever the vendor removes them; nothing is kept beyond what issued documents already froze.')
on conflict (data_category) do nothing;
