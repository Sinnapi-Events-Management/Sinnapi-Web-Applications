-- =====================================================================
-- Sinnapi — 0904 attribution test
--
-- THE ONE THING THIS PROVES
-- A payment that flips to `succeeded` because a Pesapal IPN said so records
-- `actor_kind = 'psp_webhook'` and NOT 'system'. Before 0904a that was
-- impossible: `tg_write_audit` wrote `auth.uid()`, which is null under the
-- IPN, and the console rendered every such row as "system" alongside the
-- reconciliation sweep and every cron in the database.
--
-- Four callers drive the same `record_payment_result`, and each must be
-- distinguishable from the other three afterwards:
--
--   the client opening a checkout        -> user
--   the Pesapal IPN applying a result    -> psp_webhook / pesapal_ipn
--   the hourly sweep resolving a stuck   -> reconciliation / payment-reconciliation
--     payment
--   a signed-in caller CLAIMING to be    -> user  (the claim is discarded)
--     the IPN
--
-- Run against a database with the full migration chain applied. Everything it
-- writes is rolled back at the end and every id is fresh per run, so it can be
-- run repeatedly against any database. Raises on the first failed assertion and
-- is silent otherwise.
-- =====================================================================

\set ON_ERROR_STOP on

-- One transaction for the whole file; see the note at the foot.
begin;

do $$
declare
  -- Fresh ids and a fresh suffix every run. The rollback at the foot means
  -- nothing survives anyway, but a test that also cannot collide with a
  -- PREVIOUS run's leftovers is a test that can be pointed at any database.
  -- That matters more here than it looks: `profiles`, `vendors` and `bookings`
  -- are all SOFT-deleted, so fixtures removed by hand leave rows behind that a
  -- fixed-id re-seed then duplicates.
  v_run      text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_client   uuid := gen_random_uuid();
  v_vendor_o uuid := gen_random_uuid();
  v_vendor   uuid := gen_random_uuid();
  v_booking1 uuid := gen_random_uuid();
  v_booking2 uuid := gen_random_uuid();
  v_pay1     uuid;
  v_pay2     uuid;
  v_corr1    uuid;
  r          record;
  v_kind     audit_actor_kind;
  v_label    text;
  v_source   text;
  v_ip       inet;
  v_n        integer;
