-- =====================================================================
-- Sinnapi — fix: pg_cron jobs baked the service-role key in at schedule
-- time, so a key rotation after that point 401s every HTTP call forever.
--
-- WHAT WAS WRONG
-- `0016_cron.sql` and every schedule added after it (`0809e`, `0816b`,
-- `0818f`) read `vault.decrypted_secrets` once, inside a `do $$ ... $$`
-- block, and used `format(..., %L, v_key)` to splice the *literal* key
-- into the SQL text handed to `cron.schedule`. That text is what
-- `cron.job.command` stores — pg_cron does not re-read the vault on each
-- tick, it replays the frozen string. So the Authorization header every
-- one of these jobs sends is whatever `service_role_key` held in the
-- vault the moment that migration happened to run.
--
-- `notification-dispatch` (and every other cron-only function) gates on
-- `isServiceRoleCaller`, which compares the bearer token byte-for-byte
-- against the function's own `SUPABASE_SERVICE_ROLE_KEY` secret — the
-- *current* one, since Supabase keeps that reserved Edge Function secret
-- in sync with the project's real key automatically. The vault copy has
-- no such thing keeping it in sync: it was written once by hand (no
-- migration ever calls `vault.create_secret` for it) and never touched
-- again. The moment the project's service-role key is rotated — a
-- routine security action, not a mistake — the vault copy and every
-- already-scheduled cron command go stale together, and
-- `notification-dispatch` starts returning 401 to pg_cron on every tick.
-- Development never shows this: a local reset re-runs every migration
-- against whatever key is in the local `.env` right now, so the baked
-- literal and the function's own copy are always the same value.
--
-- Account-creation mail is unaffected by any of this because it is not
-- on this path at all — `handle_new_user` / the confirmation link is sent
-- by GoTrue directly (`20260802000002_client_signup_confirmation.sql`),
-- never through `outbox` or `notification-dispatch`. Everything that IS
-- on this path — quotation and booking emails chief among them — silently
-- stopped the instant the key drifted, which is exactly what was seen.
--
-- THE FIX
-- Reschedule every HTTP-calling job with the vault lookups INSIDE the
-- cron body, as `select ... from vault.decrypted_secrets ...`
-- sub-selects, instead of pre-rendering them with `format()`. The command
-- text stored in `cron.job` now reads the vault fresh on every single
-- run, so a future key rotation needs only the vault secret updated
-- (`select vault.update_secret(id, '<new key>') ...` or the dashboard's
-- Vault UI) — never another migration, never a manual
-- `cron.unschedule`/`cron.schedule` round trip.
--
-- REMEDIATION STEP THIS MIGRATION CANNOT DO ITSELF
-- If the project's service-role key has already been rotated since this
-- bug was introduced, the vault secret is still holding the OLD value
-- after this migration runs — a live lookup of a stale value is still
-- stale. Confirm `service_role_key` in Vault matches Project Settings ->
-- API -> service_role, and update it there if not. That one check is
-- what actually clears the 401; this migration is what stops it from
-- silently recurring on the next rotation.
--
-- Jobs intentionally left untouched: `sinnapi_quote_expiry`,
-- `sinnapi_dispute_sla`, `sinnapi_settlement_sla`, `sinnapi_suspension_expiry`
-- run pure SQL with no HTTP call and no Authorization header, so they were
-- never exposed to this.
-- =====================================================================

do $$
declare
  v_base text;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron not installed; skipping 1102 cron re-registration';
    return;
  end if;

  select decrypted_secret into v_base from vault.decrypted_secrets
   where name = 'functions_base_url' limit 1;
  if v_base is null then
    raise notice 'Vault secret functions_base_url missing; skipping 1102 cron re-registration';
    return;
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
           where name = 'service_role_key' limit 1)),
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
           where name = 'service_role_key' limit 1)),
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
           where name = 'service_role_key' limit 1)),
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
           where name = 'service_role_key' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/payment-reconciliation'));

  -- escrow lifecycle — every 15 minutes (schedule per 0818f; key lookup fixed here)
  perform cron.unschedule(jobid) from cron.job where jobname = 'sinnapi_escrow_lifecycle';
  perform cron.schedule('sinnapi_escrow_lifecycle', '*/15 * * * *', format($f$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
           where name = 'service_role_key' limit 1)),
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
           where name = 'service_role_key' limit 1)),
      body := '{}'::jsonb);
  $f$, v_base || '/newsletter-dispatch'));
end$$;

-- ---------------------------------------------------------------------
-- VERIFY. Confirms the six jobs exist and that each one's stored command
-- text re-reads the vault at run time (`vault.decrypted_secrets` appears
-- in the command itself) rather than carrying a pre-rendered literal.
-- ---------------------------------------------------------------------
do $$
declare v_n integer;
begin
  if to_regnamespace('cron') is null then return; end if;

  select count(*) into v_n from cron.job
   where jobname in ('sinnapi_outbox','sinnapi_subscriptions','sinnapi_fx',
                      'sinnapi_reconcile','sinnapi_escrow_lifecycle','sinnapi_newsletter');
  if v_n <> 6 then
    raise exception '1102 cron re-registration left % of 6 jobs scheduled, expected 6', v_n;
  end if;

  select count(*) into v_n from cron.job
   where jobname in ('sinnapi_outbox','sinnapi_subscriptions','sinnapi_fx',
                      'sinnapi_reconcile','sinnapi_escrow_lifecycle','sinnapi_newsletter')
     and command like '%vault.decrypted_secrets%';
  if v_n <> 6 then
    raise exception '1102 cron re-registration: % of 6 jobs read the vault live, expected 6', v_n;
  end if;
end$$;
