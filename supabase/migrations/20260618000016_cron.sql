-- =====================================================================
-- Sinnapi — 0016 Scheduled jobs (pg_cron + pg_net -> Edge Functions / RPC)
-- Requires extensions `pg_cron` and `pg_net` (enable in Dashboard).
-- Edge functions are invoked over HTTP with the service-role key.
-- Store these as Vault secrets first:
--   functions_base_url  e.g. https://<ref>.functions.supabase.co
--   service_role_key    the project service role key
-- =====================================================================

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