begin
  -- -----------------------------------------------------------------
  -- SEED. `auth.users` only — a trigger creates the `profiles` row and mints
  -- its public id, so inserting profiles directly is rejected by the public-id
  -- registry as a duplicate.
  -- -----------------------------------------------------------------
  insert into auth.users (id, instance_id, email, aud, role,
                          raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at, created_at, updated_at)
  values (v_client, '00000000-0000-0000-0000-000000000000',
          't0904-client-' || v_run || '@example.test', 'authenticated', 'authenticated',
          '{}', '{"full_name":"Test Client 0904"}', now(), now(), now()),
         (v_vendor_o, '00000000-0000-0000-0000-000000000000',
          't0904-vendor-' || v_run || '@example.test', 'authenticated', 'authenticated',
          '{}', '{"full_name":"Test Vendor 0904"}', now(), now(), now());

  insert into public.vendors (id, owner_id, business_name, slug, status, visibility)
  values (v_vendor, v_vendor_o, 'Test Vendor 0904', 't0904-vendor-' || v_run, 'active', 'public');

  -- Two bookings: one for the IPN path, one for the reconciliation path.
  -- `reference_no` is overwritten by a trigger, so the value here is a
  -- placeholder rather than something to search on later.
  insert into public.bookings (id, vendor_id, client_id, reference_no, event_date, status,
                               payment_type, payment_terms_status, advance_terms_accepted_at,
                               amount, currency)
  values (v_booking1, v_vendor, v_client, 'T0904-1-' || v_run, current_date + 30, 'confirmed',
          'escrow', 'accepted', now(), 400000, 'UGX'),
         (v_booking2, v_vendor, v_client, 'T0904-2-' || v_run, current_date + 45, 'confirmed',
          'escrow', 'accepted', now(), 250000, 'UGX');

  -- =================================================================
  -- 1. THE CLIENT OPENS A CHECKOUT.
  --
  -- `create-payment` runs `activate_escrow` under the caller's own JWT, so
  -- this is the one path in the whole flow that has a real `auth.uid()`.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_client::text, true);

  select payment_id, correlation_id into v_pay1, v_corr1
    from public.activate_escrow(v_booking1, 'pesapal', 'mtn_momo', 't0904-key-1-' || v_run,
      jsonb_build_object('source', 'create-payment'));

  if v_pay1 is null then raise exception 'FAIL: activate_escrow returned no payment'; end if;
  if v_corr1 is null then
    raise exception 'FAIL: activate_escrow returned no correlation id — trg_payment_correlation did not mint one';
  end if;

  select a.actor_kind, a.source into v_kind, v_source
    from public.audit_logs a
   where a.entity_type = 'payments' and a.entity_id = v_pay1 and a.action = 'insert_payments';

  if v_kind is distinct from 'user' then
    raise exception 'FAIL: a client checkout was attributed as %, expected user', v_kind;
  end if;
  if v_source is distinct from 'create-payment' then
    raise exception 'FAIL: checkout source was %, expected create-payment', v_source;
  end if;

  -- The correlation id must reach the escrow's audit row too, not just the
  -- payment's: they are written in one transaction and are one story.
  if not exists (
    select 1 from public.audit_logs a
     where a.entity_type = 'escrow_transactions' and a.correlation_id = v_corr1) then
    raise exception 'FAIL: the escrow insert is not on the checkout''s correlation id';
  end if;

  -- =================================================================
  -- 2. THE IPN. No JWT at all — this is service_role, exactly as
  -- `psp-pesapal-webhook` reaches PostgREST.
  --
  -- THE ASSERTION THE WHOLE MIGRATION SET EXISTS FOR.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  perform public._clear_payment_context();

  perform public.record_payment_result(
    v_pay1, 'succeeded', 'T0904-TRK-1-' || v_run, null,
    jsonb_build_object(
      'actor_kind',     'psp_webhook',
      'actor_label',    'pesapal_ipn',
      'source',         'psp-pesapal-webhook',
      'correlation_id', v_corr1,
      'ip',             '197.239.1.1',
      'user_agent',     'Pesapal-IPN/1.0'));

  select a.actor_kind, a.actor_label, a.source, a.ip_address
    into v_kind, v_label, v_source, v_ip
    from public.audit_logs a
   where a.entity_type = 'payments' and a.entity_id = v_pay1
     and a.action = 'update_payments'
     and a.after ->> 'status' = 'succeeded';

  if v_kind is null then
    raise exception 'FAIL: the IPN''s payment transition wrote no audit row at all';
  end if;
  if v_kind = 'system' then
    raise exception
      'FAIL: an IPN-driven payment transition is still attributed to ''system'' — '
      'this is the exact defect 0904a was written to fix';
  end if;
  if v_kind <> 'psp_webhook' then
    raise exception 'FAIL: the IPN was attributed as %, expected psp_webhook', v_kind;
  end if;
  if v_label is distinct from 'pesapal_ipn' then
    raise exception 'FAIL: the IPN''s actor_label was %, expected pesapal_ipn', v_label;
  end if;
  if v_source is distinct from 'psp-pesapal-webhook' then
    raise exception 'FAIL: the IPN''s source was %, expected psp-pesapal-webhook', v_source;
  end if;
  -- `ip_address` has existed on this table since 0009 and, before 0904a, was
  -- written by nothing except the auth trail.
  if v_ip is distinct from '197.239.1.1'::inet then
    raise exception 'FAIL: the IPN''s ip_address was %, expected 197.239.1.1', v_ip;
  end if;

  -- The attribution must survive one level down. `record_payment_result` calls
  -- `fund_escrow` with no context of its own; if a null context reset the
  -- GUCs, the escrow would be back to 'system' while the payment looked right.
  --
  -- `fund_escrow` lands on 'held' or 'awaiting_advance' depending on whether
  -- the event is already inside its advance-release window, so the assertion
  -- is on the funded transition rather than on one of the two names for it.
  select a.actor_kind into v_kind
    from public.audit_logs a
   where a.entity_type = 'escrow_transactions'
     and a.correlation_id = v_corr1
     and a.action = 'update_escrow_transactions'
     and a.before ->> 'status' = 'initiated'
     and a.after  ->> 'status' in ('held', 'awaiting_advance');

  if v_kind is distinct from 'psp_webhook' then
    raise exception
      'FAIL: escrow funding under the IPN was attributed as %, expected psp_webhook — '
      'a nested call cleared the context', v_kind;
  end if;

  -- The domain stream, which had the same blind spot (escrow_notify wrote
  -- auth.uid() alone until 0904b).
  select ev.actor_kind into v_kind
    from public.escrow_events ev
   where ev.correlation_id = v_corr1 and ev.event_type = 'funded';

  if v_kind is distinct from 'psp_webhook' then
    raise exception 'FAIL: the funded escrow_event was attributed as %, expected psp_webhook', v_kind;
  end if;

  -- =================================================================
  -- 3. THE RECONCILIATION SWEEP, on the second booking — and it must be
  -- distinguishable from the IPN, which is the practical point: same RPC,
  -- same resulting status, different incident.
  --
  -- It passes NO correlation id, because it did not open the checkout. It has
  -- to adopt the one already on the payment row, or its postings would start
  -- a second story about the same money.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_client::text, true);
  select payment_id into v_pay2
    from public.activate_escrow(v_booking2, 'pesapal', 'mtn_momo', 't0904-key-2-' || v_run,
      jsonb_build_object('source', 'create-payment'));

  perform set_config('request.jwt.claim.sub', '', true);
  perform public._clear_payment_context();

  perform public.record_payment_result(
    v_pay2, 'succeeded', 'T0904-TRK-2-' || v_run, null,
    jsonb_build_object(
      'actor_kind',  'reconciliation',
      'actor_label', 'payment-reconciliation',
      'source',      'payment-reconciliation'));

  select a.actor_kind, a.actor_label, a.correlation_id
    into v_kind, v_label, v_corr1
    from public.audit_logs a
   where a.entity_type = 'payments' and a.entity_id = v_pay2
     and a.action = 'update_payments' and a.after ->> 'status' = 'succeeded';

  if v_kind is distinct from 'reconciliation' then
    raise exception 'FAIL: the sweep was attributed as %, expected reconciliation', v_kind;
  end if;
  if v_label is distinct from 'payment-reconciliation' then
    raise exception 'FAIL: the sweep''s actor_label was %', v_label;
  end if;
  if v_corr1 is distinct from (select p.correlation_id from public.payments p where p.id = v_pay2) then
    raise exception
      'FAIL: the sweep did not adopt the payment''s existing correlation id — '
      'its work would appear as a separate trace from the checkout it finished';
  end if;

  -- =================================================================
  -- 4. THE FORGERY ATTEMPT.
  --
  -- `request_refund` and `approve_escrow_release` are granted to
  -- `authenticated` and called from a browser, so `p_context` is attacker-
  -- controlled on those paths. A signed-in caller claiming to be the IPN must
  -- be recorded as themselves.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_client::text, true);
  perform public._clear_payment_context();

  perform public._set_payment_context(
    jsonb_build_object(
      'actor_kind',  'psp_webhook',
      'actor_label', 'pesapal_ipn',
      'ip',          '1.2.3.4',
      'user_agent',  'forged'),
    'approve_refund');

  select c.ctx_actor_kind, c.ctx_actor_label, c.ctx_actor_id, c.ctx_ip
    into v_kind, v_label, v_pay1, v_ip
    from public._payment_context() c;

  if v_kind <> 'user' then
    raise exception
      'FAIL: a signed-in caller successfully claimed actor_kind %, forging the audit trail', v_kind;
  end if;
  if v_label is not null then
    raise exception 'FAIL: a signed-in caller''s actor_label (%) was not discarded', v_label;
  end if;
  if v_ip is not null then
    raise exception 'FAIL: a signed-in caller''s self-reported ip (%) was not discarded', v_ip;
  end if;
  if v_pay1 is distinct from v_client then
    raise exception 'FAIL: the clamped actor is %, expected the caller %', v_pay1, v_client;
  end if;

  -- =================================================================
  -- 4b. A SERVICE-ROLE CALLER MAY ATTRIBUTE TO A PERSON — BY NAMING THEM.
  --
  -- `create-payment` depends on this. It authenticates the payer with
  -- `requireUser` and then does its privileged half — attaching the provider
  -- reference, failing a payment the PSP refused — through the admin client,
  -- where the database sees no `auth.uid()`. Those writes were caused by a
  -- person, and recording them as 'system' would be as wrong as recording the
  -- IPN that way.
  --
  -- The constraint is that the claim has to be specific: a bare 'user' with
  -- nobody named is a claim with no content and is refused.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  perform public._clear_payment_context();
  perform public._set_payment_context(
    jsonb_build_object('actor_kind', 'user', 'actor_id', v_client,
                       'source', 'create-payment'),
    'attach_payment_provider_ref');

  select c.ctx_actor_kind, c.ctx_actor_id into v_kind, v_pay1
    from public._payment_context() c;

  if v_kind <> 'user' or v_pay1 is distinct from v_client then
    raise exception
      'FAIL: a service-role caller naming the payer was recorded as % / % — '
      'create-payment''s privileged writes would read as ''system''', v_kind, v_pay1;
  end if;

  -- And the same claim WITHOUT a name is refused.
  perform public._clear_payment_context();
  perform public._set_payment_context(
    jsonb_build_object('actor_kind', 'user', 'source', 'create-payment'), 'x');

  select c.ctx_actor_kind into v_kind from public._payment_context() c;
  if v_kind <> 'system' then
    raise exception
      'FAIL: an unnamed claim of actor_kind ''user'' from a service-role caller '
      'resolved to % rather than system', v_kind;
  end if;

  -- =================================================================
  -- 5. A MALFORMED CONTEXT MUST DEGRADE, NEVER RAISE.
  --
  -- Attribution is telemetry hanging off the side of a payment. A bad uuid in
  -- an Edge Function's context must not become the reason a settlement fails.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  perform public._clear_payment_context();
  perform public._set_payment_context(
    jsonb_build_object('actor_kind', 'nonsense', 'correlation_id', 'not-a-uuid',
                       'ip', '999.999.999.999'),
    'x');

  select c.ctx_actor_kind, c.ctx_correlation_id, c.ctx_ip into v_kind, v_corr1, v_ip
    from public._payment_context() c;

  if v_kind <> 'system' then
    raise exception 'FAIL: an unknown actor_kind resolved to % rather than system', v_kind;
  end if;
  if v_corr1 is not null or v_ip is not null then
    raise exception 'FAIL: a malformed correlation id or ip was not discarded';
  end if;

  -- =================================================================
  -- 6. THE FOUR CALLERS ARE ACTUALLY DISTINGUISHABLE.
  --
  -- The assertions above check each in isolation. This is the question an
  -- investigator asks: over the rows this test produced, how many kinds are
  -- there? Before 0904a the answer was one.
  -- =================================================================
  select count(distinct a.actor_kind) into v_n
    from public.audit_logs a
   where a.entity_type in ('payments', 'escrow_transactions')
     and a.entity_id in (
       select p.id from public.payments p where p.booking_id in (v_booking1, v_booking2)
       union all
       select t.id from public.escrow_transactions t where t.booking_id in (v_booking1, v_booking2));

  if v_n < 3 then
    raise exception
      'FAIL: only % distinct actor_kind(s) across a client checkout, an IPN and a '
      'reconciliation sweep — they are still collapsing into one bucket', v_n;
  end if;

  -- =================================================================
  -- 7. RETENTION IS NOT WIDENED.
  --
  -- The nightly purge takes `entity_type = 'auth'` and nothing else. None of
  -- the rows this test wrote may be reachable by it, and the 7-year hold on
  -- the audit trail must still be in force.
  -- =================================================================
  select count(*) into v_n
    from public.audit_logs a
   where a.correlation_id is not null and a.entity_type = 'auth';
  if v_n > 0 then
    raise exception
      'FAIL: % correlated audit row(s) carry entity_type = ''auth'' and would be '
      'deleted by the 180-day purge instead of held for seven years', v_n;
  end if;

  if not exists (select 1 from public.data_retention_policies
                  where data_category = 'audit_logs' and legal_hold) then
    raise exception 'FAIL: the audit_logs legal hold is no longer in force';
  end if;

  raise notice 'ALL ASSERTIONS PASSED (0904 attribution)';
end$$;

-- ---------------------------------------------------------------------
-- NO CLEAN-UP SECTION, AND THAT IS THE POINT.
--
-- Everything above runs inside the single transaction opened at the top of
-- this file, and the `rollback` below discards all of it — the seeded users,
-- the bookings, the payments, the ledger legs and every audit row they
-- produced. Nothing reaches the database that has to be taken back out.
--
-- Deleting the fixtures instead does not work here, and the failure is
-- instructive: `bookings` and `vendors` are SOFT-deleted (a trigger sets
-- `deleted_at` and cancels the physical delete), while the public-id registry
-- keeps its row either way — so a second run collides on `ux_public_id_row`
-- rather than re-seeding. The append-only guards on `ledger_entries`,
-- `escrow_events` and `audit_logs` would also have to be lifted and replaced
-- around the delete, which means a test that leaves an audit trail writable if
-- it fails halfway.
--
-- A rollback has none of those problems and is exactly as thorough.
-- ---------------------------------------------------------------------
rollback;
