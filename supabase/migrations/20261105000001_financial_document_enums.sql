-- =====================================================================
-- Sinnapi — 1105a Vendor invoices & receipts: vocabulary
--
-- The enums the invoice/receipt feature is built on (1105a–h). Kept in a
-- file of their own so the tables that use them read cleanly, and so each
-- `create type` can be guarded: a re-run must not fail on a type that
-- already exists.
--
-- WHY A NEW PAYMENT-METHOD ENUM
-- `payment_method` (mtn_momo / airtel_money / card) describes what a PSP
-- checkout accepted, and `settlement_method` is the escrow payout
-- vocabulary the admin settlement dialogs render. A receipt records money
-- the VENDOR received outside Sinnapi, which includes cash, bank transfers
-- and cheques. Widening either existing enum would change two unrelated
-- flows, so receipts get their own.
-- =====================================================================

do $$ begin
  create type public.invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.receipt_status as enum ('issued', 'void');
exception when duplicate_object then null; end $$;

-- How an invoice gets paid. `sinnapi_escrow` invoices belong to a booking
-- and are settled by the escrow payment, never by a vendor receipt.
do $$ begin
  create type public.invoice_payment_channel as enum ('vendor_collected', 'sinnapi_escrow');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_item_kind as enum ('item', 'charge');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.receipt_payment_method as enum
    ('cash', 'mtn_momo', 'airtel_money', 'bank_transfer', 'card', 'cheque', 'other');
exception when duplicate_object then null; end $$;

-- `auto`: saved when a document was first issued to this person.
-- `manual`: the vendor added them from the Saved clients tab.
do $$ begin
  create type public.vendor_contact_source as enum ('auto', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_delivery_status as enum ('sending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

-- `client_account`: the registered client's Sinnapi email, resolved on the
-- server and never stored where the vendor can read it.
-- `address`: an address the vendor typed or saved.
do $$ begin
  create type public.document_recipient_kind as enum ('client_account', 'address');
exception when duplicate_object then null; end $$;
