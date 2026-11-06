-- =====================================================================
-- Sinnapi — 1106 overpaid invoices & "email it to me" test
--
-- Proves 1106a–b:
--   instalments  several receipts walk an invoice issued → partly paid → paid
--   overpayment  refused without `allow_overpayment`, recorded with it; the
--                invoice turns `overpaid` and its balance goes negative
--   settled      a paid / overpaid invoice takes an extra receipt only with
--                the flag
--   voids        voiding receipts walks overpaid back down the states
--   constraints  `overpaid` needs paid > total; standalone balances stay ≥ 0
--   self-send    `self` deliveries are logged but neither counted toward
--                nor stopped by the daily cap
--
-- Run after the whole chain (and 1105's file, which it does not depend on).
-- Everything rolls back; silent unless it fails.
-- =====================================================================

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_run    text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_owner  uuid := gen_random_uuid();
  v_vendor uuid := gen_random_uuid();
  v_inv    uuid;
  v_r1     jsonb;
  v_r2     jsonb;
  v_r3     jsonb;
  v_r4     jsonb;
  i        public.vendor_invoices;
  r        public.vendor_receipts;
  v_del    record;
  v_n      integer;
begin
  -- -----------------------------------------------------------------
  -- SEED — one vendor, one external invoice of UGX 300,000
  -- -----------------------------------------------------------------
  insert into auth.users (id, instance_id, email, aud, role, raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at, created_at, updated_at)
  values (v_owner, '00000000-0000-0000-0000-000000000000', 't1106-o-' || v_run || '@example.test',
          'authenticated', 'authenticated', '{}', '{"full_name":"Owner"}', now(), now(), now());
  insert into public.vendors (id, owner_id, business_name, slug, status, visibility)
  values (v_vendor, v_owner, 'Amani Events', 't1106-v-' || v_run, 'active', 'public');

  perform set_config('request.jwt.claim.sub', v_owner::text, true);

  v_inv := public.save_invoice_draft(null, jsonb_build_object(
    'recipient_name', 'Kato & Sons Ltd', 'currency', 'UGX',
    'items', jsonb_build_array(jsonb_build_object('description', 'Décor', 'quantity', 1, 'unit_price', 300000))));
  perform public.issue_invoice(v_inv);

  -- =================================================================
  -- 1. INSTALMENT — 100,000 of 300,000
  -- =================================================================
  v_r1 := public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
    'confirmed', true, 'amount', 100000, 'payment_method', 'cash'));
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.status, i.amount_paid, i.balance_due) is distinct from ('partially_paid'::public.invoice_status, 100000::numeric, 200000::numeric) then
    raise exception 'FAIL 1: after 100,000 the invoice is % / % / %', i.status, i.amount_paid, i.balance_due;
  end if;
  if v_r1 ->> 'invoice_status' <> 'partially_paid' then
    raise exception 'FAIL 1: record_receipt reported %', v_r1 ->> 'invoice_status';
  end if;

  -- =================================================================
  -- 2. OVERPAYMENT — 250,000 against 200,000 owed
  -- =================================================================
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 250000, 'payment_method', 'cash'));
    raise exception 'FAIL 2: an overpayment was recorded without allow_overpayment';
  exception when others then
    if sqlerrm not like 'amount_exceeds_balance%' then raise exception 'FAIL 2: got %', sqlerrm; end if;
  end;
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 250000, 'payment_method', 'cash', 'allow_overpayment', false));
    raise exception 'FAIL 2: allow_overpayment=false still overpaid';
  exception when others then
    if sqlerrm not like 'amount_exceeds_balance%' then raise exception 'FAIL 2: got %', sqlerrm; end if;
  end;

  v_r2 := public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
    'confirmed', true, 'amount', 250000, 'payment_method', 'bank_transfer', 'allow_overpayment', true));
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.status, i.amount_paid, i.balance_due) is distinct from ('overpaid'::public.invoice_status, 350000::numeric, (-50000)::numeric)
     or i.paid_at is null then
    raise exception 'FAIL 2: overpaid invoice is % / % / % paid_at %', i.status, i.amount_paid, i.balance_due, i.paid_at;
  end if;
  select * into r from public.vendor_receipts where id = (v_r2 ->> 'id')::uuid;
  if (r.balance_before, r.balance_after) is distinct from (200000::numeric, (-50000)::numeric) then
    raise exception 'FAIL 2: overpaying receipt balances % → %', r.balance_before, r.balance_after;
  end if;

  -- =================================================================
  -- 3. A FURTHER RECEIPT ON A SETTLED INVOICE
  -- =================================================================
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 10000, 'payment_method', 'cash'));
    raise exception 'FAIL 3: an overpaid invoice took more without the flag';
  exception when others then
    if sqlerrm not like 'amount_exceeds_balance%' then raise exception 'FAIL 3: got %', sqlerrm; end if;
  end;
  v_r3 := public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
    'confirmed', true, 'amount', 10000, 'payment_method', 'cash', 'allow_overpayment', true));
  select * into r from public.vendor_receipts where id = (v_r3 ->> 'id')::uuid;
  select * into i from public.vendor_invoices where id = v_inv;
  if (r.balance_before, r.balance_after, i.amount_paid, i.balance_due)
     is distinct from ((-50000)::numeric, (-60000)::numeric, 360000::numeric, (-60000)::numeric) then
    raise exception 'FAIL 3: extra receipt % → %, invoice % / %', r.balance_before, r.balance_after, i.amount_paid, i.balance_due;
  end if;

  -- =================================================================
  -- 4. VOIDS walk the state back down
  -- =================================================================
  perform public.void_receipt((v_r2 ->> 'id')::uuid, 'Bank transfer bounced');
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.status, i.amount_paid) is distinct from ('partially_paid'::public.invoice_status, 110000::numeric)
     or i.paid_at is not null then
    raise exception 'FAIL 4: after voiding the big receipt the invoice is % / % paid_at %', i.status, i.amount_paid, i.paid_at;
  end if;

  -- exactly the rest → paid, not overpaid
  v_r4 := public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
    'confirmed', true, 'amount', 190000, 'payment_method', 'mtn_momo'));
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.status, i.balance_due) is distinct from ('paid'::public.invoice_status, 0::numeric) then
    raise exception 'FAIL 4: exact settlement gave % / %', i.status, i.balance_due;
  end if;
  begin
    perform public.record_receipt(jsonb_build_object('invoice_id', v_inv, 'idempotency_key', gen_random_uuid(),
      'confirmed', true, 'amount', 1, 'payment_method', 'cash'));
    raise exception 'FAIL 4: a paid invoice took more without the flag';
  exception when others then
    if sqlerrm not like 'amount_exceeds_balance%' then raise exception 'FAIL 4: got %', sqlerrm; end if;
  end;

  -- void everything → issued
  perform public.void_receipt((v_r1 ->> 'id')::uuid, 'test');
  perform public.void_receipt((v_r3 ->> 'id')::uuid, 'test');
  perform public.void_receipt((v_r4 ->> 'id')::uuid, 'test');
  select * into i from public.vendor_invoices where id = v_inv;
  if (i.status, i.amount_paid) is distinct from ('issued'::public.invoice_status, 0::numeric) then
    raise exception 'FAIL 4: with every receipt void the invoice is % / %', i.status, i.amount_paid;
  end if;

  -- =================================================================
  -- 5. CONSTRAINTS
  -- =================================================================
  begin
    update public.vendor_invoices set status = 'overpaid', amount_paid = 300000 where id = v_inv;
    raise exception 'FAIL 5: overpaid was stored with paid = total';
  exception when check_violation then null;
  end;
  begin
    perform public.record_receipt(jsonb_build_object('idempotency_key', gen_random_uuid(), 'confirmed', true,
      'recipient_name', 'Walk-in', 'currency', 'UGX', 'amount', 5000, 'payment_method', 'cash',
      'description', 'Deposit', 'outstanding_balance', -1));
    raise exception 'FAIL 5: a standalone receipt took a negative balance';
  exception when others then
    if sqlerrm not like 'balance_invalid%' then raise exception 'FAIL 5: got %', sqlerrm; end if;
  end;

  -- =================================================================
  -- 6. SELF-SEND and the daily cap (limit 1)
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  update public.platform_settings set value = '1'::jsonb where key = 'document_email_daily_limit';

  perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv, 'address', 'kato@example.test',
    false, 'Invoice', null, v_vendor || '/invoice/' || v_inv || '.pdf', null, gen_random_uuid(), v_owner);
  begin
    perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv, 'address', 'kato@example.test',
      false, 'Invoice', null, v_vendor || '/invoice/' || v_inv || '.pdf', null, gen_random_uuid(), v_owner);
    raise exception 'FAIL 6: the cap no longer applies to clients';
  exception when others then
    if sqlerrm not like 'daily_email_limit_reached%' then raise exception 'FAIL 6: got %', sqlerrm; end if;
  end;

  -- over the cap, a copy to the vendor still goes — twice — and is logged
  select * into v_del from public.begin_document_delivery(v_vendor, 'invoice', v_inv, 'self', 'owner@example.test',
    false, 'Copy: Invoice', null, v_vendor || '/invoice/' || v_inv || '.pdf', null, gen_random_uuid(), v_owner);
  perform * from public.begin_document_delivery(v_vendor, 'invoice', v_inv, 'self', 'owner@example.test',
    false, 'Copy: Invoice', null, v_vendor || '/invoice/' || v_inv || '.pdf', null, gen_random_uuid(), v_owner);
  select count(*) into v_n from public.vendor_document_deliveries
   where invoice_id = v_inv and recipient_kind = 'self';
  if v_n <> 2 or v_del.duplicate then
    raise exception 'FAIL 6: expected 2 logged self-sends, got %', v_n;
  end if;

  raise notice 'ALL ASSERTIONS PASSED (1106 invoice overpayment & self-send)';
end$$;

rollback;
