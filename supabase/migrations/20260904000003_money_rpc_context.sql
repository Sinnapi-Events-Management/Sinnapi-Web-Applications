-- =====================================================================
-- Sinnapi — 0904c The money RPCs learn who is calling them
--
-- 0904a built the context. This is the migration that fills it in, on the
-- eleven functions through which every shilling in this system moves.
--
-- THE CONSTRAINT THAT DECIDES THE DESIGN
-- `set_config(..., true)` is transaction-local, and every supabase-js `.rpc()`
-- call is its own transaction. So an Edge Function cannot do this:
--
--     await supa.rpc('set_payment_context', { ... });   -- transaction 1
--     await supa.rpc('record_payment_result', { ... }); -- transaction 2
--
-- The second call would see nothing. Transaction 1 committed and took the
-- setting with it. There is no session to hold it either — PostgREST hands
-- back a pooled connection between requests, so even `set_config(..., false)`
-- would leak into an unrelated caller's transaction rather than survive into
-- the intended one, which is worse than not working.
--
-- The context therefore has to arrive AS AN ARGUMENT to the money RPC itself,
-- which sets it at the top of its own body so the triggers firing later in
-- that same transaction can read it.
--
-- WHY WRAPPERS AND NOT REWRITTEN BODIES
-- Adding `p_context jsonb default null` to an existing function is not a
-- replacement, it is an OVERLOAD — `record_payment_result(uuid, payment_status,
-- text, text)` and `record_payment_result(uuid, payment_status, text, text,
-- jsonb)` would both exist, both match a four-key call, and PostgREST would
-- refuse the request with PGRST203. (The header of 20260816000007 warns about
-- exactly this trap.) So each old signature has to go.
--
-- Which leaves the question of what replaces it. Reproducing eleven bodies —
-- around fifteen hundred lines including `approve_escrow_release`,
-- `release_advance` and `activate_escrow`, each redefined two or three times
-- across earlier migrations — means being certain every one of them is the
-- LATEST version. Get that wrong on one and this migration silently reverts a
-- money fix, with no error and no test to catch it: plpgsql bodies are not
-- resolved at CREATE time, so it would apply perfectly cleanly.
--
-- So the bodies are not retyped. Each live function is RENAMED to a private
-- `_core`, which moves whatever is actually deployed byte for byte, and a new
-- public function takes its name, sets the context, and delegates. The
-- transcription risk is not reduced; it is removed.
--
-- The cost is one indirection per call and a rule for the future, stated here
-- because it is the thing that will bite: FROM NOW ON, A MIGRATION THAT
-- CHANGES ONE OF THESE ELEVEN BEHAVIOURS MUST REPLACE THE `_core`, NOT THE
-- PUBLIC NAME. Replacing the public name would drop the context and silently
-- return every one of its rows to 'system'. The assertion at the foot of this
-- file fails loudly if that happens.
--
-- WHAT ARRIVES IN p_context
--     { actor_kind, actor_label, correlation_id, source, ip, user_agent }
-- All optional, all clamped by `_set_payment_context` (0904a): a caller with a
-- JWT identity is a 'user' no matter what it claims. Defaulted to null so
-- every existing call site — the portals, the nested RPC-to-RPC calls —
-- keeps compiling and keeps working.
-- =====================================================================

-- ---------------------------------------------------------------------
-- WHERE A CORRELATION ID IS BORN.
--
-- A BEFORE INSERT trigger rather than a line in `activate_escrow`, for two
-- reasons. The first is coverage: `payments` rows are created by
-- `activate_escrow` and `activate_subscription_payment` today, and the trigger
-- means the next writer of a payment row — an admin RPC, a migration, a
-- future rail — gets a trace without anyone remembering to add one.
--
-- The second is ordering. The trigger publishes the new id back into the
-- transaction's own context, so everything that happens AFTER the insert and
-- inside the same transaction lands on the same trace: the `trg_audit_log`
-- row for this very insert (AFTER INSERT, so it fires second), the escrow
-- row, `escrow_notify`'s outbox rows, the ledger legs. Setting the id in the
-- RPC body would work for one path; setting it here works for all of them.
--
-- Precedence is caller, then transaction, then fresh. An explicit
-- `correlation_id` on the insert wins because someone meant it; otherwise a
-- context already in force is inherited (a retry inside an existing trace);
-- otherwise this payment starts its own story.
-- ---------------------------------------------------------------------
create or replace function public.tg_payment_correlation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.correlation_id := coalesce(
    new.correlation_id,
    public._try_uuid(current_setting('sinnapi.correlation_id', true)),
    gen_random_uuid());

  perform set_config('sinnapi.correlation_id', new.correlation_id::text, true);
  return new;
