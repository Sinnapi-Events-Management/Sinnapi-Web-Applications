-- 0912b — repair `apply_payment_fx`, which could never succeed, and bound how
-- long a service-role statement may wait.
--
-- THE HEADLINE
-- `apply_payment_fx` raised `optimistic_lock_conflict` on every call because
-- it hand-wrote `version = p.version + 1` into a table whose version trigger
-- requires the version you READ, not the one you want next. Details are at the
-- update statement itself. The PayPal rail could not have worked; the currency
-- fix that preceded this simply moved the failure earlier, from PayPal's
-- validation to our own trigger.
--
-- WHAT WENT WRONG, PRECISELY
-- A PayPal checkout hung for the full Edge wall-clock limit (~150s) and the
-- payer got `upstream request timeout`. 20260912000001 assumed a lock wait
-- inside `apply_payment_fx` and added `set local lock_timeout` plus
-- `set local statement_timeout` to it. That migration IS applied — confirmed
-- against the remote schema — and the hang continued, so the diagnosis was
-- wrong. The stall was in the outbound call to PayPal, which is fixed in the
-- Edge Function (see `_shared/deadline.ts`), not here.
--
-- But that migration also left behind a comment asserting a guarantee this
-- database does not provide, which is worse than no comment at all: the next
-- person to read it will believe the function cannot overrun.
--
-- `set local statement_timeout` INSIDE A FUNCTION DOES NOTHING TO THAT
-- FUNCTION. PostgreSQL arms the statement timer once, when the top-level
-- statement begins; changing the GUC part-way through never re-arms it. So
-- the `statement_timeout` line in `apply_payment_fx` has been decorative
-- since the day it was written. `lock_timeout` is different — it is consulted
-- at every lock acquisition — so that half did work, and is kept.
--
-- WHERE THE REAL BOUND BELONGS
-- At the role, where PostgreSQL applies it at statement start and PostgREST
-- honours it for every request. Supabase ships `anon` at 3s and
-- `authenticated` at 8s, so the browser-facing paths were already bounded;
-- `service_role` ships unbounded, which is exactly the role every Edge
-- Function uses for its privileged half. Each of these was able to wait
-- forever:
--
--   * record_payment_result   — failing a payment the provider refused
--   * attach_payment_provider_ref
--   * raise_reconciliation_exception
--   * the direct inserts into audit_logs and payment_logs
--
-- None of them was the culprit this time. All of them were capable of being
-- it, and a payment path with an unbounded wait in it is a payment path that
-- will eventually hang for a reason nobody predicted. One role-level setting
-- covers every statement the service role will ever run, including the plain
-- PostgREST inserts that no per-function `set local` could reach.
--
-- CHOOSING THE NUMBERS
-- `statement_timeout` 30s: comfortably above any single statement in this
-- schema (the slowest RPC here is escrow pricing, in single-digit
-- milliseconds) and comfortably below the Edge wall clock, so the database
-- always loses the race and returns a real error instead of being killed
-- mid-flight. It is per-statement, not per-transaction, so the reconciliation
-- and lifecycle sweeps — many quick statements in a loop — are unaffected.
--
-- `lock_timeout` 4s: a row in the payment path is only ever held for the few
-- milliseconds one RPC needs. Waiting four seconds for one means something is
-- genuinely stuck, and `create-payment` maps a lock timeout to a retryable
-- 503 rather than a refusal.

alter role service_role set statement_timeout = '30s';
alter role service_role set lock_timeout = '4s';

-- PostgREST caches role settings and will otherwise keep using the old values
-- until it happens to restart. Without this the migration applies and changes
-- nothing observable, which is its own kind of trap.
notify pgrst, 'reload config';

-- ---------------------------------------------------------------------
-- `apply_payment_fx`, with the honest comment and one correctness fix.
--
-- Body is 20260912000001's, minus the `set local statement_timeout` that never
-- did anything, and returning the figures it actually PERSISTED rather than a
-- pre-update snapshot. The guard above proves those agree to within a cent, so
-- this changes no value in practice — but `create-payment` puts the returned
-- base amount straight into an audit row describing what the payer owes, and
-- that row should quote the number in the column, not a number that merely
-- rounds to it.
-- ---------------------------------------------------------------------
create or replace function public.apply_payment_fx(
  p_payment_id  uuid,
  p_fx_quote_id uuid,
  p_context     jsonb default null)
returns table (
  amount        numeric,
  currency      text,
  base_amount   numeric,
  base_currency text)
language plpgsql security definer set search_path = public as $$
declare
  q public.fx_quotes;
  p public.payments;
