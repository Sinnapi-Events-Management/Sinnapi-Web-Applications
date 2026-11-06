-- =====================================================================
-- Sinnapi — 1106b Overpaid invoices & "email it to me"
--
-- OVERPAYMENT (confirmed 2026-11-06)
-- Clients pay in instalments, and sometimes the instalments add up to more
-- than the invoice: they round up, send a tip, or pay twice. Until now the
-- database refused that in three places (record_receipt, the
-- `ck_invoice_paid_le_total` check, and `_invoice_refresh_payment`), so a
-- vendor could not record money they had genuinely received.
--
-- Now:
--   * a receipt may exceed what is still owed — but only when the request
--     says so explicitly (`allow_overpayment: true`). The vendor portal asks
--     "record anyway?" first; a client that forgets the flag still gets the
--     old `amount_exceeds_balance` refusal, so nothing overpays by accident.
--   * a receipt may be added to an invoice that is already `paid` or
--     `overpaid` (a late extra payment), under the same flag.
--   * receipts summing to MORE than the total make the invoice `overpaid`;
--     `balance_due` (total − amount_paid) goes negative and is the excess.
--   * voiding a receipt re-derives the status as before, so an overpaid
--     invoice falls back to paid / partially_paid / issued.
--
-- Escrow (`sinnapi_escrow`) invoices are untouched: they never take
-- receipts, and escrow always pays exactly the total.
-- 
-- EMAIL IT TO ME
-- `send-financial-document` can now send a document only to the vendor's
-- own account address (`recipient_kind = 'self'`). Those sends are logged
-- in the history but do NOT count toward the daily email cap, which exists
-- to protect clients' inboxes, not the vendor's own.
--
-- Both functions are `create or replace` with unchanged signatures, so the
-- grants from 1105f carry over; they are re-stated at the end regardless.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Invoice constraints
-- ---------------------------------------------------------------------
alter table public.vendor_invoices drop constraint if exists ck_invoice_paid_le_total;

alter table public.vendor_invoices drop constraint if exists ck_invoice_paid_status;
alter table public.vendor_invoices add constraint ck_invoice_paid_status check (
  (status <> 'paid' or amount_paid = total)
  and (status <> 'overpaid' or amount_paid > total));

-- Overpaid invoices are settled, not outstanding: the due-date index keeps
-- covering only the two unpaid states, so it needs no change.

-- ---------------------------------------------------------------------
-- 2. Receipt balances
-- A linked receipt's balance may now go below zero (the excess). A
-- standalone receipt's typed "still owed" stays zero or more.
-- ---------------------------------------------------------------------
alter table public.vendor_receipts drop constraint if exists ck_receipt_balances;
alter table public.vendor_receipts add constraint ck_receipt_balances check (
  invoice_id is not null
  or ((balance_before is null or balance_before >= 0)
      and (balance_after is null or balance_after >= 0)));

comment on column public.vendor_receipts.balance_after is
  'What was still owed once this payment landed. Linked receipts: negative means the invoice is overpaid by that much.';