end;$$;

drop trigger if exists trg_payment_correlation on public.payments;
create trigger trg_payment_correlation
  before insert on public.payments
  for each row execute function public.tg_payment_correlation();

-- =====================================================================
-- THE ELEVEN. Rename to `_core`, then re-create the public name as a
-- context-setting wrapper.
--
-- Each wrapper does the same three things in the same order:
--   1. establish the context (clamped) — before anything else, so that even a
--      failure inside the core is attributed;
--   2. adopt the trace the entity already carries, when the caller supplied
--      none (`_ensure_correlation`);
--   3. delegate.
--
-- Step 2 is what makes the reconciliation sweep useful. It knows it is
-- reconciliation but not which checkout it is finishing — that was opened an
-- hour earlier by a different process. The payment row has carried the trace
-- since it was created, so the sweep adopts it and its postings land on the
-- original story rather than starting a second one.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. record_payment_result — the one that matters most.
--
-- Every terminal payment state in this system comes through here: both
-- webhooks, the reconciliation sweep, and `activate_escrow` failing an
-- abandoned checkout. It is the function whose audit rows were most
-- misleading, because it is the one that fires `trg_audit_log` on `payments`,
-- `escrow_transactions` and `subscriptions` in a single transaction — three
-- rows, all previously attributed to nobody.
-- ---------------------------------------------------------------------
alter function public.record_payment_result(uuid, payment_status, text, text)
  rename to record_payment_result_core;

create function public.record_payment_result(
  p_payment_id   uuid,
  p_status       payment_status,
  p_provider_ref text  default null,
  p_reason       text  default null,
  p_context      jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'record_payment_result');
  perform public._ensure_correlation(
    (select p.correlation_id from public.payments p where p.id = p_payment_id));
  perform public.record_payment_result_core(p_payment_id, p_status, p_provider_ref, p_reason);
end;$$;

-- ---------------------------------------------------------------------
-- 2. attach_payment_provider_ref — called once per checkout, by
-- `create-payment`, immediately after the PSP order exists.
-- ---------------------------------------------------------------------
alter function public.attach_payment_provider_ref(uuid, text, text)
  rename to attach_payment_provider_ref_core;

create function public.attach_payment_provider_ref(
  p_payment_id   uuid,
  p_provider_ref text,
  p_checkout_url text  default null,
  p_context      jsonb default null)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'attach_payment_provider_ref');
  perform public._ensure_correlation(
    (select p.correlation_id from public.payments p where p.id = p_payment_id));
  return public.attach_payment_provider_ref_core(p_payment_id, p_provider_ref, p_checkout_url);
end;$$;

-- ---------------------------------------------------------------------
-- 3. fund_escrow — reached from `record_payment_result`, so usually already
-- inside a context. Takes one of its own anyway: it is granted to
-- service_role and nothing stops a future caller reaching it directly.
--
-- The escrow has no trace of its own, so the trace comes from the payment
-- that funded it — which is the same answer, since that payment is the reason
-- this call is happening.
-- ---------------------------------------------------------------------
alter function public.fund_escrow(uuid) rename to fund_escrow_core;

create function public.fund_escrow(
  p_escrow_id uuid,
  p_context   jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'fund_escrow');
  perform public._ensure_correlation((
    select p.correlation_id
      from public.escrow_transactions t
      join public.payments p on p.id = t.funding_payment_id
     where t.id = p_escrow_id));
  perform public.fund_escrow_core(p_escrow_id);
end;$$;

-- ---------------------------------------------------------------------
-- 4. release_advance — the `escrow-lifecycle` cron's main verb, and the
-- clearest example of what was missing. An advance released on a timer and an
-- advance released by a Finance admin produced identical audit rows.
-- ---------------------------------------------------------------------
alter function public.release_advance(uuid) rename to release_advance_core;

create function public.release_advance(
  p_escrow_id uuid,
  p_context   jsonb default null)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'release_advance');
  perform public._ensure_correlation((
    select p.correlation_id
      from public.escrow_transactions t
      join public.payments p on p.id = t.funding_payment_id
     where t.id = p_escrow_id));
  return public.release_advance_core(p_escrow_id);
end;$$;

-- ---------------------------------------------------------------------
-- 5. approve_escrow_release — a human action by definition (it is gated on a
-- Finance permission), so the clamp will force 'user' every time it is called
-- the way it is meant to be. The context is still worth setting: it carries
-- the correlation id, which is what puts the release ledger legs on the same
-- trace as the payment that funded them.
-- ---------------------------------------------------------------------
alter function public.approve_escrow_release(uuid) rename to approve_escrow_release_core;

