-- =====================================================================
-- Sinnapi — 1105d Vendor receipts
--
-- A receipt is the vendor's acknowledgement of money they actually
-- received OUTSIDE Sinnapi. Sinnapi cannot see that money, so the vendor's
-- explicit confirmation (`vendor_confirmed_at`) IS the payment record; a
-- receipt cannot exist without it.
--
-- Linked to a `vendor_collected` invoice, or standalone. Never linked to a
-- `sinnapi_escrow` invoice: money paid through escrow went to Sinnapi's
-- payment provider, not the vendor, and Sinnapi's own payment confirmation
-- covers it (confirmed 2026-11-05). `record_receipt` (1105f) enforces that,
-- along with the currency match and the no-overpayment rule, while holding
-- the invoice row locked.
--
-- BALANCE
-- `balance_after` is what was still owed once this payment landed —
-- computed from the invoice when linked, typed by the vendor (optional)
-- on a standalone receipt.
--
-- Receipts have no drafts: they are numbered (`SNP-RCT-` + 8 random digits)
-- the moment they are created, and only the void fields may change after.
-- =====================================================================

create table if not exists public.vendor_receipts (
  id                  uuid primary key default gen_random_uuid(),
  vendor_id           uuid not null references public.vendors(id),
  document_no         text not null,
  status              public.receipt_status not null default 'issued',
  invoice_id          uuid references public.vendor_invoices(id),

  -- ---------- recipient (same rules as invoices) ----------
  client_id           uuid references public.profiles(id) on delete set null,
  contact_id          uuid references public.vendor_contacts(id) on delete set null,
  recipient_name      text not null,
  recipient_company   text,
  recipient_email     citext,
  recipient_phone     text,
  recipient_address   text,

  vendor_snapshot     jsonb not null,
  show_vendor_tax_id  boolean not null default false,

  -- ---------- the payment ----------
  currency            text not null references public.currencies(code),
  amount              numeric(14,2) not null,
  payment_date        date not null,
  payment_method      public.receipt_payment_method not null,
  payment_reference   text,
  description         text not null,
  notes               text,
  balance_before      numeric(14,2),
  balance_after       numeric(14,2),
  vendor_confirmed_at timestamptz not null,
  idempotency_key     uuid not null,

  -- ---------- lifecycle ----------
  issued_at           timestamptz not null default now(),
  issued_by           uuid references public.profiles(id),
  voided_at           timestamptz,
  voided_by           uuid references public.profiles(id),
  void_reason         text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id),
  updated_by          uuid references public.profiles(id),
  version             integer not null default 1,

  constraint ck_receipt_no_shape check (document_no ~ '^SNP-RCT-[0-9]{8}$'),
  constraint ck_receipt_one_recipient check (client_id is null or contact_id is null),
  constraint ck_receipt_no_client_email check (client_id is null or recipient_email is null),
  constraint ck_receipt_amount check (amount > 0),
  constraint ck_receipt_balances check (
    (balance_before is null or balance_before >= 0)
    and (balance_after is null or balance_after >= 0)),
  constraint ck_receipt_linked_balances check (
    invoice_id is null or (balance_before is not null and balance_after is not null
                           and balance_after = balance_before - amount)),
  constraint ck_receipt_void_shape check (
    (status = 'void') = (voided_at is not null)
    and (status <> 'void' or coalesce(btrim(void_reason), '') <> '')),
  constraint ck_receipt_text_lengths check (
    char_length(btrim(recipient_name)) between 1 and 200
    and (recipient_company is null or char_length(recipient_company) <= 200)
    and (recipient_email is null or (char_length(recipient_email) <= 254
         and recipient_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    and (recipient_phone is null or char_length(recipient_phone) <= 40)
    and (recipient_address is null or char_length(recipient_address) <= 500)
    and (payment_reference is null or char_length(payment_reference) <= 120)
    and char_length(btrim(description)) between 1 and 500
    and (notes is null or char_length(notes) <= 2000)
    and (void_reason is null or char_length(void_reason) <= 500))
);

comment on table public.vendor_receipts is
  'A vendor''s acknowledgement of a payment received outside Sinnapi. Never for escrow-paid bookings. Writes via 1105f RPCs only.';

create unique index if not exists ux_vendor_receipts_document_no
  on public.vendor_receipts (document_no);

-- A double-submitted "Record payment" returns the first receipt instead of
-- creating a second one.
create unique index if not exists ux_vendor_receipts_idempotency
  on public.vendor_receipts (vendor_id, idempotency_key);

create index if not exists ix_vendor_receipts_vendor_list
  on public.vendor_receipts (vendor_id, payment_date desc);
create index if not exists ix_vendor_receipts_invoice
  on public.vendor_receipts (invoice_id) where invoice_id is not null;
create index if not exists ix_vendor_receipts_client
  on public.vendor_receipts (client_id, payment_date desc) where client_id is not null;
create index if not exists ix_vendor_receipts_contact
  on public.vendor_receipts (contact_id) where contact_id is not null;

-- ---------------------------------------------------------------------
-- Generic triggers. No soft delete: receipts have no `deleted_at` — a
-- receipt is voided, never removed, and a DELETE is refused below.
-- ---------------------------------------------------------------------
drop trigger if exists trg_updated_at on public.vendor_receipts;
create trigger trg_updated_at before update on public.vendor_receipts
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_bump_version on public.vendor_receipts;
create trigger trg_bump_version before update on public.vendor_receipts
  for each row execute function public.tg_bump_version();

drop trigger if exists trg_audit_actor on public.vendor_receipts;
create trigger trg_audit_actor before insert or update on public.vendor_receipts
  for each row execute function public.tg_set_audit_actor();

drop trigger if exists trg_audit_log on public.vendor_receipts;
create trigger trg_audit_log after insert or update or delete on public.vendor_receipts
  for each row execute function public.tg_write_audit();

create or replace function public.tg_vendor_receipt_lock()
returns trigger language plpgsql set search_path = public as $$
declare
  c_mutable constant text[] := array[
    'status', 'voided_at', 'voided_by', 'void_reason',
    'updated_at', 'updated_by', 'version'];
begin
  if tg_op = 'DELETE' then
    raise exception 'receipt_cannot_delete: void the receipt instead' using errcode = 'P0001';
  end if;

  if old.status = 'void' and new.status <> 'void' then
    raise exception 'receipt_void_final' using errcode = 'P0001';
  end if;

  if (to_jsonb(new) - c_mutable) is distinct from (to_jsonb(old) - c_mutable) then
    raise exception 'receipt_locked: a receipt cannot be edited — void it and record the payment again'
      using errcode = 'P0001';
  end if;

  return new;
end;$$;

drop trigger if exists trg_vendor_receipt_lock on public.vendor_receipts;
create trigger trg_vendor_receipt_lock before update or delete on public.vendor_receipts
  for each row execute function public.tg_vendor_receipt_lock();