-- ---------------------------------------------------------------------
-- 3. Re-deriving an invoice's payment state
-- ---------------------------------------------------------------------
create or replace function public._invoice_refresh_payment(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  inv    public.vendor_invoices;
  v_paid numeric;
begin
  select * into inv from public.vendor_invoices where id = p_invoice_id;
  if inv.status in ('draft', 'void') or inv.payment_channel <> 'vendor_collected' then
    return;
  end if;

  select coalesce(sum(r.amount), 0) into v_paid
    from public.vendor_receipts r
   where r.invoice_id = p_invoice_id and r.status = 'issued';

  update public.vendor_invoices
     set amount_paid = v_paid,
         status  = case when v_paid = 0         then 'issued'::public.invoice_status
                        when v_paid < inv.total then 'partially_paid'::public.invoice_status
                        when v_paid = inv.total then 'paid'::public.invoice_status
                        else 'overpaid'::public.invoice_status end,
         paid_at = case when v_paid >= inv.total then coalesce(inv.paid_at, now()) end
   where id = p_invoice_id;
end;$$;

-- ---------------------------------------------------------------------
-- 4. Recording a receipt
-- ---------------------------------------------------------------------
/**
 * Record a payment the vendor received. Payload:
 *   idempotency_key (uuid, required), confirmed (must be true),
 *   amount, payment_date, payment_method, payment_reference, description, notes,
 *   invoice_id            — linked: recipient, currency and balance come from it
 *   allow_overpayment     — linked only: true lets the amount exceed what is
 *                           still owed, or be added to a paid invoice (1106b)
 *   or, standalone:       client_id | contact_id | recipient_* , currency,
 *                         outstanding_balance (optional)
 * Returns {id, document_no, invoice_status}. A repeated idempotency key
 * returns the receipt it already created.
 */
create or replace function public.record_receipt(p_receipt jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_vendor     uuid := public._require_vendor();
  v_today      date := public._kampala_today();
  v_key        uuid;
  r            public.vendor_receipts;
  inv          public.vendor_invoices;
  c            public.vendor_contacts;
  v_amount     numeric;
  v_date       date;
  v_method     public.receipt_payment_method;
  v_currency   text;
  v_desc       text;
  v_client     uuid;
  v_contact    uuid;
  v_name       text;
  v_company    text;
  v_email      citext;
  v_phone      text;
  v_address    text;
  v_before     numeric;
  v_after      numeric;
  v_show_tin   boolean;
  v_no         text;
  v_id         uuid;
  v_constraint text;
  v_attempt    integer;
  v_inv_status public.invoice_status;
begin
  p_receipt := coalesce(p_receipt, '{}'::jsonb);

  begin
    v_key := (p_receipt ->> 'idempotency_key')::uuid;
  exception when invalid_text_representation then
    v_key := null;
  end;
  if v_key is null then
    raise exception 'idempotency_key_required: missing request key' using errcode = 'P0001';
  end if;

  select * into r from public.vendor_receipts where vendor_id = v_vendor and idempotency_key = v_key;
  if r.id is not null then
    select i.status into v_inv_status from public.vendor_invoices i where i.id = r.invoice_id;
    return jsonb_build_object('id', r.id, 'document_no', r.document_no, 'invoice_status', v_inv_status);
  end if;

  if coalesce((p_receipt ->> 'confirmed')::boolean, false) is not true then
    raise exception 'confirmation_required: confirm that you have received this payment' using errcode = 'P0001';
  end if;

  v_amount := public._jnum(p_receipt, 'amount');
  v_date   := coalesce(public._jdate(p_receipt, 'payment_date'), v_today);
  begin
    v_method := (p_receipt ->> 'payment_method')::public.receipt_payment_method;
  exception when invalid_text_representation then
    v_method := null;
  end;
  if v_method is null then
    raise exception 'payment_method_required: choose how you were paid' using errcode = 'P0001';
  end if;
  if v_date > v_today then
    raise exception 'payment_date_in_future: the payment date cannot be later than today' using errcode = 'P0001';
  end if;

  -- ---------- linked to an invoice ----------
  if nullif(p_receipt ->> 'invoice_id', '') is not null then
    inv := public._lock_own_invoice((p_receipt ->> 'invoice_id')::uuid, v_vendor);

    if inv.payment_channel = 'sinnapi_escrow' then
      raise exception 'receipt_blocked_escrow: this booking is paid through Sinnapi — Sinnapi''s payment confirmation is the receipt'
        using errcode = 'P0001';
    end if;
    if inv.status not in ('issued', 'partially_paid', 'paid', 'overpaid') then
      raise exception 'invoice_not_payable: payments can only be recorded against an issued invoice'
        using errcode = 'P0001';
    end if;
    if v_date < inv.issue_date then
      raise exception 'payment_before_issue: the payment date cannot be before the invoice date' using errcode = 'P0001';
    end if;

    v_currency := inv.currency;
    v_amount   := public._money_round(v_amount, v_currency);
    if v_amount is null or v_amount <= 0 then
      raise exception 'amount_invalid: the amount received must be more than zero' using errcode = 'P0001';
    end if;
    -- More than is owed (including anything at all on a settled invoice)
    -- only on an explicit "record anyway".
    if v_amount > greatest(inv.balance_due, 0)
       and coalesce((p_receipt ->> 'allow_overpayment')::boolean, false) is not true then
      raise exception 'amount_exceeds_balance: this is more than the % % still owed', v_currency, greatest(inv.balance_due, 0)
        using errcode = 'P0001';
    end if;

    v_client  := inv.client_id;
    v_contact := inv.contact_id;
    v_name    := inv.recipient_name;
    v_company := inv.recipient_company;
    v_email   := inv.recipient_email;
    v_phone   := inv.recipient_phone;
    v_address := inv.recipient_address;
    v_show_tin := inv.show_vendor_tax_id;
    v_before  := inv.balance_due;
    v_after   := inv.balance_due - v_amount;
    v_desc    := coalesce(public._jtext(p_receipt, 'description'), 'Payment for ' || inv.document_no);

  -- ---------- standalone ----------
  else
    v_currency := upper(coalesce(public._jtext(p_receipt, 'currency'), 'UGX'));
    if not exists (select 1 from public.currencies where code = v_currency and is_active) then
      raise exception 'currency_unsupported: % is not an available currency', v_currency using errcode = 'P0001';
    end if;
    v_amount := public._money_round(v_amount, v_currency);
    if v_amount is null or v_amount <= 0 then
      raise exception 'amount_invalid: the amount received must be more than zero' using errcode = 'P0001';
    end if;

    v_client  := nullif(p_receipt ->> 'client_id', '')::uuid;
    v_contact := nullif(p_receipt ->> 'contact_id', '')::uuid;
    v_name    := public._jtext(p_receipt, 'recipient_name');
    v_company := public._jtext(p_receipt, 'recipient_company');
    v_email   := lower(public._jtext(p_receipt, 'recipient_email'))::citext;
    v_phone   := public._jtext(p_receipt, 'recipient_phone');
    v_address := public._jtext(p_receipt, 'recipient_address');

    if v_client is not null and v_contact is not null then
      raise exception 'recipient_ambiguous: choose a Sinnapi client or a saved client, not both' using errcode = 'P0001';
    end if;

    if v_client is not null then
      if not public._vendor_client_eligible(v_vendor, v_client) then
        raise exception 'client_not_eligible: you can only issue receipts to Sinnapi clients you have a quote or booking with'
          using errcode = 'P0001';
      end if;
      select x.full_name, x.phone into v_name, v_phone from public._registered_recipient(v_client) x;
      v_email := null; v_company := null;
    else
      if v_contact is not null then
        select * into c from public.vendor_contacts
         where id = v_contact and vendor_id = v_vendor and deleted_at is null;
        if c.id is null then
          raise exception 'not_found: saved client not found' using errcode = 'P0001';
        end if;
        v_name    := coalesce(v_name, c.full_name);
        v_company := coalesce(v_company, c.company_name);
        v_email   := coalesce(v_email, c.email);
        v_phone   := coalesce(v_phone, c.phone);
        v_address := coalesce(v_address, c.address);
      end if;
      if coalesce(btrim(v_name), '') = '' then
        raise exception 'recipient_required: add who paid you' using errcode = 'P0001';
      end if;
      v_contact := coalesce(v_contact,
        public._match_or_save_contact(v_vendor, v_name, v_company, v_email, v_phone, v_address));
    end if;

    v_desc := public._jtext(p_receipt, 'description');
    if v_desc is null then
      raise exception 'description_required: say what this payment was for' using errcode = 'P0001';
    end if;
    v_show_tin := coalesce((p_receipt ->> 'show_vendor_tax_id')::boolean, false);
    v_before := null;
    v_after  := public._money_round(public._jnum(p_receipt, 'outstanding_balance'), v_currency);
    if v_after is not null and v_after < 0 then
      raise exception 'balance_invalid: the outstanding balance cannot be negative' using errcode = 'P0001';
    end if;
  end if;

  -- ---------- number and insert ----------
  for v_attempt in 1 .. 20 loop
    begin
      v_no := public._gen_document_no('SNP-RCT');
      insert into public.vendor_receipts (
        vendor_id, document_no, status, invoice_id,
        client_id, contact_id, recipient_name, recipient_company, recipient_email, recipient_phone, recipient_address,
        vendor_snapshot, show_vendor_tax_id,
        currency, amount, payment_date, payment_method, payment_reference, description, notes,
        balance_before, balance_after, vendor_confirmed_at, idempotency_key, issued_by)
      values (
        v_vendor, v_no, 'issued', inv.id,
        v_client, v_contact, v_name, v_company, v_email, v_phone, v_address,
        public._vendor_snapshot(v_vendor, v_show_tin, v_client is null), v_show_tin,
        v_currency, v_amount, v_date, v_method, public._jtext(p_receipt, 'payment_reference'),
        v_desc, public._jtext(p_receipt, 'notes'),
        v_before, v_after, now(), v_key, auth.uid())
      returning id into v_id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'ux_vendor_receipts_idempotency' then
        -- The same request, landing twice at once: hand back the first.
        select * into r from public.vendor_receipts where vendor_id = v_vendor and idempotency_key = v_key;
        return jsonb_build_object('id', r.id, 'document_no', r.document_no);
      end if;
      if v_constraint is distinct from 'ux_vendor_receipts_document_no' or v_attempt = 20 then
        raise;
      end if;
    end;
  end loop;

  if inv.id is not null then
    perform public._invoice_refresh_payment(inv.id);
    select i.status into v_inv_status from public.vendor_invoices i where i.id = inv.id;
  end if;

  if v_client is not null then
    perform public.notify_party(
      'payment.receipt_issued', v_client, 'client', 'vendor_receipt', v_id,
      jsonb_build_object('vendor_id', v_vendor, 'receipt_id', v_id, 'document_no', v_no,
                         'currency', v_currency, 'amount', v_amount));
  end if;

  return jsonb_build_object('id', v_id, 'document_no', v_no, 'invoice_status', v_inv_status);
end;$$;

-- ---------------------------------------------------------------------
-- 5. Claiming an email send
-- ---------------------------------------------------------------------
/**
 * Claim a send. Checks the document is the vendor's and sendable, enforces
 * the rolling 24-hour cap under a per-vendor lock, and writes the
 * `sending` row. A repeated request_key returns the existing row with
 * `duplicate = true` so the function can answer without sending again.
 */
create or replace function public.begin_document_delivery(
  p_vendor_id        uuid,
  p_kind             text,
  p_document_id      uuid,
  p_recipient_kind   public.document_recipient_kind,
  p_recipient_display text,
  p_cc_self          boolean,
  p_subject          text,
  p_message          text,
  p_attachment_path  text,
  p_attachment_sha256 text,
  p_request_key      uuid,
  p_requested_by     uuid)
returns table (delivery_id uuid, duplicate boolean, delivery_status public.document_delivery_status)
language plpgsql security definer set search_path = public as $$
declare
  v_existing public.vendor_document_deliveries;
  v_status   text;
  v_limit    integer;
  v_used     integer;
  v_id       uuid;
begin
  select * into v_existing from public.vendor_document_deliveries d
   where d.vendor_id = p_vendor_id and d.request_key = p_request_key;
  if v_existing.id is not null then
    return query select v_existing.id, true, v_existing.status;
    return;
  end if;

  if p_kind = 'invoice' then
    select i.status::text into v_status from public.vendor_invoices i
     where i.id = p_document_id and i.vendor_id = p_vendor_id and i.deleted_at is null;
  elsif p_kind = 'receipt' then
    select r.status::text into v_status from public.vendor_receipts r
     where r.id = p_document_id and r.vendor_id = p_vendor_id;
  else
    raise exception 'invalid_kind: % is not invoice or receipt', p_kind using errcode = 'P0001';
  end if;

  if v_status is null then
    raise exception 'not_found: document not found' using errcode = 'P0001';
  end if;
  if v_status in ('draft', 'void') then
    raise exception 'document_not_sendable: only an issued document can be emailed' using errcode = 'P0001';
  end if;
  if p_attachment_path is distinct from
     (p_vendor_id::text || '/' || p_kind || '/' || p_document_id::text || '.pdf') then
    raise exception 'attachment_path_invalid: the attachment does not belong to this document' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('vendor_document_delivery:' || p_vendor_id::text, 0));

  -- The cap protects clients' inboxes: a copy the vendor sends only to
  -- themselves neither counts toward it nor is stopped by it (1106b).
  v_limit := coalesce((public.get_setting('document_email_daily_limit') #>> '{}')::integer, 50);
  select count(*) into v_used from public.vendor_document_deliveries d
   where d.vendor_id = p_vendor_id and d.created_at > now() - interval '24 hours'
     and d.recipient_kind <> 'self';
  if p_recipient_kind <> 'self' and v_used >= v_limit then
    raise exception 'daily_email_limit_reached: you have sent % documents in the last 24 hours — try again later', v_limit
      using errcode = 'P0001';
  end if;

  insert into public.vendor_document_deliveries (
    vendor_id, invoice_id, receipt_id, recipient_kind, recipient_display, cc_self,
    subject, message, status, attachment_path, attachment_sha256, request_key, requested_by)
  values (
    p_vendor_id,
    case when p_kind = 'invoice' then p_document_id end,
    case when p_kind = 'receipt' then p_document_id end,
    p_recipient_kind, p_recipient_display, coalesce(p_cc_self, false),
    p_subject, nullif(btrim(p_message), ''), 'sending', p_attachment_path, lower(p_attachment_sha256),
    p_request_key, p_requested_by)
  returning id into v_id;

  return query select v_id, false, 'sending'::public.document_delivery_status;
end;$$;

-- ---------------------------------------------------------------------
-- 6. Grants (unchanged; restated so this file stands on its own)
-- ---------------------------------------------------------------------
revoke all on function public._invoice_refresh_payment(uuid) from public, anon, authenticated;
revoke all on function public.record_receipt(jsonb) from public, anon;
grant execute on function public.record_receipt(jsonb) to authenticated;
revoke all on function public.begin_document_delivery(uuid, text, uuid, public.document_recipient_kind, text, boolean, text, text, text, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.begin_document_delivery(uuid, text, uuid, public.document_recipient_kind, text, boolean, text, text, text, text, uuid, uuid)
  to service_role;
