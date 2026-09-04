-- =====================================================================
-- Sinnapi — 0904 correlation trace test
--
-- THE ACCEPTANCE TEST
-- Given one correlation id, a single query returns the complete life of that
-- transaction, in order, across all seven tables:
--
--   payments · audit_logs · payment_logs · payment_events · ledger_entries
--   escrow_events · outbox
--
-- Before 0904b that query did not exist and could not be written. The seven
-- tables were joined by four different keys, and two of them — an IPN's log
-- row and its idempotency-gate row — are written BEFORE the payment is
-- identified, so they had no id to be joined on at all. `get_payment_admin`
-- reverse-engineers the link from `payload->>'orderTrackingId'` (0903j:325),
-- which is the tell that the key was missing.
--
-- This walks a full escrow checkout — client opens it, Pesapal's IPN settles
-- it — writing the same rows the Edge Functions write, then asks for the trace
-- as an admin and checks that every stream is present, ordered, and
-- attributed.
--
-- Everything is rolled back at the end and every id is fresh per run.
-- =====================================================================

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_run      text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_client   uuid := gen_random_uuid();
  v_vendor_o uuid := gen_random_uuid();
  v_admin    uuid := gen_random_uuid();
  v_vendor   uuid := gen_random_uuid();
  v_booking  uuid := gen_random_uuid();
  v_pay      uuid;
  v_escrow   uuid;
  v_corr     uuid;
  v_role     uuid;
  v_streams  text[];
  v_prev     timestamptz;
  v_n        integer;
  r          record;
