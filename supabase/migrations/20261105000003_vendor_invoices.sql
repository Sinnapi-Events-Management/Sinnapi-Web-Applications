-- =====================================================================
-- Sinnapi — 1105c Vendor invoices and their lines
--
-- WHO AN INVOICE IS FOR
-- Exactly one of:
--   client_id   a registered client the vendor already has a quote or
--               booking with (the `get_vendor_clients` rule)
--   contact_id  a saved external client (vendor_contacts)
--   neither     a draft whose external recipient is typed in but not yet
--               saved; `issue_invoice` saves or matches the contact
-- The recipient's name, phone and address are COPIED onto the row at issue
-- so later profile edits never rewrite a past document. A registered
-- client's email is never copied: vendors cannot see it (20261031000001),
-- and anything on this row is readable by the vendor.
--
-- HOW IT GETS PAID
--   vendor_collected  paid to the vendor outside Sinnapi; settled by
--                     vendor receipts (1105d)
--   sinnapi_escrow    belongs to a booking and is paid through Sinnapi
--                     escrow; settled by the escrow payment (1105h), never
--                     by a receipt (confirmed 2026-11-05)
--
-- ONCE ISSUED, IT IS FIXED
-- Only the payment and void columns may change after `draft`; a trigger
-- refuses everything else, and the line items are frozen with it. A
-- correction is a void plus a new invoice. Every write still goes through
-- the SECURITY DEFINER functions in 1105f — RLS (1105g) grants no direct
-- writes — so the trigger is the backstop, not the gate.
--
-- MONEY
-- numeric(14,2) like every other money column. Amounts are rounded to the
-- currency's own minor unit (UGX 0, USD 2) by `_money_round` in 1105f;
-- `balance_due` is derived by the database so it can never disagree with
-- `total` and `amount_paid`.
--
-- NUMBERS
-- `SNP-INV-` + 8 random digits, assigned at issue (drafts have none),
-- unique across the whole platform. Random on purpose: the user asked for
-- numbers that cannot be guessed or used to count a vendor's sales.
-- =====================================================================

