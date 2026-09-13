-- 0912a — the lock/statement timeout added to `apply_payment_fx` in
-- 20260909000001 never reached this database.
--
-- WHY THIS MIGRATION EXISTS SEPARATELY
-- The CLI records a migration as applied by filename, not by content. Editing
-- 20260909000001_paypal_fx_conversion.sql after it had already been pushed
-- left the fix stranded in the repo: `supabase db push` sees that filename
-- already in `supabase_migrations.schema_migrations` and skips it, content
-- change or not. Confirmed by dumping the remote schema — `apply_payment_fx`
-- there is the pre-fix body, with no `lock_timeout`/`statement_timeout` at
-- all. That is why the PayPal checkout kept hanging for the full ~150s edge
-- runtime wall-clock limit after the first attempt at this fix: it was never
-- live. A new, later-dated migration is the only way to actually ship a
-- change to a function whose creating migration has already run.
--
-- Body is identical to 20260909000001's current version — see that file for
-- the full rationale on the conversion itself.
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
  -- A lock wait here must fail fast, not hang. This is reached from
  -- `create-payment` through the service role, which carries no
  -- statement_timeout, so without these a row held by a concurrent
  -- reconciliation sweep or an abandoned checkout would block until the edge
  -- runtime kills the request at its wall-clock limit (~150s) — surfacing to
  -- the payer as an opaque "upstream request timeout" with nothing recorded
  -- here and no order ever opened at PayPal. `set local` is reverted when the
  -- function returns (the `set search_path` clause snapshots GUCs on entry).
  set local lock_timeout = '4s';
  set local statement_timeout = '15s';

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
  update public.payments
     set base_amount   = q.base_amount,
         base_currency = q.base_currency,
         amount        = q.quote_amount,
         currency      = q.quote_currency,
         fx_rate_id    = q.fx_rate_id,
         updated_at    = now(),
         version       = p.version + 1
   where id = p_payment_id;

  update public.fx_quotes
     set consumed_at = now(),
         payment_id  = p_payment_id
   where id = p_fx_quote_id;

  return query
    select q.quote_amount, q.quote_currency, p.amount, p.currency;
end;$$;

revoke all on function public.apply_payment_fx(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment_fx(uuid, uuid, jsonb) to service_role;