begin
  -- -----------------------------------------------------------------
  -- SEED: a client, a vendor owner, and an admin who can actually read the
  -- trace. The admin matters — `get_payment_trace` is gated on
  -- `payments.read` for the payment story and on `finance.read` OR
  -- `finance.reconcile` for the accounting streams, so a test run without a
  -- role would silently receive four streams instead of seven and pass a
  -- weaker assertion than it looks like it is making.
  -- -----------------------------------------------------------------
  insert into auth.users (id, instance_id, email, aud, role,
                          raw_app_meta_data, raw_user_meta_data,
                          email_confirmed_at, created_at, updated_at)
  values (v_client, '00000000-0000-0000-0000-000000000000',
          'tr-client-' || v_run || '@example.test', 'authenticated', 'authenticated',
          '{}', '{"full_name":"Trace Client"}', now(), now(), now()),
         (v_vendor_o, '00000000-0000-0000-0000-000000000000',
          'tr-vendor-' || v_run || '@example.test', 'authenticated', 'authenticated',
          '{}', '{"full_name":"Trace Vendor"}', now(), now(), now()),
         (v_admin, '00000000-0000-0000-0000-000000000000',
          'tr-admin-' || v_run || '@example.test', 'authenticated', 'authenticated',
          '{}', '{"full_name":"Trace Admin"}', now(), now(), now());

  select id into v_role from public.roles where key = 'super_admin';
  if v_role is null then raise exception 'FAIL: the super_admin role is missing'; end if;
  insert into public.user_roles (profile_id, role_id) values (v_admin, v_role);

  insert into public.vendors (id, owner_id, business_name, slug, status, visibility)
  values (v_vendor, v_vendor_o, 'Trace Vendor', 'tr-vendor-' || v_run, 'active', 'public');

  insert into public.bookings (id, vendor_id, client_id, reference_no, event_date, status,
                               payment_type, payment_terms_status, advance_terms_accepted_at,
                               amount, currency)
  values (v_booking, v_vendor, v_client, 'TR-' || v_run, current_date + 21, 'confirmed',
          'escrow', 'accepted', now(), 750000, 'UGX');

  -- =================================================================
  -- 1. THE CLIENT OPENS A CHECKOUT.
  -- This is where the trace is minted, and every row that follows in this
  -- story has to end up on it.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_client::text, true);
  select payment_id, escrow_id, correlation_id into v_pay, v_escrow, v_corr
    from public.activate_escrow(v_booking, 'pesapal', 'mtn_momo',
      'tr-key-' || v_run, jsonb_build_object('source', 'create-payment'));

  if v_corr is null then raise exception 'FAIL: no correlation id was minted'; end if;

  -- =================================================================
  -- 2. WHAT create-payment WRITES after the PSP order exists.
  -- The Edge Function's own audit row and its raw-traffic row, both carrying
  -- the trace. Written here directly because there is no Deno runtime in a
  -- SQL test; the shape is exactly what `_shared/audit.ts` produces.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  perform public._clear_payment_context();

  perform public.attach_payment_provider_ref(
    v_pay, 'TR-TRK-' || v_run, 'https://pay.pesapal.test/' || v_run,
    jsonb_build_object('actor_kind', 'user', 'source', 'create-payment',
                       'correlation_id', v_corr));

  insert into public.payment_logs (payment_id, provider, direction, event_type,
                                   http_status, payload, correlation_id)
  values (v_pay, 'pesapal', 'request', 'checkout_created', 200,
          jsonb_build_object('providerRef', 'TR-TRK-' || v_run,
                             'amount', 750000, 'currency', 'UGX'),
          v_corr);

  insert into public.audit_logs (actor_kind, actor_label, source, action,
                                 entity_type, entity_id, after, correlation_id)
  values ('user', null, 'create-payment', 'checkout_created',
          'payments', v_pay,
          jsonb_build_object('provider', 'pesapal', 'method', 'mtn_momo'), v_corr);

  -- =================================================================
  -- 3. THE IPN ARRIVES, is gated, and settles the payment.
  -- =================================================================
  insert into public.payment_logs (provider, direction, event_type, payload,
                                   signature_valid, correlation_id)
  values ('pesapal', 'webhook', 'ipn',
          jsonb_build_object('orderTrackingId', 'TR-TRK-' || v_run,
                             'merchantRef', v_pay),
          true, v_corr);

  insert into public.payment_events (provider, event_id, event_type, payment_id,
                                     correlation_id)
  values ('pesapal', 'TR-TRK-' || v_run, 'IPNCHANGE', v_pay, v_corr);

  insert into public.audit_logs (actor_kind, actor_label, source, action,
                                 entity_type, entity_id, after, correlation_id,
                                 ip_address)
  values ('psp_webhook', 'pesapal_ipn', 'psp-pesapal-webhook', 'ipn_received',
          'payments', v_pay, jsonb_build_object('orderTrackingId', 'TR-TRK-' || v_run),
          v_corr, '197.239.1.1');

  perform public.record_payment_result(
    v_pay, 'succeeded', 'TR-TRK-' || v_run, null,
    jsonb_build_object('actor_kind', 'psp_webhook', 'actor_label', 'pesapal_ipn',
                       'source', 'psp-pesapal-webhook', 'correlation_id', v_corr,
                       'ip', '197.239.1.1'));

  update public.payment_events
     set processed_at = now(), outcome = 'succeeded'
   where provider = 'pesapal' and event_id = 'TR-TRK-' || v_run;

  -- =================================================================
  -- 4. THE TRACE. One query, as the admin.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  select array_agg(distinct t.stream), count(*)
    into v_streams, v_n
    from public.get_payment_trace(v_corr) t;

  if v_n = 0 then
    raise exception 'FAIL: get_payment_trace returned nothing for a correlation id that exists';
  end if;

  -- All seven streams. Named individually rather than counted, so a failure
  -- says WHICH table fell off the trace.
  if not ('payment'      = any(v_streams)) then raise exception 'FAIL: payments missing from the trace'; end if;
  if not ('audit'        = any(v_streams)) then raise exception 'FAIL: audit_logs missing from the trace'; end if;
  if not ('psp_traffic'  = any(v_streams)) then raise exception 'FAIL: payment_logs missing from the trace'; end if;
  if not ('delivery'     = any(v_streams)) then raise exception 'FAIL: payment_events missing from the trace'; end if;
  if not ('ledger'       = any(v_streams)) then raise exception 'FAIL: ledger_entries missing from the trace'; end if;
  if not ('escrow'       = any(v_streams)) then raise exception 'FAIL: escrow_events missing from the trace'; end if;
  if not ('notification' = any(v_streams)) then raise exception 'FAIL: outbox missing from the trace'; end if;

  -- IN ORDER. The whole value of one axis is that it is sorted; an unordered
  -- union of seven tables is seven queries with extra steps.
  v_prev := '-infinity'::timestamptz;
  for r in select * from public.get_payment_trace(v_corr) loop
    if r.occurred_at < v_prev then
      raise exception 'FAIL: the trace is not ordered — % came after %', r.occurred_at, v_prev;
    end if;
    v_prev := r.occurred_at;
  end loop;

  -- ATTRIBUTED. The trace must show both actors, or it has told the story
  -- without saying who did any of it.
  if not exists (select 1 from public.get_payment_trace(v_corr) t
                  where t.actor_kind = 'user') then
    raise exception 'FAIL: no row on the trace is attributed to the client';
  end if;
  if not exists (select 1 from public.get_payment_trace(v_corr) t
                  where t.actor_kind = 'psp_webhook' and t.actor_label = 'pesapal_ipn') then
    raise exception 'FAIL: no row on the trace is attributed to the Pesapal IPN';
  end if;
  -- The payer's name, which is why this is an RPC: a `payments.read` holder
  -- cannot reach `profiles` from the client.
  if not exists (select 1 from public.get_payment_trace(v_corr) t
                  where t.actor_name = 'Trace Client') then
    raise exception 'FAIL: the trace resolved no actor name';
  end if;

  -- THE LEDGER BALANCES ON THE TRACE. `fund_escrow` posts two legs; reading
  -- them off the correlation id rather than off the escrow is the point.
  select count(*) into v_n
    from public.get_payment_trace(v_corr) t where t.stream = 'ledger';
  if v_n < 2 then
    raise exception 'FAIL: % ledger leg(s) on the trace, expected both sides of the entry', v_n;
  end if;

  -- =================================================================
  -- 5. THE HANDLES SUPPORT ACTUALLY HAS.
  -- Nobody arrives holding a correlation id. Every identifier a person can
  -- read out must resolve to the same trace.
  -- =================================================================
  if (select correlation_id from public.resolve_correlation_id(v_pay::text) limit 1)
     is distinct from v_corr then
    raise exception 'FAIL: a payment id does not resolve to its correlation id';
  end if;
  if (select correlation_id from public.resolve_correlation_id('TR-TRK-' || v_run) limit 1)
     is distinct from v_corr then
    raise exception 'FAIL: a provider reference does not resolve to its correlation id';
  end if;
  if (select correlation_id from public.resolve_correlation_id('tr-key-' || v_run) limit 1)
     is distinct from v_corr then
    raise exception 'FAIL: a client idempotency key does not resolve to its correlation id';
  end if;
  if (select correlation_id
        from public.resolve_correlation_id(
               (select reference_no from public.bookings where id = v_booking)) limit 1)
     is distinct from v_corr then
    raise exception 'FAIL: a booking reference does not resolve to its correlation id';
  end if;
  -- A handle that matches nothing returns nothing rather than everything.
  if exists (select 1 from public.resolve_correlation_id('no-such-handle-' || v_run)) then
    raise exception 'FAIL: an unknown handle resolved to a trace';
  end if;

  -- =================================================================
  -- 6. THE AUDIT SEARCH the console reads through.
  -- =================================================================
  if ((select public.search_audit_logs(p_correlation => v_corr)) -> 'total')::text::integer < 3 then
    raise exception 'FAIL: search_audit_logs found fewer than 3 rows for this trace';
  end if;

  select ((public.search_audit_logs(p_actor_kind => 'psp_webhook', p_correlation => v_corr))
          -> 'total')::text::integer into v_n;
  if v_n < 1 then
    raise exception 'FAIL: the actor_kind filter found no psp_webhook rows on a trace that has them';
  end if;

  -- The filter must actually filter. Same trace, a kind that is not on it.
  select ((public.search_audit_logs(p_actor_kind => 'cron', p_correlation => v_corr))
          -> 'total')::text::integer into v_n;
  if v_n <> 0 then
    raise exception 'FAIL: the actor_kind filter returned % cron rows for a trace with none', v_n;
  end if;

  -- An unknown kind is refused rather than ignored: silently showing every
  -- row while the toolbar says one kind is selected is the worst outcome.
  begin
    perform public.search_audit_logs(p_actor_kind => 'nonsense');
    raise exception 'FAIL: search_audit_logs accepted an unknown actor_kind';
  exception when others then
    if sqlerrm not like 'unknown_actor_kind%' then raise; end if;
  end;

  -- =================================================================
  -- 7. REDACTION ON THE WAY OUT.
  -- A pre-helper log row carrying a secret must not come back through the
  -- trace, whatever wrote it.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.payment_logs (payment_id, provider, direction, event_type,
                                   payload, correlation_id)
  values (v_pay, 'pesapal', 'request', 'legacy_unredacted',
          jsonb_build_object('token', 'super-secret-bearer',
                             'consumer_secret', 'also-secret',
                             'amount', 750000),
          v_corr);

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  if exists (
    select 1 from public.get_payment_trace(v_corr) t
     where t.detail -> 'payload' ? 'token'
        or t.detail -> 'payload' ? 'consumer_secret') then
    raise exception 'FAIL: a bearer token or consumer secret reached a reader through the trace';
  end if;
  if not exists (
    select 1 from public.get_payment_trace(v_corr) t
     where t.detail -> 'payload' ? '_redacted') then
    raise exception
      'FAIL: a payload was redacted without saying so — a reader cannot tell a '
      'removed field from one the provider never sent';
  end if;
  -- The evidence around the secret survives. A redactor that eats the payload
  -- removes the field the investigator opened the page for.
  if not exists (
    select 1 from public.get_payment_trace(v_corr) t
     where t.detail -> 'payload' ? 'amount') then
    raise exception 'FAIL: redaction removed non-sensitive evidence from the payload';
  end if;

  -- =================================================================
  -- 8. PERMISSION. A caller with no role gets refused, not a partial trace.
  -- =================================================================
  perform set_config('request.jwt.claim.sub', v_client::text, true);
  begin
    perform public.get_payment_trace(v_corr);
    raise exception 'FAIL: a caller without payments.read read the trace';
  exception when others then
    if sqlerrm <> 'forbidden' then raise; end if;
  end;

  raise notice 'ALL ASSERTIONS PASSED (0904 correlation trace)';
end$$;

-- Everything above is discarded; see the note in 0904_payment_attribution.test.sql.
rollback;