create function public.approve_escrow_release(
  p_escrow_id uuid,
  p_context   jsonb default null)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'approve_escrow_release');
  perform public._ensure_correlation((
    select p.correlation_id
      from public.escrow_transactions t
      join public.payments p on p.id = t.funding_payment_id
     where t.id = p_escrow_id));
  return public.approve_escrow_release_core(p_escrow_id);
end;$$;

-- ---------------------------------------------------------------------
-- 6. request_refund — granted to `authenticated`; a client asks for their
-- money back from a browser. The clamp is doing real work here.
-- ---------------------------------------------------------------------
alter function public.request_refund(uuid, refund_reason, text, uuid)
  rename to request_refund_core;

create function public.request_refund(
  p_escrow_id  uuid,
  p_reason     refund_reason,
  p_notes      text  default null,
  p_dispute_id uuid  default null,
  p_context    jsonb default null)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'request_refund');
  perform public._ensure_correlation((
    select p.correlation_id
      from public.escrow_transactions t
      join public.payments p on p.id = t.funding_payment_id
     where t.id = p_escrow_id));
  return public.request_refund_core(p_escrow_id, p_reason, p_notes, p_dispute_id);
end;$$;

-- ---------------------------------------------------------------------
-- 7. approve_refund — the trace is reached through the refund's escrow, which
-- is the only link a refund has back to the money that arrived.
-- ---------------------------------------------------------------------
alter function public.approve_refund(uuid, numeric) rename to approve_refund_core;

create function public.approve_refund(
  p_refund_id       uuid,
  p_override_amount numeric default null,
  p_context         jsonb   default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'approve_refund');
  perform public._ensure_correlation((
    select p.correlation_id
      from public.refunds r
      join public.escrow_transactions t on t.id = r.escrow_id
      join public.payments p on p.id = t.funding_payment_id
     where r.id = p_refund_id));
  perform public.approve_refund_core(p_refund_id, p_override_amount);
end;$$;

-- ---------------------------------------------------------------------
-- 8. raise_reconciliation_exception — the queue Finance works from, and the
-- one place where knowing WHICH automated process filed a finding changes
-- what a human does about it. An `orphan_payment` raised by `create-payment`
-- means a checkout was opened and its reference could not be stored; the same
-- kind raised by the hourly sweep means a payment succeeded against nothing.
-- Same row shape, different emergencies.
--
-- Two possible traces, in order of specificity: the payment named on the
-- exception, then the escrow's funding payment.
-- ---------------------------------------------------------------------
alter function public.raise_reconciliation_exception(
  reconciliation_kind, text, text, jsonb, numeric, numeric, uuid, uuid, uuid, text)
  rename to raise_reconciliation_exception_core;

create function public.raise_reconciliation_exception(
  p_kind       reconciliation_kind,
  p_dedupe_key text,
  p_detail     text,
  p_metadata   jsonb    default '{}'::jsonb,
  p_expected   numeric  default null,
  p_actual     numeric  default null,
  p_escrow_id  uuid     default null,
  p_payment_id uuid     default null,
  p_payout_id  uuid     default null,
  p_severity   text     default 'warning',
  p_context    jsonb    default null)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'raise_reconciliation_exception');
  perform public._ensure_correlation(coalesce(
    (select p.correlation_id from public.payments p where p.id = p_payment_id),
    (select p.correlation_id
       from public.escrow_transactions t
       join public.payments p on p.id = t.funding_payment_id
      where t.id = p_escrow_id)));
  return public.raise_reconciliation_exception_core(
    p_kind, p_dedupe_key, p_detail, p_metadata, p_expected, p_actual,
    p_escrow_id, p_payment_id, p_payout_id, p_severity);
end;$$;

-- ---------------------------------------------------------------------
-- 9. activate_subscription — reached from `record_payment_result` when a
-- subscription payment succeeds, and it refuses to run without one
-- (0903l:534), so the payment is always there to take the trace from.
-- ---------------------------------------------------------------------
alter function public.activate_subscription(uuid, uuid) rename to activate_subscription_core;

