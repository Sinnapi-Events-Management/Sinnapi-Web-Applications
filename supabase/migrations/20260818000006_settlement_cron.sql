-- =====================================================================
-- Sinnapi — post-event settlement, step 5: the sweep runs often enough.
--
-- `sinnapi_escrow_lifecycle` was scheduled hourly, which is granular enough
-- for the timers it was written for: an advance due a week before the event
-- and an auto-release seven days after completion. The settlement clocks are
-- six hours and two hours, so an hourly sweep can be up to 59 minutes late on
-- a six-hour promise — a sixth of the window, on the one flow where the vendor
-- is waiting on money for work they have already done.
--
-- Every quarter hour instead. The job is four indexed queries and does nothing
-- when there is nothing due, so the cost of running it more often is close to
-- the cost of not.
-- =====================================================================
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