create table if not exists public.vendor_invoices (
  id                   uuid primary key default gen_random_uuid(),
  vendor_id            uuid not null references public.vendors(id),
  document_no          text,
  status               public.invoice_status not null default 'draft',
  payment_channel      public.invoice_payment_channel not null default 'vendor_collected',

  -- ---------- recipient ----------
  client_id            uuid references public.profiles(id) on delete set null,
  contact_id           uuid references public.vendor_contacts(id) on delete set null,
  recipient_name       text,
  recipient_company    text,
  recipient_email      citext,
  recipient_phone      text,
  recipient_address    text,

  -- ---------- link to a Sinnapi booking ----------
  booking_id           uuid references public.bookings(id),
  quotation_id         uuid references public.quotations(id),

  -- ---------- what the document says ----------
  title                text,
  vendor_snapshot      jsonb,
  show_vendor_tax_id   boolean not null default false,
  issue_date           date not null default ((now() at time zone 'Africa/Kampala')::date),
  due_date             date not null default ((now() at time zone 'Africa/Kampala')::date + 7),
  payment_instructions text,
  notes                text,
  terms                text,

  -- ---------- money ----------
  currency             text not null references public.currencies(code) default 'UGX',
  subtotal             numeric(14,2) not null default 0,
  discount_type        public.discount_type,
  discount_value       numeric(14,2),
  discount_total       numeric(14,2) not null default 0,
  charges_total        numeric(14,2) not null default 0,
  tax_label            text,
  tax_rate             numeric(5,2),
  tax_inclusive        boolean not null default false,
  tax_total            numeric(14,2) not null default 0,
  total                numeric(14,2) not null default 0,
  amount_paid          numeric(14,2) not null default 0,
  balance_due          numeric(14,2) generated always as (total - amount_paid) stored,

  -- ---------- lifecycle ----------
  issued_at            timestamptz,
  issued_by            uuid references public.profiles(id),
  paid_at              timestamptz,
  voided_at            timestamptz,
  voided_by            uuid references public.profiles(id),
  void_reason          text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references public.profiles(id),
  updated_by           uuid references public.profiles(id),
  deleted_at           timestamptz,
  deleted_by           uuid references public.profiles(id),
  version              integer not null default 1,

  constraint ck_invoice_no_shape check (document_no is null or document_no ~ '^SNP-INV-[0-9]{8}$'),
  constraint ck_invoice_no_when_issued check ((status = 'draft') = (document_no is null)),
  constraint ck_invoice_one_recipient check (client_id is null or contact_id is null),
  -- A registered client's email must never land where the vendor can read it.
  constraint ck_invoice_no_client_email check (client_id is null or recipient_email is null),
  constraint ck_invoice_issued_has_recipient check (status = 'draft'
    or (recipient_name is not null and char_length(btrim(recipient_name)) > 0)),
  constraint ck_invoice_issued_has_snapshot check (status = 'draft'
    or (vendor_snapshot is not null and issued_at is not null)),
  constraint ck_invoice_escrow_needs_booking check (payment_channel = 'vendor_collected'
    or (booking_id is not null and client_id is not null)),
  constraint ck_invoice_dates check (due_date >= issue_date),
  constraint ck_invoice_money_nonneg check (subtotal >= 0 and discount_total >= 0 and charges_total >= 0
    and tax_total >= 0 and total >= 0 and amount_paid >= 0),
  constraint ck_invoice_paid_le_total check (amount_paid <= total),
  constraint ck_invoice_discount_le_subtotal check (discount_total <= subtotal),
  constraint ck_invoice_discount_shape check (
    (discount_type is null and discount_value is null)
    or (discount_type = 'percentage' and discount_value >= 0 and discount_value <= 100)
    or (discount_type = 'fixed' and discount_value >= 0)),
  constraint ck_invoice_tax_shape check (
    (tax_rate is null and tax_total = 0)
    or (tax_rate >= 0 and tax_rate <= 100)),
  constraint ck_invoice_issued_total check (status = 'draft' or total > 0),
  constraint ck_invoice_paid_status check (
    status not in ('paid') or amount_paid = total),
  constraint ck_invoice_void_shape check (
    (status = 'void') = (voided_at is not null)
    and (status <> 'void' or coalesce(btrim(void_reason), '') <> '')),
  constraint ck_invoice_text_lengths check (
    (recipient_name is null or char_length(recipient_name) <= 200)
    and (recipient_company is null or char_length(recipient_company) <= 200)
    and (recipient_email is null or (char_length(recipient_email) <= 254
         and recipient_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    and (recipient_phone is null or char_length(recipient_phone) <= 40)
    and (recipient_address is null or char_length(recipient_address) <= 500)
    and (title is null or char_length(title) <= 200)
    and (tax_label is null or char_length(tax_label) <= 40)
    and (payment_instructions is null or char_length(payment_instructions) <= 1000)
    and (notes is null or char_length(notes) <= 2000)
    and (terms is null or char_length(terms) <= 2000)
    and (void_reason is null or char_length(void_reason) <= 500))
);

comment on table public.vendor_invoices is
  'Invoices a vendor issues to a registered client or an external contact. Writes go through the 1105f RPCs only; fixed once issued.';
comment on column public.vendor_invoices.vendor_snapshot is
  'The vendor''s business details as printed, frozen at issue: business_name, logo_url, location, city, phone, website, registration_no, tax_id (only when show_vendor_tax_id), email (external recipients only).';
comment on column public.vendor_invoices.title is
  'The optional "For" line, e.g. "Wedding reception décor — 22 Nov 2026".';

create unique index if not exists ux_vendor_invoices_document_no
  on public.vendor_invoices (document_no) where document_no is not null;

-- One live invoice per booking. A void frees the booking for a replacement.
create unique index if not exists ux_vendor_invoices_active_booking
  on public.vendor_invoices (booking_id)
  where booking_id is not null and status <> 'void' and deleted_at is null;

create index if not exists ix_vendor_invoices_vendor_list
  on public.vendor_invoices (vendor_id, status, issue_date desc)
  where deleted_at is null;
create index if not exists ix_vendor_invoices_client
  on public.vendor_invoices (client_id, issue_date desc)
  where client_id is not null and deleted_at is null;
create index if not exists ix_vendor_invoices_contact
  on public.vendor_invoices (contact_id)
  where contact_id is not null;
create index if not exists ix_vendor_invoices_vendor_due
  on public.vendor_invoices (vendor_id, due_date)
  where status in ('issued', 'partially_paid') and deleted_at is null;

-- ---------------------------------------------------------------------
-- LINE ITEMS
-- `item` lines make the subtotal (the discount applies to them); `charge`
-- lines are extras like transport, added after the discount. Replaced
-- wholesale on each draft save, like quotation_items; frozen once the
-- invoice is issued.
-- ---------------------------------------------------------------------
create table if not exists public.vendor_invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.vendor_invoices(id) on delete cascade,
  kind        public.invoice_item_kind not null default 'item',
  description text not null,
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  line_total  numeric(14,2) not null default 0,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),

  constraint ck_invoice_item_description check (char_length(btrim(description)) between 1 and 500),
  constraint ck_invoice_item_quantity    check (quantity > 0),
  constraint ck_invoice_item_price       check (unit_price >= 0 and line_total >= 0)
);

