-- =====================================================================
-- Sinnapi — Escrow v2, step 5: RLS, realtime, storage, schedules.
-- =====================================================================

-- ---------------------------------------------------------------------
-- RLS on the new tables. 0011 enabled + forced RLS on everything in the
-- schema, but these two were created afterwards, so they need it explicitly
-- or they would be readable by anyone authenticated.
-- ---------------------------------------------------------------------
alter table public.payment_events              enable row level security;
alter table public.payment_events              force  row level security;
alter table public.reconciliation_exceptions   enable row level security;
alter table public.reconciliation_exceptions   force  row level security;

-- Webhook plumbing. Written only by service_role, which bypasses RLS; no
-- client policy at all means default-deny for everyone else.
drop policy if exists payment_events_read on public.payment_events;
create policy payment_events_read on public.payment_events for select to authenticated
  using (public.has_permission('payments.read'));

drop policy if exists recon_read on public.reconciliation_exceptions;
create policy recon_read on public.reconciliation_exceptions for select to authenticated
  using (public.has_permission('finance.reconcile') or public.has_permission('finance.read'));

-- ---------------------------------------------------------------------
-- The vendor needs to see their own payouts including the settlement
-- evidence; the existing policy only admitted payout.approve / payout.process
-- holders alongside the owner, which excluded the new settle permissions.
-- ---------------------------------------------------------------------
drop policy if exists payouts_read on public.payouts;
create policy payouts_read on public.payouts for select to authenticated
  using (public.is_vendor_owner(vendor_id)
         or public.has_permission('payout.approve')
         or public.has_permission('payout.process')
         or public.has_permission('payout.settle')
         or public.has_permission('escrow.read'));

-- A client should be able to see that their vendor was paid — it is the
-- visible half of the escrow promise — without seeing the vendor's bank
-- details, which live in a different table behind an audited RPC.
drop policy if exists payouts_read_client on public.payouts;
create policy payouts_read_client on public.payouts for select to authenticated
  using (exists (select 1 from public.escrow_transactions e
                 where e.id = escrow_id and e.client_id = auth.uid()));

-- Vendors have standing in a refund against their own booking.
drop policy if exists refunds_read on public.refunds;
create policy refunds_read on public.refunds for select to authenticated
  using (client_id = auth.uid()
         or public.has_permission('refund.approve')
         or public.has_permission('payout.settle')
         or exists (select 1 from public.escrow_transactions e
                    where e.id = escrow_id and public.is_vendor_owner(e.vendor_id)));

-- ---------------------------------------------------------------------
-- Storage: payout proof. Finance writes, Finance reads. Never the vendor —
-- a receipt can carry the destination account in full.
-- Object path convention: {payout_id}/{filename}
-- ---------------------------------------------------------------------
drop policy if exists payout_proofs_read on storage.objects;
create policy payout_proofs_read on storage.objects for select to authenticated
  using (bucket_id = 'payout-proofs'
         and (public.has_permission('payout.settle')
              or public.has_permission('payout.settle.approve')
              or public.has_permission('finance.read')));

drop policy if exists payout_proofs_write on storage.objects;
create policy payout_proofs_write on storage.objects for insert to authenticated
  with check (bucket_id = 'payout-proofs' and public.has_permission('payout.settle'));

-- Evidence is immutable once uploaded: no update, no delete policy. Retention
-- is handled by the compliance job, not by whoever recorded the settlement.

-- ---------------------------------------------------------------------
-- Realtime. escrow_transactions is already published; add the tables the
-- portals now subscribe to so a payment or payout state change reaches the
-- open page without a refetch. Base-table RLS still governs visibility.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select unnest(array['payments', 'escrow_events', 'refunds',
                               'reconciliation_exceptions']) as t
  loop
    execute format('alter table public.%I replica identity full;', r.t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = r.t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', r.t);
    end if;
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- Schedules.
--
-- The lifecycle job is deliberately separate from reconciliation: one advances
-- the escrow state machine on time, the other checks the books. A failure in
-- either must not stop the other.
-- ---------------------------------------------------------------------
do $$
declare v_base text; v_key text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping schedule creation';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets
   where name = 'functions_base_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets
   where name = 'service_role_key' limit 1;
  if v_base is null or v_key is null then
    raise notice 'Vault secrets missing; skipping escrow schedules';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job
   where jobname in ('sinnapi_escrow_lifecycle', 'sinnapi_settlement_sla');

  -- Advance due, auto-release due, client reminders. Hourly is granular
  -- enough for day-based timers and keeps the job cheap.
  perform cron.schedule('sinnapi_escrow_lifecycle', '15 * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base || '/escrow-lifecycle', v_key));

  -- Payouts sitting unsettled past the SLA become reconciliation exceptions
  -- so vendor money cannot quietly stall in the finance queue.
  perform cron.schedule('sinnapi_settlement_sla', '30 6 * * *', $f$
    select public.raise_reconciliation_exception(
             'overdue_settlement',
             'payout:' || p.id::text || ':overdue',
             'Payout has been awaiting settlement past the configured SLA',
             jsonb_build_object('vendor_id', p.vendor_id, 'kind', p.kind),
             p.amount, null, p.escrow_id, null, p.id, 'critical')
    from public.payouts p
    where p.status in ('requested', 'approved')
      and p.due_at is not null
      and p.due_at < now() - make_interval(hours =>
            coalesce((public.get_setting('escrow_settlement_sla_hours') #>> '{}')::integer, 48));
  $f$);
end$$;