create function public.activate_subscription(
  p_subscription_id uuid,
  p_payment_id      uuid  default null,
  p_context         jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._set_payment_context(p_context, 'activate_subscription');
  perform public._ensure_correlation(
    (select p.correlation_id from public.payments p where p.id = p_payment_id));
  perform public.activate_subscription_core(p_subscription_id, p_payment_id);
end;$$;

-- ---------------------------------------------------------------------
-- 10. activate_escrow — where a client checkout begins, and therefore where
-- the trace is minted. Two paths through it and both must yield the same id:
--
--   * a fresh checkout inserts a payment, `trg_payment_correlation` mints an
--     id and publishes it to the transaction, and every row that follows
--     inside `activate_escrow` — the escrow, the audit rows, the outbox rows
--     from `escrow_notify` — is already on it;
--   * an idempotent replay inserts nothing and returns the payment it opened
--     the first time, so the wrapper reads the trace back off that row.
--
-- The returns table gains `correlation_id` as a seventh column. `create-payment`
-- needs it in hand to thread through the PSP submission and into its own
-- `payment_logs` and audit writes, and reading it back with a second query
-- would be a second round trip for a value this call already knows.
-- ---------------------------------------------------------------------
alter function public.activate_escrow(uuid, payment_provider, payment_method, text)
  rename to activate_escrow_core;

create function public.activate_escrow(
  p_booking_id      uuid,
  p_provider        payment_provider,
  p_method          payment_method,
  p_idempotency_key text  default null,
  p_context         jsonb default null)
returns table (
  payment_id     uuid,
  escrow_id      uuid,
  amount         numeric,
  currency       text,
  provider_ref   text,
  checkout_url   text,
  correlation_id uuid)
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform public._set_payment_context(p_context, 'activate_escrow');

  for r in
    select * from public.activate_escrow_core(
      p_booking_id, p_provider, p_method, p_idempotency_key)
  loop
    -- Covers the replay path, where nothing was inserted and so nothing was
    -- minted. On the insert path the trigger has already set this exact value
    -- and `_ensure_correlation` leaves it alone.
    return query
      select r.payment_id, r.escrow_id, r.amount, r.currency,
             r.provider_ref, r.checkout_url,
             public._ensure_correlation((
               select p.correlation_id from public.payments p where p.id = r.payment_id));
  end loop;
end;$$;

-- ---------------------------------------------------------------------
-- 11. activate_subscription_payment — the same shape for the vendor's side.
-- ---------------------------------------------------------------------
alter function public.activate_subscription_payment(
  uuid, uuid, payment_provider, payment_method, text)
  rename to activate_subscription_payment_core;

create function public.activate_subscription_payment(
  p_vendor_id       uuid,
  p_plan_id         uuid,
  p_provider        payment_provider,
  p_method          payment_method,
  p_idempotency_key text  default null,
  p_context         jsonb default null)
returns table (
  payment_id      uuid,
  subscription_id uuid,
  amount          numeric,
  currency        text,
  plan_name       text,
  billing_cycle   billing_cycle,
  provider_ref    text,
  checkout_url    text,
  correlation_id  uuid)
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform public._set_payment_context(p_context, 'activate_subscription_payment');

  for r in
    select * from public.activate_subscription_payment_core(
      p_vendor_id, p_plan_id, p_provider, p_method, p_idempotency_key)
  loop
    return query
      select r.payment_id, r.subscription_id, r.amount, r.currency,
             r.plan_name, r.billing_cycle, r.provider_ref, r.checkout_url,
             public._ensure_correlation((
               select p.correlation_id from public.payments p where p.id = r.payment_id));
  end loop;
end;$$;

-- =====================================================================
-- GRANTS.
--
-- The `_core` functions inherited the grants of the names they used to have,
-- which now have to come off: leaving `record_payment_result_core` executable
-- by service_role would leave a second, uncontextualised door into every
-- state change this migration just made attributable, and PostgREST would
-- expose it by name. The public wrappers get exactly the grants their
-- predecessors held — no more, no less.
-- =====================================================================
revoke all on function public.record_payment_result_core(uuid, payment_status, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.attach_payment_provider_ref_core(uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.fund_escrow_core(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.release_advance_core(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.approve_escrow_release_core(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.request_refund_core(uuid, refund_reason, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.approve_refund_core(uuid, numeric)
  from public, anon, authenticated, service_role;
revoke all on function public.raise_reconciliation_exception_core(
  reconciliation_kind, text, text, jsonb, numeric, numeric, uuid, uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.activate_subscription_core(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.activate_escrow_core(uuid, payment_provider, payment_method, text)
  from public, anon, authenticated, service_role;
revoke all on function public.activate_subscription_payment_core(
  uuid, uuid, payment_provider, payment_method, text)
  from public, anon, authenticated, service_role;

-- service_role only: the webhooks, the sweeps and `create-payment`'s admin
-- half. Unchanged from 0809c / 0903i.
revoke all on function public.record_payment_result(uuid, payment_status, text, text, jsonb)
  from anon, authenticated;
grant execute on function public.record_payment_result(uuid, payment_status, text, text, jsonb)
  to service_role;

revoke all on function public.attach_payment_provider_ref(uuid, text, text, jsonb)
  from anon, authenticated;
grant execute on function public.attach_payment_provider_ref(uuid, text, text, jsonb)
  to service_role;

revoke all on function public.fund_escrow(uuid, jsonb) from anon, authenticated;
grant execute on function public.fund_escrow(uuid, jsonb) to service_role;

revoke all on function public.release_advance(uuid, jsonb) from anon, authenticated;
grant execute on function public.release_advance(uuid, jsonb) to service_role;

revoke all on function public.raise_reconciliation_exception(
  reconciliation_kind, text, text, jsonb, numeric, numeric, uuid, uuid, uuid, text, jsonb)
  from anon, authenticated;
grant execute on function public.raise_reconciliation_exception(
  reconciliation_kind, text, text, jsonb, numeric, numeric, uuid, uuid, uuid, text, jsonb)
  to service_role;

revoke all on function public.activate_subscription(uuid, uuid, jsonb) from anon, authenticated;
grant execute on function public.activate_subscription(uuid, uuid, jsonb) to service_role;

-- Reached from a portal by a signed-in person; the permission check is inside
-- the core, exactly as it was.
revoke all on function public.approve_escrow_release(uuid, jsonb) from anon;
grant execute on function public.approve_escrow_release(uuid, jsonb) to authenticated, service_role;

revoke all on function public.request_refund(uuid, refund_reason, text, uuid, jsonb) from anon;
grant execute on function public.request_refund(uuid, refund_reason, text, uuid, jsonb)
  to authenticated, service_role;

revoke all on function public.approve_refund(uuid, numeric, jsonb) from anon;
grant execute on function public.approve_refund(uuid, numeric, jsonb) to authenticated, service_role;

revoke all on function public.activate_escrow(uuid, payment_provider, payment_method, text, jsonb)
  from anon;
grant execute on function public.activate_escrow(uuid, payment_provider, payment_method, text, jsonb)
  to authenticated, service_role;

revoke all on function public.activate_subscription_payment(
  uuid, uuid, payment_provider, payment_method, text, jsonb) from public, anon;
grant execute on function public.activate_subscription_payment(
  uuid, uuid, payment_provider, payment_method, text, jsonb) to authenticated, service_role;

-- =====================================================================
-- VERIFY.
--
-- Two things, both of which would otherwise fail silently.
--
-- FIRST, that no old signature survived. An overload left behind is the
-- PGRST203 trap: PostgREST cannot choose between two candidates for a call
-- that omits `p_context`, and every webhook starts failing at once. This
-- catches it here rather than in production.
--
-- SECOND, that each public name is still the wrapper. This is the guard on
-- the rule stated in the header — a later `create or replace` on the public
-- name instead of the `_core` would drop the context and quietly return every
-- one of these rows to 'system', with nothing else changing.
-- =====================================================================
do $$
declare
  r      record;
  v_def  text;
  v_n    integer;
begin
  for r in
    select * from (values
      ('record_payment_result',          5),
      ('attach_payment_provider_ref',    4),
      ('fund_escrow',                    2),
      ('release_advance',                2),
      ('approve_escrow_release',         2),
      ('request_refund',                 5),
      ('approve_refund',                 3),
      ('raise_reconciliation_exception', 11),
      ('activate_subscription',          3),
      ('activate_escrow',                5),
      ('activate_subscription_payment',  6)
    ) as t(fname, nargs)
  loop
    select count(*) into v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = r.fname;

    if v_n <> 1 then
      raise exception
        '% has % definitions, expected exactly 1 — an old signature survived the rename '
        'and PostgREST will refuse every call that omits p_context (PGRST203)',
        r.fname, v_n;
    end if;

    select pg_get_functiondef(p.oid), p.pronargs into v_def, v_n
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = r.fname;

    if v_n <> r.nargs then
      raise exception '% takes % arguments, expected %', r.fname, v_n, r.nargs;
    end if;
    if v_def not like '%_set_payment_context%' then
      raise exception
        '% no longer establishes an audit context. A migration has replaced the public '
        'name instead of %_core — every row it writes is now attributed to ''system''.',
        r.fname, r.fname;
    end if;
    if v_def not like ('%' || r.fname || '_core%') then
      raise exception '% no longer delegates to %_core', r.fname, r.fname;
    end if;
  end loop;

  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.payments'::regclass and tgname = 'trg_payment_correlation') then
    raise exception 'trg_payment_correlation is not attached to payments';
  end if;
end$$;