begin
  -- A lock wait here fails fast rather than queueing. Consulted at every lock
  -- acquisition, so unlike `statement_timeout` this genuinely applies to the
  -- `for update` reads below. `set local` is reverted when the function
  -- returns, because the `set search_path` clause snapshots GUCs on entry.
  --
  -- The overall cap on this call is NOT here. It is `statement_timeout` on
  -- service_role, set above, plus the Edge Function's own per-call deadline —
  -- the two places where a limit is actually enforced.
  set local lock_timeout = '4s';

  perform public._set_payment_context(p_context, 'apply_payment_fx');

  select * into q from public.fx_quotes where id = p_fx_quote_id for update;
  if q.id is null then raise exception 'fx_quote_not_found'; end if;

  select * into p from public.payments where id = p_payment_id for update;
  if p.id is null then raise exception 'payment_not_found'; end if;

  perform public._ensure_correlation(p.correlation_id);

  -- Idempotent replay. `create-payment` is retried on the same idempotency
  -- key, and the second pass must find the conversion already done rather
  -- than refuse — otherwise a dropped connection turns a live checkout into
  -- a dead one.
  if q.consumed_at is not null then
    if q.payment_id = p_payment_id then
      return query
        select p.amount, p.currency, p.base_amount, p.base_currency;
      return;
    end if;
    raise exception 'fx_quote_already_used';
  end if;

  if q.expires_at <= now() then raise exception 'fx_quote_expired'; end if;

  -- One person's quote may not price another's charge.
  if p.created_by is distinct from q.requested_by then
    raise exception 'fx_quote_not_yours';
  end if;

  -- The quote must price what this payment actually owes. Both sides come
  -- from the same server-side pricing call moments apart, so any divergence
  -- means the booking was re-priced in between and the disclosure the payer
  -- saw no longer describes the charge.
  if p.currency is distinct from q.base_currency then
    raise exception 'fx_quote_currency_mismatch';
  end if;
  if abs(p.amount - q.base_amount) > 0.01 then
    raise exception 'fx_quote_amount_mismatch';
  end if;

  -- `base_amount`/`base_currency` already mean "this obligation, normalised to
  -- the platform currency" — `activate_escrow` has always written the UGX
  -- figure there. That meaning is preserved rather than repurposed: the quote's
  -- base side IS that figure, so this writes back the same value it already
  -- held, and `amount`/`currency` become the transacted pair. Sourcing both
  -- from the quote rather than from `p` keeps it correct if a non-UGX
  -- obligation ever reaches here.
  --
  -- `version` IS DELIBERATELY NOT SET HERE, AND THIS IS THE BUG THAT BROKE THE
  -- PAYPAL RAIL OUTRIGHT.
  --
  -- `payments` carries a `trg_bump_version` BEFORE UPDATE trigger whose
  -- contract is: either leave `version` alone and I will bump it, or pass the
  -- version you read and I will check it against the row before bumping. The
  -- previous body passed `p.version + 1`. `p` was read moments earlier in this
  -- same transaction, so `p.version` IS the row's current version — making the
  -- value passed always exactly one too high, and the trigger's check
  --
  --     if new.version is distinct from old.version then
  --       if new.version <> old.version then raise 'optimistic_lock_conflict'
  --
  -- fire on every single call. Not under contention. Not occasionally. Every
  -- call, from the day the function was written, with errcode 40001.
  --
  -- Reproduced against a copy of this database loaded from a live schema dump:
  -- `optimistic_lock_conflict: stale version 3 (current 2)`. The conversion
  -- therefore never applied, which is why fixing the currency appeared to make
  -- things worse rather than better — the rail moved from failing AT PayPal
  -- with a legible CURRENCY_NOT_SUPPORTED to failing BEFORE PayPal with an
  -- optimistic-lock error that reads like a concurrency problem and is not one.
  --
  -- This was the only explicit `version` write anywhere in the schema; the
  -- eleven other updates to `payments` all let the trigger do its job. So does
  -- this one now. `updated_at` goes too, for the same reason — `trg_updated_at`
  -- already sets it.
  update public.payments
     set base_amount   = q.base_amount,
         base_currency = q.base_currency,
         amount        = q.quote_amount,
         currency      = q.quote_currency,
         fx_rate_id    = q.fx_rate_id
   where id = p_payment_id;

  update public.fx_quotes
     set consumed_at = now(),
         payment_id  = p_payment_id
   where id = p_fx_quote_id;

  -- All four from the quote: these are the values now in the row.
  return query
    select q.quote_amount, q.quote_currency, q.base_amount, q.base_currency;
end;$$;

revoke all on function public.apply_payment_fx(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment_fx(uuid, uuid, jsonb) to service_role;

supabase secrets set ALLOWED_ORIGINS=http://localhost:3003,http://localhost:3002,http://localhost:3001,http://localhost:3000,https://admin.sinnapi.com,https://sinnapi.com,https://sinnapi-web-applications-web-public.vercel.app/,https://ultratropical-magda-nonperverted.ngrok-free.dev
