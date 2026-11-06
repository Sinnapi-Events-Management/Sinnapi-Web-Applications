-- =====================================================================
-- Sinnapi — 1105 vendor invoices & receipts test
--
-- Proves the 1105a–h write path and its walls:
--   money      the formula, UGX (0dp) and USD (2dp) rounding, tax both ways
--   lifecycle  draft → issued → partly paid → paid, voids, the edit lock
--   receipts   no overpayment, no future dates, double-submit returns one
--   isolation  another vendor can neither read nor change any of it, a
--              client sees only issued documents addressed to them, and
--              nobody can write the tables directly
--   escrow     booking invoices refuse receipts and follow their escrow
--   numbers    shape, uniqueness, every digit reachable
--   email      the daily cap, duplicate requests, path binding
--
-- Same contract as the other files here: run against a database with the
-- whole chain applied, everything rolls back, silent unless it fails.
-- =====================================================================

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_run      text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_owner    uuid := gen_random_uuid();
  v_owner2   uuid := gen_random_uuid();
  v_client   uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_vendor   uuid := gen_random_uuid();
  v_vendor2  uuid := gen_random_uuid();
  v_booking  uuid := gen_random_uuid();
  v_inv      uuid;
  v_inv2     uuid;
  v_inv_reg  uuid;
  v_inv_esc  uuid;
  v_draft    uuid;
  v_rct      jsonb;
  v_rct2     jsonb;
  v_key      uuid := gen_random_uuid();
  v_res      jsonb;
  i          public.vendor_invoices;
  r          public.vendor_receipts;
  v_n        integer;
  v_txt      text;
  v_del      record;
  v_escrow   uuid := gen_random_uuid();
