-- =====================================================================
-- Sinnapi — one-off cron repair
--
-- WHY THIS FILE EXISTS
-- Every scheduled job on this platform is created by a `do $$ ... $$` block at
-- the end of the migration that owns it, and every one of those blocks opens by
-- checking its preconditions:
--
--     if to_regnamespace('cron') is null then
--       raise notice 'pg_cron not installed; skipping ...';
--       return;
--     end if;
--
-- `raise notice` is not an error. A migration whose cron block skipped still
-- reports success, and `supabase db push` prints the notice among hundreds of
-- other lines. So a project where pg_cron was enabled AFTER the migrations ran
-- ends up with a complete, correct schema and not one scheduled job — and
-- nothing anywhere says so. The symptom surfaces much later as "the newsletter
-- was scheduled but never sent", or worse, as quotes that never expire and
-- escrow that never advances.
--
-- Re-running the migrations does not fix it: they are already recorded as
-- applied. This file re-executes just the scheduling blocks, which are all
-- idempotent (each unschedules its own job by name before scheduling it).
--
-- HOW TO USE
--   1. Enable the `pg_cron` and `pg_net` extensions first
--      (Dashboard -> Database -> Extensions). This file refuses to run
--      without them rather than skipping quietly, which is the whole point.
--   2. Ensure the Vault secrets exist (see the precondition block below).
--   3. Run this file in the SQL editor.
--   4. Run the verification query at the bottom and confirm 13 jobs.
--
-- Safe to run repeatedly.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Preconditions — LOUD, unlike the blocks below.
--
-- Deliberately `raise exception`, not `raise notice`. The silent skip is what
-- caused the outage this file repairs; a repair script that could itself skip
-- silently would be worse than no repair script at all.
-- ---------------------------------------------------------------------
do $$
begin
  if to_regnamespace('cron') is null then
    raise exception 'pg_cron is not installed. Enable it (Dashboard -> Database -> Extensions) before running this file.';
  end if;
  if to_regnamespace('net') is null then
    raise exception 'pg_net is not installed. Enable it before running this file — the jobs post to Edge Functions over HTTP.';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'functions_base_url') then
    raise exception 'Vault secret "functions_base_url" is missing. Expected the functions root, e.g. https://<project-ref>.supabase.co/functions/v1';
  end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'service_role_key') then
    raise exception 'Vault secret "service_role_key" is missing. It must match the project service role key EXACTLY — the functions compare it byte-for-byte.';
  end if;
end
$$;

-- from 20260618000016_cron.sql
do $$
declare
  v_base text;
  v_key  text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping schedule creation';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets where name='functions_base_url' limit 1;
  select decrypted_secret into v_key  from vault.decrypted_secrets where name='service_role_key' limit 1;
  if v_base is null or v_key is null then
    raise notice 'Vault secrets functions_base_url / service_role_key missing; skipping schedules';
    return;
  end if;

  -- helper to (re)create a schedule that POSTs to an edge function
  perform cron.unschedule(jobid) from cron.job
    where jobname in ('sinnapi_outbox','sinnapi_subscriptions','sinnapi_fx',
                      'sinnapi_reconcile','sinnapi_quote_expiry','sinnapi_dispute_sla');

  -- outbox dispatch — every minute
  perform cron.schedule('sinnapi_outbox','* * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base||'/notification-dispatch', v_key));

  -- subscription lifecycle — every 15 minutes
  perform cron.schedule('sinnapi_subscriptions','*/15 * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base||'/subscription-lifecycle', v_key));

  -- FX rate sync — every 30 minutes
  perform cron.schedule('sinnapi_fx','*/30 * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base||'/fx-rate-sync', v_key));

  -- payment reconciliation — hourly
  perform cron.schedule('sinnapi_reconcile','0 * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base||'/payment-reconciliation', v_key));

  -- quote expiry — hourly (pure SQL, no edge function needed)
  perform cron.schedule('sinnapi_quote_expiry','5 * * * *', $f$
    update public.quotations set status='expired'
     where status='sent' and valid_until is not null and valid_until < now();
  $f$);

  -- dispute SLA escalation — hourly
  perform cron.schedule('sinnapi_dispute_sla','10 * * * *', $f$
    insert into public.notifications(recipient_id, trigger_key, channel, title, body, data)
    select ur.profile_id, 'finance.dispute_sla_overdue','in_app','Dispute SLA overdue', d.reason,
           jsonb_build_object('dispute_id', d.id)
    from public.disputes d
    join public.roles r on r.key='compliance'
    join public.user_roles ur on ur.role_id = r.id
    where d.status in ('open','under_review','awaiting_evidence')
      and d.sla_due_at < now();
  $f$);
end$$;

-- from 20260802000001_portal_access_control.sql
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping portal attempt purge schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_portal_attempt_purge';

  perform cron.schedule('sinnapi_portal_attempt_purge', '30 3 * * *', $f$
    select public.purge_portal_access_attempts();
  $f$);
end$$;

-- from 20260802000002_client_signup_confirmation.sql
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping signup attempt purge schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_signup_attempt_purge';

  perform cron.schedule('sinnapi_signup_attempt_purge', '40 3 * * *', $f$
    select public.purge_signup_attempts();
  $f$);
end$$;

-- from 20260802000005_auth_audit_trail.sql
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping auth audit purge schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_auth_audit_purge';

  perform cron.schedule('sinnapi_auth_audit_purge', '45 3 * * *', $f$
    select public.purge_auth_audit_events();
  $f$);
end$$;

-- from 20260809000005_escrow_rls_realtime_cron.sql
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

-- from 20260810000002_vendor_account_admin.sql
do $$
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping vendor suspension expiry schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_suspension_expiry';

  perform cron.schedule('sinnapi_suspension_expiry', '20 * * * *', $f$
    select public.expire_vendor_suspensions();
  $f$);
end$$;

-- from 20260816000002_newsletter_campaigns.sql
do $$
declare
  v_base text;
  v_key  text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping newsletter schedule';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets where name = 'functions_base_url' limit 1;
  select decrypted_secret into v_key  from vault.decrypted_secrets where name = 'service_role_key'   limit 1;
  if v_base is null or v_key is null then
    raise notice 'Vault secrets missing; skipping newsletter schedule';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_newsletter';

  perform cron.schedule('sinnapi_newsletter', '* * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base || '/newsletter-dispatch', v_key));
end
$$;

-- from 20260818000006_settlement_cron.sql
do $$
declare v_base text; v_key text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping schedule update';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets
   where name = 'functions_base_url' limit 1;
  select decrypted_secret into v_key from vault.decrypted_secrets
   where name = 'service_role_key' limit 1;
  if v_base is null or v_key is null then
    raise notice 'Vault secrets missing; leaving escrow schedule as it is';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_escrow_lifecycle';

  perform cron.schedule('sinnapi_escrow_lifecycle', '*/15 * * * *', format($f$
    select net.http_post(url:=%L, headers:=jsonb_build_object(
      'Content-Type','application/json','Authorization','Bearer '||%L), body:='{}'::jsonb);
  $f$, v_base || '/escrow-lifecycle', v_key));
end$$;

-- ---------------------------------------------------------------------
-- Verification — expect 13 rows, all active.
--
-- Run this after the file completes. A short count means a block above hit its
-- own precondition guard and returned quietly; the missing job names tell you
-- which subsystem is still inert.
-- ---------------------------------------------------------------------
select jobname, schedule, active
from cron.job
where jobname like 'sinnapi_%'
order by jobname;
