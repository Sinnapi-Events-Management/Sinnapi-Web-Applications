-- =====================================================================
-- Sinnapi — stop gating cron-only edge functions on the service-role key.
--
-- 20261102000001 fixed HOW the cron jobs read the key (live, not baked),
-- but WHAT they were reading was still the project's own service_role
-- key — a value Supabase owns the lifecycle of, not Sinnapi. Two things
-- make that the wrong secret for this job specifically:
--
--   1. The Vault copy (`service_role_key`) was set by hand once, by
--      whoever first wired up pg_cron, and nothing has kept it in sync
--      with the project's actual key since. Supabase's own reserved Edge
--      Function secret DOES stay in sync automatically, so the two drift
--      apart the instant the real key is rotated — which is exactly what
--      produced the 401 this migration series exists to fix.
--   2. Supabase is retiring the legacy anon/service_role keys in favour
--      of publishable/secret keys, documented end-of-2026 — weeks away.
--      Tying our own cron-to-function trust check to a key Supabase can
--      disable on its own schedule is building the same outage back in,
--      just on a later date.
--
-- THE FIX
-- A secret Sinnapi mints and owns end to end: `cron_dispatch_secret`,
-- generated here if it does not already exist, read live by the same six
-- jobs 20261102000001 touched, and compared in `isCronCaller`
-- (`_shared/supabase.ts`) — a check with no dependency on anything
-- Supabase's account settings can change. Rotating it later is a
-- deliberate, one-step action (`select vault.update_secret(...)`, then
-- `supabase secrets set CRON_DISPATCH_SECRET=<same value>` on every
-- affected function), never something that can go stale as a side effect
-- of an unrelated housekeeping task.
--
-- WHAT THIS MIGRATION CANNOT DO
-- Generate the secret in Vault and hand it to the six Edge Functions are
-- two different systems; SQL can only do the first half. Each of
-- notification-dispatch, subscription-lifecycle, fx-rate-sync,
-- payment-reconciliation, escrow-lifecycle and newsletter-dispatch must
-- also get `CRON_DISPATCH_SECRET` set as a function secret with the SAME
-- value this migration puts in Vault, and the updated code deployed,
-- before this takes effect — see the deploy runbook in the PR/commit this
-- migration ships with.
--
-- `send-migration-credentials` and `content-moderation` are deliberately
-- NOT touched: the former only ever answers to a real service-role
-- caller by design (its own header says so), and the latter is a
-- Database Webhook configured in the dashboard, outside any migration's
-- reach, not a pg_cron job this file can see.
-- =====================================================================

do $$
declare
  v_base text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping 1102b cron re-registration';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets
   where name = 'functions_base_url' limit 1;
  if v_base is null then
    raise notice 'Vault secret functions_base_url missing; skipping 1102b cron re-registration';
    return;
  end if;

  -- Mint once. A re-run of this migration (or a future `db push` replay in
  -- a fresh environment) must not hand out a second, different secret that
  -- would silently stop matching whatever was already deployed to the
  -- functions.
  if not exists (select 1 from vault.secrets where name = 'cron_dispatch_secret') then
    perform vault.create_secret(
      encode(gen_random_bytes(48), 'hex'),
      'cron_dispatch_secret',
      'Bearer token the six cron-only Edge Functions require instead of the '
      'service-role key — see 20261102000002_cron_dispatch_secret.sql. Mirror '
      'any change here into each function''s CRON_DISPATCH_SECRET secret.');
  end if;

  -- outbox dispatch — every minute
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_outbox';
  perform cron.schedule('sinnapi_outbox', '* * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'cron_dispatch_secret' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/notification-dispatch'));

  -- subscription lifecycle — every 15 minutes
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_subscriptions';
  perform cron.schedule('sinnapi_subscriptions', '*/15 * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'cron_dispatch_secret' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/subscription-lifecycle'));

  -- FX rate sync — every 30 minutes
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_fx';
  perform cron.schedule('sinnapi_fx', '*/30 * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'cron_dispatch_secret' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/fx-rate-sync'));

  -- payment reconciliation — hourly
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_reconcile';
  perform cron.schedule('sinnapi_reconcile', '0 * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'cron_dispatch_secret' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/payment-reconciliation'));

  -- escrow lifecycle — every 15 minutes
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_escrow_lifecycle';
  perform cron.schedule('sinnapi_escrow_lifecycle', '*/15 * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'cron_dispatch_secret' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/escrow-lifecycle'));

  -- newsletter campaign worker — every minute
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_newsletter';
  perform cron.schedule('sinnapi_newsletter', '* * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'cron_dispatch_secret' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/newsletter-dispatch'));
end$$;

-- ---------------------------------------------------------------------
-- VERIFY. The secret exists and all six jobs read it live.
-- ---------------------------------------------------------------------
do $$
declare v_n integer;
begin
  if to_regnamespace('cron') is null then return; end if;

  if not exists (select 1 from vault.secrets where name = 'cron_dispatch_secret') then
    raise exception '1102b: cron_dispatch_secret was not created in Vault';
  end if;

  select count(*) into v_n from cron.job
   where jobname in ('sinnapi_outbox','sinnapi_subscriptions','sinnapi_fx',
                      'sinnapi_reconcile','sinnapi_escrow_lifecycle','sinnapi_newsletter')
     and command like '%cron_dispatch_secret%';
  if v_n <> 6 then
    raise exception '1102b: % of 6 jobs read cron_dispatch_secret live, expected 6', v_n;
  end if;
end$$;