create index if not exists ix_vendor_invoice_items_invoice
  on public.vendor_invoice_items (invoice_id, kind, sort_order);

-- ---------------------------------------------------------------------
-- Generic triggers (see 1105b for why they are installed by hand).
-- ---------------------------------------------------------------------
drop trigger if exists trg_updated_at on public.vendor_invoices;
create trigger trg_updated_at before update on public.vendor_invoices
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_bump_version on public.vendor_invoices;
create trigger trg_bump_version before update on public.vendor_invoices
  for each row execute function public.tg_bump_version();

drop trigger if exists trg_audit_actor on public.vendor_invoices;
create trigger trg_audit_actor before insert or update on public.vendor_invoices
  for each row execute function public.tg_set_audit_actor();

drop trigger if exists trg_soft_delete on public.vendor_invoices;
create trigger trg_soft_delete before delete on public.vendor_invoices
  for each row execute function public.tg_soft_delete();

drop trigger if exists trg_audit_log on public.vendor_invoices;
create trigger trg_audit_log after insert or update or delete on public.vendor_invoices
  for each row execute function public.tg_write_audit();

drop trigger if exists trg_audit_log on public.vendor_invoice_items;
create trigger trg_audit_log after insert or update or delete on public.vendor_invoice_items
  for each row execute function public.tg_write_audit();

-- ---------------------------------------------------------------------
-- THE LOCK
-- After `draft`, only these columns may change: the payment fields the
-- receipt and escrow paths maintain, the void fields, and the bookkeeping
-- the generic triggers write. A soft delete (`deleted_at`) is allowed for
-- drafts only — an issued invoice is voided, never deleted.
-- ---------------------------------------------------------------------
create or replace function public.tg_vendor_invoice_lock()
returns trigger language plpgsql set search_path = public as $$
declare
  c_mutable constant text[] := array[
    'status', 'amount_paid', 'balance_due', 'paid_at',
    'voided_at', 'voided_by', 'void_reason',
    'updated_at', 'updated_by', 'version'];
begin
  if new.vendor_id is distinct from old.vendor_id then
    raise exception 'invoice_vendor_immutable' using errcode = 'P0001';
  end if;

  if old.status = 'void' and new.status <> 'void' then
    raise exception 'invoice_void_final' using errcode = 'P0001';
  end if;

  if old.status <> 'draft' then
    if new.deleted_at is distinct from old.deleted_at then
      raise exception 'invoice_issued_cannot_delete' using errcode = 'P0001';
    end if;
    if new.status = 'draft' then
      raise exception 'invoice_cannot_return_to_draft' using errcode = 'P0001';
    end if;
    if (to_jsonb(new) - c_mutable) is distinct from (to_jsonb(old) - c_mutable) then
      raise exception 'invoice_locked: an issued invoice cannot be edited — void it and issue a new one'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;$$;

drop trigger if exists trg_vendor_invoice_lock on public.vendor_invoices;
create trigger trg_vendor_invoice_lock before update on public.vendor_invoices
  for each row execute function public.tg_vendor_invoice_lock();

create or replace function public.tg_vendor_invoice_items_lock()
returns trigger language plpgsql set search_path = public as $$
declare
  v_status public.invoice_status;
begin
  select i.status into v_status
    from public.vendor_invoices i
   where i.id = coalesce(new.invoice_id, old.invoice_id);

  -- Parent already gone: the cascade from a hard delete. Nothing to protect.
  if not found then
    return coalesce(new, old);
  end if;

  if v_status <> 'draft' then
    raise exception 'invoice_locked: the lines of an issued invoice cannot change'
      using errcode = 'P0001';
  end if;

  if tg_op = 'UPDATE' and new.invoice_id is distinct from old.invoice_id then
    raise exception 'invoice_item_move_forbidden' using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;$$;

drop trigger if exists trg_vendor_invoice_items_lock on public.vendor_invoice_items;
create trigger trg_vendor_invoice_items_lock before insert or update or delete on public.vendor_invoice_items
  for each row execute function public.tg_vendor_invoice_items_lock();