begin
  -- -----------------------------------------------------------------
  -- SEED
  -- -----------------------------------------------------------------
  insert into auth.users (id, instance_id, email, aud, role, raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at, created_at, updated_at)
  values
    (v_owner,    '00000000-0000-0000-0000-000000000000', 't1105-o1-' || v_run || '@example.test',
     'authenticated', 'authenticated', '{}', '{"full_name":"Owner One"}', now(), now(), now()),
    (v_owner2,   '00000000-0000-0000-0000-000000000000', 't1105-o2-' || v_run || '@example.test',
     'authenticated', 'authenticated', '{}', '{"full_name":"Owner Two"}', now(), now(), now()),
    (v_client,   '00000000-0000-0000-0000-000000000000', 't1105-c-' || v_run || '@example.test',
     'authenticated', 'authenticated', '{}', '{"full_name":"Sarah Client"}', now(), now(), now()),
    (v_stranger, '00000000-0000-0000-0000-000000000000', 't1105-s-' || v_run || '@example.test',
     'authenticated', 'authenticated', '{}', '{"full_name":"Stranger"}', now(), now(), now());

  insert into public.vendors (id, owner_id, business_name, slug, status, visibility, business_location, base_city, tax_id)
  values (v_vendor,  v_owner,  'Amani Events', 't1105-v1-' || v_run, 'active', 'public', 'Kira Road', 'Kampala', 'TIN-TEST-1'),
         (v_vendor2, v_owner2, 'Other Vendor', 't1105-v2-' || v_run, 'active', 'public', null, null, null);

  insert into public.bookings (id, vendor_id, client_id, reference_no, event_date, status,
                               payment_type, payment_terms_status, advance_terms_accepted_at, amount, currency)
  values (v_booking, v_vendor, v_client, 'T1105-' || v_run, current_date + 30, 'confirmed',
          'escrow', 'accepted', now(), 500000, 'UGX');

  perform set_config('request.jwt.claim.sub', v_owner::text, true);

  -- =================================================================
  -- 1. MONEY — UGX, discount %, a charge, no tax
  --    items 2 × 45,000 = 90,000; 5% = 4,500; transport 150,000
  --    taxable = 90,000 − 4,500 + 150,000 = 235,500 = total
  -- =================================================================
  v_inv := public.save_invoice_draft(null, jsonb_build_object(
    'recipient_name', 'Kato & Sons Ltd', 'recipient_email', 'Accounts@Kato.example',
    'currency', 'UGX', 'title', 'Corporate dinner',
    'discount_type', 'percentage', 'discount_value', 5,
    'items', jsonb_build_array(
      jsonb_build_object('description', 'Centrepieces', 'quantity', 2, 'unit_price', 45000),
      jsonb_build_object('kind', 'charge', 'description', 'Transport', 'quantity', 1, 'unit_price', 150000))));

  select * into i from public.vendor_invoices where id = v_inv;
  if (i.subtotal, i.discount_total, i.charges_total, i.tax_total, i.total)
     is distinct from (90000::numeric, 4500::numeric, 150000::numeric, 0::numeric, 235500::numeric) then
    raise exception 'FAIL 1: UGX totals were % / % / % / % / %', i.subtotal, i.discount_total, i.charges_total, i.tax_total, i.total;
  end if;
  if i.status <> 'draft' or i.document_no is not null then
    raise exception 'FAIL 1: a new invoice must be an unnumbered draft';
  end if;
  if i.recipient_email::text <> 'accounts@kato.example' then
    raise exception 'FAIL 1: email not normalised, got %', i.recipient_email;
  end if;

  -- 1b. exclusive tax 18%: round(235,500 × 0.18) = 42,390 → 277,890
  v_inv := public.save_invoice_draft(v_inv, jsonb_build_object(
    'recipient_name', 'Kato & Sons Ltd', 'recipient_email', 'accounts@kato.example', 'currency', 'UGX',
    'discount_type', 'percentage', 'discount_value', 5, 'tax_rate', 18, 'tax_label', 'VAT',
    'items', jsonb_build_array(
      jsonb_build_object('description', 'Centrepieces', 'quantity', 2, 'unit_price', 45000),
      jsonb_build_object('kind', 'charge', 'description', 'Transport', 'quantity', 1, 'unit_price', 150000))));
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.tax_total, i.total) is distinct from (42390::numeric, 277890::numeric) then
    raise exception 'FAIL 1b: exclusive tax gave % / %', i.tax_total, i.total;
  end if;

  -- 1c. inclusive 18%: 235,500 − 235,500/1.18 = 35,923.73 → 35,924; total stays 235,500
  v_inv := public.save_invoice_draft(v_inv, jsonb_build_object(
    'recipient_name', 'Kato & Sons Ltd', 'recipient_email', 'accounts@kato.example', 'currency', 'UGX',
    'discount_type', 'percentage', 'discount_value', 5, 'tax_rate', 18, 'tax_inclusive', true,
    'items', jsonb_build_array(
      jsonb_build_object('description', 'Centrepieces', 'quantity', 2, 'unit_price', 45000),
      jsonb_build_object('kind', 'charge', 'description', 'Transport', 'quantity', 1, 'unit_price', 150000))));
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.tax_total, i.total, i.tax_label) is distinct from (35924::numeric, 235500::numeric, 'Tax'::text) then
    raise exception 'FAIL 1c: inclusive tax gave % / % / %', i.tax_total, i.total, i.tax_label;
  end if;

  -- 1d. USD keeps cents: 3 × 19.99 = 59.97; 10% = 5.997 → 6.00; total 53.97
  v_inv2 := public.save_invoice_draft(null, jsonb_build_object(
    'recipient_name', 'Overseas Guest', 'currency', 'usd',
    'discount_type', 'percentage', 'discount_value', 10,
    'items', jsonb_build_array(jsonb_build_object('description', 'Photo prints', 'quantity', 3, 'unit_price', 19.99))));
  select * into i from public.vendor_invoices where id = v_inv2;
  if (i.currency, i.subtotal, i.discount_total, i.total)
     is distinct from ('USD'::text, 59.97::numeric, 6.00::numeric, 53.97::numeric) then
    raise exception 'FAIL 1d: USD gave % % / % / %', i.currency, i.subtotal, i.discount_total, i.total;
  end if;

  -- 1e. UGX rounds a fractional price to whole shillings
  v_draft := public.save_invoice_draft(null, jsonb_build_object(
    'recipient_name', 'Rounding Check', 'currency', 'UGX',
    'items', jsonb_build_array(jsonb_build_object('description', 'Half', 'quantity', 1, 'unit_price', 1000.5))));
  select * into i from public.vendor_invoices where id = v_draft;
  if i.total <> 1001 then raise exception 'FAIL 1e: UGX 1000.5 should round to 1001, got %', i.total; end if;

  -- 1f. guards
  -- Postgres would read these as numerics; NaN even sorts above every number.
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 'Infinity', 'unit_price', 10))));
    raise exception 'FAIL 1f: expected invalid_number for Infinity';
  exception when others then
    if sqlerrm not like 'invalid_number%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 1, 'unit_price', 'NaN'))));
    raise exception 'FAIL 1f: expected invalid_number for NaN';
  exception when others then
    if sqlerrm not like 'invalid_number%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 1, 'unit_price', '1e15'))));
    raise exception 'FAIL 1f: expected number_too_large';
  exception when others then
    if sqlerrm not like 'number_too_large%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 9000, 'unit_price', 900000000))));
    raise exception 'FAIL 1f: expected number_too_large for a line total';
  exception when others then
    if sqlerrm not like 'number_too_large%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.record_receipt(jsonb_build_object('idempotency_key', gen_random_uuid(), 'confirmed', true,
      'recipient_name', 'X', 'currency', 'UGX', 'amount', 'NaN', 'payment_method', 'cash', 'description', 'x'));
    raise exception 'FAIL 1f: a NaN payment was recorded';
  exception when others then
    if sqlerrm not like 'invalid_number%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'discount_type', 'fixed', 'discount_value', 999999,
      'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 1, 'unit_price', 10))));
    raise exception 'FAIL 1f: expected discount_exceeds_subtotal';
  exception when others then
    if sqlerrm not like 'discount_exceeds_subtotal%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'issue_date', (current_date + 10)::text));
    raise exception 'FAIL 1f: expected issue_date_in_future';
  exception when others then
    if sqlerrm not like 'issue_date_in_future%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'issue_date', (current_date - 1)::text, 'due_date', (current_date - 5)::text));
    raise exception 'FAIL 1f: expected due_before_issue';
  exception when others then
    if sqlerrm not like 'due_before_issue%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'X',
      'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 'two', 'unit_price', 10))));
    raise exception 'FAIL 1f: expected invalid_number';
  exception when others then
    if sqlerrm not like 'invalid_number%' then raise exception 'FAIL 1f: got %', sqlerrm; end if;
  end;

  -- =================================================================
  -- 2. ISSUE — number, snapshot, contact auto-saved, then locked
  -- =================================================================
  v_res := public.issue_invoice(v_inv);
  select * into i from public.vendor_invoices where id = v_inv;
  if i.status <> 'issued' or i.document_no !~ '^SNP-INV-[0-9]{8}$' or v_res ->> 'document_no' <> i.document_no then
    raise exception 'FAIL 2: issue gave status % number %', i.status, i.document_no;
  end if;
  if i.vendor_snapshot ->> 'business_name' <> 'Amani Events'
     or i.vendor_snapshot ->> 'email' is null
     or i.vendor_snapshot ? 'tax_id' then
    raise exception 'FAIL 2: snapshot wrong: %', i.vendor_snapshot;
  end if;
  if i.contact_id is null
     or (select source from public.vendor_contacts where id = i.contact_id) <> 'auto' then
    raise exception 'FAIL 2: the external recipient was not saved as an auto contact';
  end if;

  -- issuing again is refused
  begin
    perform public.issue_invoice(v_inv);
    raise exception 'FAIL 2: expected invalid_state on a second issue';
  exception when others then
    if sqlerrm not like 'invalid_state%' then raise exception 'FAIL 2: got %', sqlerrm; end if;
  end;

  -- the lock holds even against a superuser writing the table directly
  begin
    update public.vendor_invoices set total = 1 where id = v_inv;
    raise exception 'FAIL 2: an issued invoice''s total was edited';
  exception when others then
    if sqlerrm not like 'invoice_locked%' then raise exception 'FAIL 2: got %', sqlerrm; end if;
  end;
  begin
    insert into public.vendor_invoice_items (invoice_id, description, quantity, unit_price, line_total)
    values (v_inv, 'Sneaked in', 1, 1, 1);
    raise exception 'FAIL 2: a line was added to an issued invoice';
  exception when others then
    if sqlerrm not like 'invoice_locked%' then raise exception 'FAIL 2: got %', sqlerrm; end if;
  end;
  begin
    perform public.delete_invoice_draft(v_inv);
    raise exception 'FAIL 2: an issued invoice was deleted';
  exception when others then
    if sqlerrm not like 'invalid_state%' then raise exception 'FAIL 2: got %', sqlerrm; end if;
  end;

  -- a second invoice to the same email reuses the saved contact
  v_draft := public.save_invoice_draft(null, jsonb_build_object(
    'recipient_name', 'Kato and Sons', 'recipient_email', 'ACCOUNTS@kato.example',
    'items', jsonb_build_array(jsonb_build_object('description', 'Deposit', 'quantity', 1, 'unit_price', 1000))));
  perform public.issue_invoice(v_draft);
  if (select contact_id from public.vendor_invoices where id = v_draft) <> i.contact_id then
    raise exception 'FAIL 2: a returning external client was saved twice';
  end if;

  -- =================================================================
  -- 3. RECEIPTS — partial, idempotent, guarded, then paid
  --    invoice total 235,500
  -- =================================================================
  v_rct := public.record_receipt(jsonb_build_object(
    'invoice_id', v_inv, 'idempotency_key', v_key, 'confirmed', true,
    'amount', 100000, 'payment_method', 'mtn_momo', 'payment_reference', 'MP-TEST-1'));

  select * into i from public.vendor_invoices where id = v_inv;
  if i.status <> 'partially_paid' or i.amount_paid <> 100000 or i.balance_due <> 135500 then
    raise exception 'FAIL 3: after 100,000 the invoice is % paid % due %', i.status, i.amount_paid, i.balance_due;
  end if;
  select * into r from public.vendor_receipts where id = (v_rct ->> 'id')::uuid;
  if r.document_no !~ '^SNP-RCT-[0-9]{8}$' or r.balance_before <> 235500 or r.balance_after <> 135500
     or r.description <> 'Payment for ' || i.document_no then
    raise exception 'FAIL 3: receipt % before % after % desc %', r.document_no, r.balance_before, r.balance_after, r.description;
  end if;

  -- the same request again: same receipt, nothing added
  v_rct2 := public.record_receipt(jsonb_build_object(
    'invoice_id', v_inv, 'idempotency_key', v_key, 'confirmed', true,
    'amount', 100000, 'payment_method', 'mtn_momo'));
  select count(*) into v_n from public.vendor_receipts where invoice_id = v_inv;
  if v_rct2 ->> 'id' <> v_rct ->> 'id' or v_n <> 1 then
    raise exception 'FAIL 3: a repeated request created % receipts', v_n;
  end if;

  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 135501, 'payment_method', 'cash'));
    raise exception 'FAIL 3: expected amount_exceeds_balance';
  exception when others then
    if sqlerrm not like 'amount_exceeds_balance%' then raise exception 'FAIL 3: got %', sqlerrm; end if;
  end;
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 10, 'payment_method', 'cash', 'payment_date', (current_date + 3)::text));
    raise exception 'FAIL 3: expected payment_date_in_future';
  exception when others then
    if sqlerrm not like 'payment_date_in_future%' then raise exception 'FAIL 3: got %', sqlerrm; end if;
  end;
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'amount', 10, 'payment_method', 'cash'));
    raise exception 'FAIL 3: expected confirmation_required';
  exception when others then
    if sqlerrm not like 'confirmation_required%' then raise exception 'FAIL 3: got %', sqlerrm; end if;
  end;
  begin
    update public.vendor_receipts set amount = 1 where id = r.id;
    raise exception 'FAIL 3: a receipt amount was edited';
  exception when others then
    if sqlerrm not like 'receipt_locked%' then raise exception 'FAIL 3: got %', sqlerrm; end if;
  end;

  -- the rest → paid
  perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
    'confirmed', true, 'amount', 135500, 'payment_method', 'bank_transfer'));
  select * into i from public.vendor_invoices where id = v_inv;
  if i.status <> 'paid' or i.balance_due <> 0 or i.paid_at is null then
    raise exception 'FAIL 3: fully paid invoice is % due %', i.status, i.balance_due;
  end if;

  -- voids: invoice refused while receipts live; voiding a receipt restores the balance
  begin
    perform public.void_invoice(v_inv, 'Wrong client');
    raise exception 'FAIL 3: expected invoice_has_receipts';
  exception when others then
    if sqlerrm not like 'invoice_has_receipts%' then raise exception 'FAIL 3: got %', sqlerrm; end if;
  end;
  perform public.void_receipt(r.id, 'Recorded twice by mistake');
  select * into i from public.vendor_invoices where id = v_inv;
  if i.status <> 'partially_paid' or i.amount_paid <> 135500 then
    raise exception 'FAIL 3: after a void the invoice is % paid %', i.status, i.amount_paid;
  end if;

  -- standalone receipt with an outstanding balance typed in
  v_rct := public.record_receipt(jsonb_build_object('idempotency_key', gen_random_uuid(), 'confirmed', true,
    'recipient_name', 'Walk-in Client', 'currency', 'UGX', 'amount', 50000, 'payment_method', 'cash',
    'description', 'Deposit for chairs', 'outstanding_balance', 25000));
  select * into r from public.vendor_receipts where id = (v_rct ->> 'id')::uuid;
  if r.invoice_id is not null or r.balance_after <> 25000 or r.contact_id is null then
    raise exception 'FAIL 3: standalone receipt % / % / %', r.invoice_id, r.balance_after, r.contact_id;
  end if;

  -- =================================================================
  -- 4. REGISTERED CLIENTS — eligibility, no email stored, notified
  -- =================================================================
  begin
    perform public.save_invoice_draft(null, jsonb_build_object('client_id', v_stranger));
    raise exception 'FAIL 4: invoiced a client with no quote or booking';
  exception when others then
    if sqlerrm not like 'client_not_eligible%' then raise exception 'FAIL 4: got %', sqlerrm; end if;
  end;

  v_inv_reg := public.save_invoice_draft(null, jsonb_build_object(
    'client_id', v_client, 'recipient_email', 'should-be-dropped@example.test',
    'items', jsonb_build_array(jsonb_build_object('description', 'Extra hours', 'quantity', 2, 'unit_price', 50000))));
  select * into i from public.vendor_invoices where id = v_inv_reg;
  if i.recipient_email is not null or i.recipient_name <> 'Sarah Client' then
    raise exception 'FAIL 4: registered recipient stored email % name %', i.recipient_email, i.recipient_name;
  end if;
  perform public.issue_invoice(v_inv_reg);
  select * into i from public.vendor_invoices where id = v_inv_reg;
  if i.vendor_snapshot ? 'email' then
    raise exception 'FAIL 4: the vendor email was printed for a registered client';
  end if;
  if not exists (select 1 from public.notifications n
                  where n.recipient_id = v_client and n.trigger_key = 'payment.invoice_issued'
                    and n.title = 'New invoice from Amani Events') then
    raise exception 'FAIL 4: the client was not notified in-app';
  end if;

  -- a draft for the client that they must not see
  v_draft := public.save_invoice_draft(null, jsonb_build_object('client_id', v_client));

  -- =================================================================
  -- 5. ISOLATION — another vendor, through the functions
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_owner2::text, true);
  begin
    perform public.save_invoice_draft(v_inv_reg, '{}'::jsonb);
    raise exception 'FAIL 5: another vendor edited this vendor''s invoice';
  exception when others then
    if sqlerrm not like 'not_found%' then raise exception 'FAIL 5: got %', sqlerrm; end if;
  end;
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 1, 'payment_method', 'cash'));
    raise exception 'FAIL 5: another vendor recorded a payment here';
  exception when others then
    if sqlerrm not like 'not_found%' then raise exception 'FAIL 5: got %', sqlerrm; end if;
  end;
  begin
    perform public.void_invoice(v_inv_reg, 'hostile');
    raise exception 'FAIL 5: another vendor voided this invoice';
  exception when others then
    if sqlerrm not like 'not_found%' then raise exception 'FAIL 5: got %', sqlerrm; end if;
  end;
  begin
    perform public.void_receipt((v_rct ->> 'id')::uuid, 'hostile');
    raise exception 'FAIL 5: another vendor voided this receipt';
  exception when others then
    if sqlerrm not like 'not_found%' then raise exception 'FAIL 5: got %', sqlerrm; end if;
  end;

  -- a non-vendor cannot use the functions at all
  perform set_config('request.jwt.claim.sub', v_client::text, true);
  begin
    perform public.save_invoice_draft(null, '{}'::jsonb);
    raise exception 'FAIL 5: a client created an invoice';
  exception when others then
    if sqlstate <> '42501' then raise exception 'FAIL 5: got % %', sqlstate, sqlerrm; end if;
  end;

  -- =================================================================
  -- 6. RLS — as `authenticated`, the role PostgREST uses
  -- =================================================================
  set local role authenticated;

  perform set_config('request.jwt.claim.sub', v_owner2::text, true);
  select count(*) into v_n from public.vendor_invoices where vendor_id = v_vendor;
  if v_n <> 0 then raise exception 'FAIL 6: another vendor can read % invoices', v_n; end if;
  select count(*) into v_n from public.vendor_receipts where vendor_id = v_vendor;
  if v_n <> 0 then raise exception 'FAIL 6: another vendor can read % receipts', v_n; end if;
  select count(*) into v_n from public.vendor_contacts where vendor_id = v_vendor;
  if v_n <> 0 then raise exception 'FAIL 6: another vendor can read % contacts', v_n; end if;
  select count(*) into v_n from public.vendor_invoice_items where invoice_id = v_inv;
  if v_n <> 0 then raise exception 'FAIL 6: another vendor can read % lines', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_client::text, true);
  select count(*) into v_n from public.vendor_invoices where id = v_inv_reg;
  if v_n <> 1 then raise exception 'FAIL 6: the client cannot see their issued invoice'; end if;
  select count(*) into v_n from public.vendor_invoice_items where invoice_id = v_inv_reg;
  if v_n <> 1 then raise exception 'FAIL 6: the client cannot see their invoice''s lines'; end if;
  select count(*) into v_n from public.vendor_invoices where id = v_draft;
  if v_n <> 0 then raise exception 'FAIL 6: the client can see a draft'; end if;
  select count(*) into v_n from public.vendor_invoices where id = v_inv;
  if v_n <> 0 then raise exception 'FAIL 6: the client can see another recipient''s invoice'; end if;
  select count(*) into v_n from public.vendor_document_deliveries;
  if v_n <> 0 then raise exception 'FAIL 6: the client can read delivery history'; end if;

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select count(*) into v_n from public.vendor_invoices where vendor_id = v_vendor;
  if v_n < 4 then raise exception 'FAIL 6: the vendor sees only % of their invoices', v_n; end if;

  begin
    insert into public.vendor_invoices (vendor_id, currency) values (v_vendor, 'UGX');
    raise exception 'FAIL 6: the vendor inserted an invoice directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.vendor_invoices set notes = 'x' where id = v_draft;
    raise exception 'FAIL 6: the vendor updated an invoice directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.vendor_receipts (vendor_id) values (v_vendor);
    raise exception 'FAIL 6: the vendor inserted a receipt directly';
  exception when insufficient_privilege then null;
  end;

  -- contacts are directly editable, but only one's own
  insert into public.vendor_contacts (vendor_id, full_name, source) values (v_vendor, 'Manual Contact', 'manual');
  begin
    insert into public.vendor_contacts (vendor_id, full_name) values (v_vendor2, 'Planted');
    raise exception 'FAIL 6: a vendor saved a contact under another vendor';
  exception when insufficient_privilege then null;
  end;

  -- the functions still work as `authenticated` (grants + definer)
  v_n := (select count(*) from public.vendor_document_summary());
  if v_n < 1 then raise exception 'FAIL 6: the summary returned nothing'; end if;

  reset role;

  -- =================================================================
  -- 7. ESCROW — booking invoices
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  v_inv_esc := public.create_invoice_from_booking(v_booking);
  if public.create_invoice_from_booking(v_booking) <> v_inv_esc then
    raise exception 'FAIL 7: a second call created a second booking invoice';
  end if;
  select * into i from public.vendor_invoices where id = v_inv_esc;
  if i.payment_channel <> 'sinnapi_escrow' or i.total <> 500000 or i.client_id <> v_client then
    raise exception 'FAIL 7: booking invoice % / % / %', i.payment_channel, i.total, i.client_id;
  end if;

  -- its money cannot be edited
  perform public.save_invoice_draft(v_inv_esc, jsonb_build_object('notes', 'Thanks!',
    'items', jsonb_build_array(jsonb_build_object('description', 'Cheaper', 'quantity', 1, 'unit_price', 1))));
  select * into i from public.vendor_invoices where id = v_inv_esc;
  if i.total <> 500000 or i.notes <> 'Thanks!' then
    raise exception 'FAIL 7: booking invoice edit gave total % notes %', i.total, i.notes;
  end if;
  begin
    perform public.duplicate_invoice(v_inv_esc);
    raise exception 'FAIL 7: a booking invoice was duplicated';
  exception when others then
    if sqlerrm not like 'cannot_duplicate_booking_invoice%' then raise exception 'FAIL 7: got %', sqlerrm; end if;
  end;

  perform public.issue_invoice(v_inv_esc);
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv_esc, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 1000, 'payment_method', 'cash'));
    raise exception 'FAIL 7: a receipt was recorded against an escrow invoice';
  exception when others then
    if sqlerrm not like 'receipt_blocked_escrow%' then raise exception 'FAIL 7: got %', sqlerrm; end if;
  end;

  -- escrow funded → paid; fully refunded → back to issued
  insert into public.escrow_transactions (id, booking_id, client_id, vendor_id, currency, gross_amount, status)
  values (v_escrow, v_booking, v_client, v_vendor, 'UGX', 500000, 'funded');
  select * into i from public.vendor_invoices where id = v_inv_esc;
  if i.status <> 'paid' or i.amount_paid <> 500000 then
    raise exception 'FAIL 7: funded escrow left the invoice % paid %', i.status, i.amount_paid;
  end if;
  begin
    perform public.void_invoice(v_inv_esc, 'no');
    raise exception 'FAIL 7: a paid booking invoice was voided';
  exception when others then
    if sqlerrm not like 'invoice_paid_through_sinnapi%' then raise exception 'FAIL 7: got %', sqlerrm; end if;
  end;
  update public.escrow_transactions set status = 'refunded' where id = v_escrow;
  select * into i from public.vendor_invoices where id = v_inv_esc;
  if i.status <> 'issued' or i.amount_paid <> 0 or i.paid_at is not null then
    raise exception 'FAIL 7: refund left the invoice % paid %', i.status, i.amount_paid;
  end if;

  -- =================================================================
  -- 8. NUMBERS
  -- =================================================================
  create temp table t_nos on commit drop as
    select public._gen_document_no('SNP-INV') as no from generate_series(1, 5000);
  if exists (select 1 from t_nos where no !~ '^SNP-INV-[0-9]{8}$') then
    raise exception 'FAIL 8: a malformed number was generated';
  end if;
  select count(distinct no) into v_n from t_nos;
  if v_n < 4990 then raise exception 'FAIL 8: only % distinct numbers in 5000', v_n; end if;
  -- every digit appears in every position
  select count(*) into v_n from (
    select pos, count(distinct substr(no, 8 + pos, 1)) as d
      from t_nos, generate_series(1, 8) pos group by pos) x
   where x.d = 10;
  if v_n <> 8 then raise exception 'FAIL 8: some positions never produced some digits'; end if;

  -- =================================================================
  -- 9. EMAIL BOOKKEEPING (service-role functions)
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  update public.platform_settings set value = '2'::jsonb where key = 'document_email_daily_limit';

  begin
    perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv_reg, 'client_account', 's***@x',
      false, 'Invoice', null, 'wrong/path.pdf', null, gen_random_uuid(), v_owner);
    raise exception 'FAIL 9: a foreign attachment path was accepted';
  exception when others then
    if sqlerrm not like 'attachment_path_invalid%' then raise exception 'FAIL 9: got %', sqlerrm; end if;
  end;
  begin
    perform * from public.begin_document_delivery(v_vendor2, 'invoice', v_inv_reg, 'client_account', 's***@x',
      false, 'Invoice', null, v_vendor2 || '/invoice/' || v_inv_reg || '.pdf', null, gen_random_uuid(), v_owner2);
    raise exception 'FAIL 9: another vendor claimed a send of this invoice';
  exception when others then
    if sqlerrm not like 'not_found%' then raise exception 'FAIL 9: got %', sqlerrm; end if;
  end;
  begin
    perform * from public.begin_document_delivery(v_vendor, 'invoice', v_draft, 'client_account', 's***@x',
      false, 'Invoice', null, v_vendor || '/invoice/' || v_draft || '.pdf', null, gen_random_uuid(), v_owner);
    raise exception 'FAIL 9: a draft was sendable';
  exception when others then
    if sqlerrm not like 'document_not_sendable%' then raise exception 'FAIL 9: got %', sqlerrm; end if;
  end;

  v_key := gen_random_uuid();
  select * into v_del from public.begin_document_delivery(v_vendor, 'invoice', v_inv_reg, 'client_account', 's***@x',
    false, 'Invoice', null, v_vendor || '/invoice/' || v_inv_reg || '.pdf', repeat('a', 64), v_key, v_owner);
  if v_del.duplicate then raise exception 'FAIL 9: a first send was reported as a duplicate'; end if;
  select * into v_del from public.begin_document_delivery(v_vendor, 'invoice', v_inv_reg, 'client_account', 's***@x',
    false, 'Invoice', null, v_vendor || '/invoice/' || v_inv_reg || '.pdf', repeat('a', 64), v_key, v_owner);
  if not v_del.duplicate then raise exception 'FAIL 9: a repeated request key was not recognised'; end if;

  perform public.finish_document_delivery(v_del.delivery_id, true, null, '<msg@test>');
  if (select status from public.vendor_document_deliveries where id = v_del.delivery_id) <> 'sent' then
    raise exception 'FAIL 9: finish did not mark the delivery sent';
  end if;

  perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv_reg, 'client_account', 's***@x',
    false, 'Invoice', null, v_vendor || '/invoice/' || v_inv_reg || '.pdf', null, gen_random_uuid(), v_owner);
  begin
    perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv_reg, 'client_account', 's***@x',
      false, 'Invoice', null, v_vendor || '/invoice/' || v_inv_reg || '.pdf', null, gen_random_uuid(), v_owner);
    raise exception 'FAIL 9: the daily cap was not enforced';
  exception when others then
    if sqlerrm not like 'daily_email_limit_reached%' then raise exception 'FAIL 9: got %', sqlerrm; end if;
  end;

  -- the delivery functions are not callable by signed-in users
  set local role authenticated;
  begin
    perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv_reg, 'client_account', 's***@x',
      false, 'Invoice', null, v_vendor || '/invoice/' || v_inv_reg || '.pdf', null, gen_random_uuid(), v_owner);
    raise exception 'FAIL 9: authenticated could call begin_document_delivery';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- =================================================================
  -- 10. DRAFT DELETE is a soft delete
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform public.delete_invoice_draft(v_draft);
  if (select deleted_at from public.vendor_invoices where id = v_draft) is null then
    raise exception 'FAIL 10: the draft was not soft-deleted';
  end if;

  -- =================================================================
  -- 11. STORAGE — only real, issued documents of your own
  -- The test schema's storage.objects shim has no RLS of its own; switch it
  -- on (inside this rolled-back transaction) so the 1105g policies apply.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  v_draft := public.save_invoice_draft(null, jsonb_build_object('recipient_name', 'Storage draft',
    'items', jsonb_build_array(jsonb_build_object('description', 'A', 'quantity', 1, 'unit_price', 10))));
  execute 'alter table storage.objects enable row level security';
  execute 'grant select, insert, update on storage.objects to authenticated';
  set local role authenticated;

  insert into storage.objects (bucket_id, name) values ('financial-documents', v_vendor || '/invoice/' || v_inv_reg || '.pdf');

  begin
    insert into storage.objects (bucket_id, name) values ('financial-documents', v_vendor || '/invoice/' || gen_random_uuid() || '.pdf');
    raise exception 'FAIL 11: a file was stored under a made-up document id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('financial-documents', v_vendor || '/invoice/' || v_draft || '.pdf');
    raise exception 'FAIL 11: a file was stored for a draft';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('financial-documents', v_vendor || '/notes/' || v_inv_reg || '.pdf');
    raise exception 'FAIL 11: a file was stored outside the path shape';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', v_owner2::text, true);
  begin
    insert into storage.objects (bucket_id, name) values ('financial-documents', v_vendor || '/receipt/' || (v_rct ->> 'id') || '.pdf');
    raise exception 'FAIL 11: another vendor stored a file in this vendor''s folder';
  exception when insufficient_privilege then null;
  end;
  select count(*) into v_n from storage.objects where bucket_id = 'financial-documents';
  if v_n <> 0 then raise exception 'FAIL 11: another vendor can read % stored documents', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_client::text, true);
  select count(*) into v_n from storage.objects where bucket_id = 'financial-documents';
  if v_n <> 0 then raise exception 'FAIL 11: a client can read the stored PDFs directly'; end if;
  reset role;

  raise notice 'ALL ASSERTIONS PASSED (1105 financial documents)';
end$$;

rollback;
