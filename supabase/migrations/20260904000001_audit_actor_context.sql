-- =====================================================================
-- Sinnapi — 0904a Attribution: who actually performed a money action
--
-- THE DEFECT
-- `tg_write_audit` (0618b:186) writes `actor_id = auth.uid()` and nothing
-- else. Under a Pesapal IPN, under the hourly reconciliation sweep, under
-- every pg_cron job and under every Edge Function holding the service-role
-- key, `auth.uid()` is NULL. The trigger fires, the row lands, and it names
-- nobody.
--
-- The admin Audit page then reads that NULL as a single fact — `useAuditLogs`
-- filters `actor_id is null` and labels the whole bucket "system". So a
-- payment that flipped to `succeeded` gives an investigator no way to tell:
--
--   * a Pesapal IPN applying the provider's own answer,       from
--   * the reconciliation sweep resolving a lost webhook,      from
--   * a Finance admin moving it by hand through an RPC.
--
-- Those are three completely different incidents. One of them is routine,
-- one means a webhook was lost, and one means a human touched money. The
-- audit trail has never been able to distinguish them.
--
-- WHY A COLUMN AND NOT A CONVENTION
-- The information exists at the moment of the write — the IPN handler knows
-- it is an IPN — and is destroyed by the time anyone reads the row. Nothing
-- downstream can reconstruct it: `action` is derived from the table name,
-- `before`/`after` are row snapshots, and `entity_type` is the table. There
-- is no field on the row today whose value differs between an IPN and a cron.
--
-- HOW THE CONTEXT TRAVELS
-- Not as a column on the changed row, and not through a "set context" RPC
-- called beforehand. It travels as a transaction-local GUC — the
-- `set_config('sinnapi.*', value, true)` idiom this codebase already uses for
-- `sinnapi.status_reason` (20260812000001:139, 20260813000002:120) — set at
-- the top of the money RPC's own body, so the triggers that fire later in
-- THAT SAME transaction can read it.
--
-- This is the constraint that decides the whole design. `set_config(..., true)`
-- is transaction-local, and every supabase-js `.rpc()` call is its own
-- transaction. An Edge Function CANNOT call a "set context" RPC and then call
-- `record_payment_result` and expect the context to survive — the first
-- transaction committed and took the setting with it. The context therefore
-- has to be passed AS AN ARGUMENT into each money RPC (0904c), which calls
-- `_set_payment_context` at the top of its own body.
--
-- WHY THE CONTEXT IS CLAMPED, NOT TRUSTED
-- `p_context` is an argument, so whoever calls the RPC chooses its contents —
-- and three of the money RPCs (`request_refund`, `approve_refund`,
-- `approve_escrow_release`) are granted to `authenticated` and called from a
-- browser. Left untrusted, a signed-in client could approve their own refund
-- and have the audit row read `actor_kind = 'psp_webhook'`, forging the exact
-- trail this migration exists to make trustworthy.
--
-- So `_set_payment_context` clamps: when `auth.uid()` is not null the actor is
-- a person, full stop — kind is forced to 'user' and the caller's actor_label
-- is discarded. Only a caller with no JWT identity at all (service_role, which
-- is the one thing a browser cannot present) may assert 'psp_webhook', 'cron'
-- or 'reconciliation' — and it may assert 'user' only by NAMING the person in
-- `actor_id`, which is how `create-payment` attributes the privileged half of
-- a checkout it has already authenticated. A bare claim of 'user' with nobody
-- named is a claim with no content, and is refused.
--
-- WHAT THIS MIGRATION DOES NOT DO
-- It does not touch `trg_append_only` or the 7-year legal hold on `audit_logs`
-- (0618l:168). Both stay exactly as they are. The backfill below temporarily
-- disables the append-only trigger — the only way to write columns onto rows
-- that already exist — and re-enables it in the same transaction.
-- =====================================================================

-- ---------------------------------------------------------------------
-- THE ACTOR KINDS.
--
-- Five, and the set is deliberately closed. An enum rather than free text
-- because this is the column the Audit page groups and filters on, and a
-- typo'd 'webhook' silently becoming its own bucket is precisely the failure
-- mode that made "system" useless in the first place. The free-text detail —
-- *which* webhook, *which* cron — goes in `actor_label`, where a new value
-- costs nothing.
--
--   user           a person, acting through a portal with a JWT
--   psp_webhook    a provider telling us something (Pesapal IPN, PayPal event)
--   cron           a scheduled sweep advancing state on time
--   reconciliation the hourly cross-check against the PSPs and the ledger
--   system         a database-internal write with no external cause
--
-- `reconciliation` is separated from `cron` even though it runs on a schedule,
-- because the question an investigator asks is not "was this scheduled" but
-- "did something disagree". A reconciliation row means a webhook was lost or
-- a figure did not match; a cron row means a timer expired. Collapsing them
-- would rebuild the bucket this migration is taking apart.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_actor_kind') then
    create type audit_actor_kind as enum
      ('user', 'psp_webhook', 'cron', 'reconciliation', 'system');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- THE COLUMNS.
--
-- `actor_kind`     what sort of thing acted (see above)
-- `actor_label`    which one — 'pesapal_ipn', 'payment-reconciliation',
--                  'escrow-lifecycle'. Free text on purpose: a new Edge
--                  Function should not need a migration to be attributable.
-- `correlation_id` the trace id threaded through a whole checkout (0904b).
--                  Declared here rather than there so `tg_write_audit` can be
--                  written once, in its final form, below.
-- `source`         the Edge Function or RPC that made the write.
--
-- `actor_kind` is NOT NULL with a 'system' default. Nullable would reintroduce
-- the problem in a new shape: an unattributed row would be indistinguishable
-- from a row written before this migration, and the page would need a third
-- rendering for "we don't know" that means the same thing as "system" already
-- means. Defaulting to 'system' says it plainly.
-- ---------------------------------------------------------------------
alter table public.audit_logs
  add column if not exists actor_kind     audit_actor_kind,
  add column if not exists actor_label    text,
  add column if not exists correlation_id uuid,
  add column if not exists source         text;

-- ---------------------------------------------------------------------
-- BACKFILL.
--
-- `audit_logs` carries `trg_append_only` (0618j:66), a BEFORE UPDATE trigger
-- that raises on any update. Backfilling therefore requires disabling it —
-- there is no other way to put a value on a row that already exists. It is
-- re-enabled below, in this same transaction, so the table is never
-- append-only-off at any point another session could observe.
--
-- Two rules, not one:
--
--   * `entity_type = 'auth'` is 'user' REGARDLESS of actor_id. An
--     authentication event is always a person — 0802e's own header explains
--     that `actor_id` is null on a failed attempt precisely because the
--     account could not be identified, not because nobody tried. Backfilling
--     those to 'system' would file every wrong password under the same label
--     as a cron job, and the new Audit filter would then disagree with itself:
--     `_auth_audit` writes 'user' from here on (see below), so historical
--     failed logins would vanish from a filter that shows the new ones.
--
--   * everything else follows actor_id, which is all the information those
--     rows have ever carried.
-- ---------------------------------------------------------------------
alter table public.audit_logs disable trigger trg_append_only;

update public.audit_logs
   set actor_kind = 'user'::audit_actor_kind
 where actor_kind is null
   and (actor_id is not null or entity_type = 'auth');

update public.audit_logs
   set actor_kind = 'system'::audit_actor_kind
 where actor_kind is null;

alter table public.audit_logs enable trigger trg_append_only;

alter table public.audit_logs
  alter column actor_kind set default 'system'::audit_actor_kind;
alter table public.audit_logs
  alter column actor_kind set not null;

-- ---------------------------------------------------------------------
-- INDEXES.
--
-- `ix_audit_correlation` is the trace query's index — 0904e reads this table
-- by correlation id and nothing else. Partial, because the overwhelming
-- majority of rows (every profile edit, every role change) will never have
-- one, and there is no reason to carry them.
--
-- `ix_audit_entity_time` replaces the read half of `ix_audit_entity`
-- (0618i:18), which is `(entity_type, entity_id)` with no time component: the
-- drawer and the trace both want one entity's history newest-first, and
-- without `occurred_at desc` in the index that is an unbounded sort on every
-- open. `ix_audit_entity` is left in place — it is narrower, still serves
-- plain equality lookups, and dropping an index a running console depends on
-- is not something a migration should do as a side effect.
--
-- `ix_audit_actor_kind` serves the new toolbar filter, which is always
-- ordered by `occurred_at desc`.
-- ---------------------------------------------------------------------
create index if not exists ix_audit_correlation
  on public.audit_logs(correlation_id)
  where correlation_id is not null;

create index if not exists ix_audit_entity_time
  on public.audit_logs(entity_type, entity_id, occurred_at desc);

create index if not exists ix_audit_actor_kind
  on public.audit_logs(actor_kind, occurred_at desc);

-- ---------------------------------------------------------------------
-- GUARDED CASTS.
--
-- Everything in `p_context` arrives as JSON from an Edge Function or a
-- browser, so every value is a string that may not be what it claims. A bad
-- cast inside a money RPC would abort the transaction — a malformed
-- correlation id would refuse a payment. These swallow the cast failure and
-- return null, so a mis-shaped context degrades to an unattributed row rather
-- than a failed settlement. Attribution is telemetry hanging off the side of
-- a payment; it must never become the reason a payment fails.
-- ---------------------------------------------------------------------
create or replace function public._try_uuid(p_value text)
returns uuid language plpgsql immutable parallel safe as $$
begin
  return nullif(btrim(coalesce(p_value, '')), '')::uuid;
exception when others then
  return null;
end;$$;

create or replace function public._try_inet(p_value text)
returns inet language plpgsql immutable parallel safe as $$
begin
  return nullif(btrim(coalesce(p_value, '')), '')::inet;
exception when others then
  return null;
end;$$;

-- ---------------------------------------------------------------------
-- _set_payment_context — the writer. Called at the top of every money RPC.
--
-- Returns the resolved correlation id so the caller can thread it onto the
-- rows it is about to write, rather than re-reading its own GUC.
--
-- `p_default_source` is the RPC's own name, supplied by the RPC as a literal.
-- It is a fallback, not an override: an Edge Function that names itself
-- ('psp-pesapal-webhook') is more useful than the RPC name, because the RPC
-- name is already implied by the action. When nothing is passed, the RPC's own
-- name is still better than null.
--
-- THE CLAMP. When `auth.uid()` is not null, a person is on the other end of
-- this call and no argument may say otherwise:
--
--   * `actor_kind` is forced to 'user'
--   * `actor_label` is discarded — it is an identity claim ('pesapal_ipn'),
--     and a caller who has already been identified does not get to make one
--   * `ip` and `user_agent` are discarded — the RPC is reached through
--     PostgREST, so a browser-supplied address would be a claim about itself
--     with nothing behind it. 0802e's header makes this same point about why
--     the request context has to come from the code that actually holds it.
--
-- `correlation_id` and `source` survive the clamp. Neither asserts who acted:
-- a correlation id is a join key (and a forged one only pollutes the forger's
-- own trace), and `source` names the code path, which the action already
-- half-tells you.
--
-- NESTING. A null `p_context` never clears a context that is already set, and
-- this is load-bearing rather than defensive. The money RPCs call each other:
-- `record_payment_result` calls `fund_escrow` and `activate_subscription`,
-- `activate_escrow` calls `record_payment_result` to fail an expired checkout.
-- All of those inner calls pass no context, because they are already inside
-- the transaction the outer one contextualised. If a null argument reset the
-- GUCs, the IPN would attribute its own `payments` row correctly and then
-- attribute every escrow, ledger and outbox row it caused to 'system' — the
-- defect this migration exists to fix, reintroduced one level down.
--
-- So a null context is read as "I am not the one who knows": it establishes a
-- source if nothing has, and otherwise leaves the transaction alone.
-- ---------------------------------------------------------------------
create or replace function public._set_payment_context(
  p_context        jsonb default null,
  p_default_source text  default null)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_ctx   jsonb := coalesce(p_context, '{}'::jsonb);
  v_actor uuid;
  v_kind  text;
  v_label text;
  v_corr  uuid;
  v_src   text;
  v_ip    inet;
  v_ua    text;
begin
  if v_ctx = '{}'::jsonb then
    if nullif(current_setting('sinnapi.actor_kind', true), '') is null
       and nullif(current_setting('sinnapi.audit_source', true), '') is null then
      perform set_config('sinnapi.audit_source',
                         coalesce(left(btrim(p_default_source), 120), ''), true);
    end if;
    return public._try_uuid(current_setting('sinnapi.correlation_id', true));
  end if;

  v_corr := public._try_uuid(v_ctx ->> 'correlation_id');
  v_src  := left(nullif(btrim(coalesce(v_ctx ->> 'source', '')), ''), 120);
  v_src  := coalesce(v_src, left(nullif(btrim(coalesce(p_default_source, '')), ''), 120));

  if v_uid is not null then
    -- A person, already identified by their JWT. Nothing the caller says
    -- about identity is taken.
    v_actor := v_uid;
    v_kind  := 'user';
    v_label := null;
    v_ip    := null;
    v_ua    := null;
  else
    -- No JWT identity: service_role, pg_cron, or a trigger firing under a
    -- definer. Only these callers may name themselves.
    v_kind  := lower(btrim(coalesce(v_ctx ->> 'actor_kind', '')));
    v_actor := public._try_uuid(v_ctx ->> 'actor_id');

    if v_kind not in ('psp_webhook', 'cron', 'reconciliation', 'system', 'user') then
      v_kind := 'system';
    end if;

    -- 'user' is allowed here ONLY when the caller names the person.
    --
    -- This is not a hole in the clamp, it is the case the clamp exists to
    -- serve properly. `create-payment` authenticates the payer with
    -- `requireUser` and then does its privileged half — attaching the
    -- provider reference, failing a payment the PSP refused — through the
    -- admin client, where `auth.uid()` is null. Those writes were caused by a
    -- person and recording them as 'system' would be as wrong as recording
    -- the IPN that way.
    --
    -- A service_role caller can already insert into `audit_logs` directly, so
    -- nothing is being granted that was not already available; what is gained
    -- is that the attribution has to be specific. A bare claim of 'user' with
    -- nobody named is refused, because that is a claim with no content — the
    -- same reason `_auth_audit` (0802e) takes `p_actor_id` from a caller that
    -- has established identity rather than inferring one.
    if v_kind = 'user' and v_actor is null then
      v_kind := 'system';
    end if;

    v_label := left(nullif(btrim(coalesce(v_ctx ->> 'actor_label', '')), ''), 120);
    v_ip    := public._try_inet(v_ctx ->> 'ip');
    v_ua    := left(nullif(btrim(coalesce(v_ctx ->> 'user_agent', '')), ''), 512);
  end if;

  -- Transaction-local, every one of them. They exist for the triggers that
  -- fire later in this same statement's transaction and for nothing else.
  perform set_config('sinnapi.actor_id',       coalesce(v_actor::text, ''),  true);
  perform set_config('sinnapi.actor_kind',     v_kind,                       true);
  perform set_config('sinnapi.actor_label',    coalesce(v_label, ''),        true);
  perform set_config('sinnapi.correlation_id', coalesce(v_corr::text, ''),   true);
  perform set_config('sinnapi.audit_source',   coalesce(v_src, ''),          true);
  perform set_config('sinnapi.actor_ip',       coalesce(v_ip::text, ''),     true);
  perform set_config('sinnapi.actor_user_agent', coalesce(v_ua, ''),         true);

  return v_corr;
end;$$;

-- ---------------------------------------------------------------------
-- _payment_context — the reader. One place that decides what a write is
-- attributed to, so the trigger below and every explicit audit insert agree.
--
-- The fallback matters as much as the context does. Most writes in this
-- database are not money RPCs and will never set a context: a vendor editing
-- their profile, an admin changing a role. Those must keep behaving exactly
-- as they did — attributed to `auth.uid()` as 'user' — or this migration
-- would relabel the entire existing audit trail as 'system'.
--
-- So: an explicitly set context wins; otherwise a present `auth.uid()` means
-- 'user'; otherwise 'system'. Which is the same rule the backfill applied to
-- the rows already in the table.
-- ---------------------------------------------------------------------
create or replace function public._payment_context()
returns table (
  ctx_actor_id       uuid,
  ctx_actor_kind     audit_actor_kind,
  ctx_actor_label    text,
  ctx_correlation_id uuid,
  ctx_source         text,
  ctx_ip             inet,
  ctx_user_agent     text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_kind text := nullif(current_setting('sinnapi.actor_kind', true), '');
begin
  return query select
    -- A JWT identity always wins. The context's `actor_id` is only consulted
    -- when there is none — a service_role caller naming the person it
    -- authenticated (see `_set_payment_context`).
    coalesce(v_uid, public._try_uuid(current_setting('sinnapi.actor_id', true))),
    coalesce(
      v_kind::audit_actor_kind,
      case when v_uid is not null then 'user' else 'system' end::audit_actor_kind),
    nullif(current_setting('sinnapi.actor_label', true), ''),
    public._try_uuid(current_setting('sinnapi.correlation_id', true)),
    nullif(current_setting('sinnapi.audit_source', true), ''),
    public._try_inet(current_setting('sinnapi.actor_ip', true)),
    nullif(current_setting('sinnapi.actor_user_agent', true), '');
end;$$;

-- ---------------------------------------------------------------------
-- _ensure_correlation — adopt a trace that already exists rather than
-- starting a new one.
--
-- The reconciliation sweep re-queries a stuck payment and applies the
-- provider's answer. It has a context (it knows it is reconciliation) but no
-- correlation id, because it did not open the checkout — that happened an
-- hour ago in a different process. The payment row, however, has carried one
-- since it was created. Adopting it is what puts the reconciliation's ledger
-- postings and audit rows on the SAME trace as the original checkout, which
-- is the whole point: "this payment was opened by the client, abandoned by
-- the PSP, and finished by the sweep" is one story, and it must read as one.
--
-- Only fills a gap; never overrides. A caller that supplied a correlation id
-- meant it.
-- ---------------------------------------------------------------------
create or replace function public._ensure_correlation(p_correlation uuid)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare v_current uuid := public._try_uuid(current_setting('sinnapi.correlation_id', true));
begin
  if v_current is null and p_correlation is not null then
    perform set_config('sinnapi.correlation_id', p_correlation::text, true);
    return p_correlation;
  end if;
  return v_current;
end;$$;

-- ---------------------------------------------------------------------
-- _clear_payment_context — used by the RPCs that hand control back to a
-- caller which may go on to do something unrelated in the same transaction.
--
-- Mirrors how `sinnapi.status_reason` is set immediately before its statement
-- and blanked immediately after (20260812000001:139-143). Nothing here
-- depends on it — a transaction-local setting dies at commit either way — but
-- a context left standing is a context that can attribute the wrong write.
-- ---------------------------------------------------------------------
create or replace function public._clear_payment_context()
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  perform set_config('sinnapi.actor_id',         '', true);
  perform set_config('sinnapi.actor_kind',       '', true);
  perform set_config('sinnapi.actor_label',      '', true);
  perform set_config('sinnapi.correlation_id',   '', true);
  perform set_config('sinnapi.audit_source',     '', true);
  perform set_config('sinnapi.actor_ip',         '', true);
  perform set_config('sinnapi.actor_user_agent', '', true);
end;$$;

-- ---------------------------------------------------------------------
-- tg_write_audit — same trigger, same attachment, same 16 tables (0618j:166).
-- The only change is what it knows.
--
-- Two sources for the correlation id, and the order between them is
-- deliberate. The GUC wins because it names the operation in progress — the
-- IPN currently applying a result. The changed row's own `correlation_id`
-- (once 0904b adds it) is the fallback, which catches every write that
-- reaches a correlated row WITHOUT going through a money RPC: a PostgREST
-- update, an admin RPC that predates this work, a future cron nobody has
-- threaded yet. Reading it costs nothing — the row is already in hand as
-- jsonb — and it means a payments row can never be audited without its trace.
--
-- Still never raises for want of context: every field degrades to null.
-- ---------------------------------------------------------------------
create or replace function public.tg_write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action    text := coalesce(tg_argv[0], lower(tg_op) || '_' || tg_table_name);
  v_entity_id uuid;
  v_before    jsonb;
  v_after     jsonb;
  v_row_corr  uuid;
  c           record;
begin
  if tg_op = 'DELETE' then
    v_entity_id := old.id; v_before := to_jsonb(old); v_after := null;
  elsif tg_op = 'UPDATE' then
    v_entity_id := new.id; v_before := to_jsonb(old); v_after := to_jsonb(new);
  else
    v_entity_id := new.id; v_before := null; v_after := to_jsonb(new);
  end if;

  -- The row's own trace, when it carries one. `->>` on a table without the
  -- column simply yields null, so this is safe on all 16 attached tables.
  v_row_corr := public._try_uuid(coalesce(v_after, v_before) ->> 'correlation_id');

  select * into c from public._payment_context();

  insert into public.audit_logs(
    actor_id, actor_kind, actor_label, correlation_id, source,
    action, entity_type, entity_id, before, after,
    ip_address, user_agent, occurred_at)
  values (
    c.ctx_actor_id, c.ctx_actor_kind, c.ctx_actor_label,
    coalesce(c.ctx_correlation_id, v_row_corr), c.ctx_source,
    v_action, tg_table_name, v_entity_id, v_before, v_after,
    c.ctx_ip, c.ctx_user_agent, now());

  return coalesce(new, old);
end;$$;

-- ---------------------------------------------------------------------
-- _auth_audit — 0802e's body, now saying what kind of actor it is.
--
-- Every row this writes is a person attempting to authenticate, including the
-- ones with no `actor_id` (an unknown address, a wrong password). 0802e's own
-- header argues that inventing an actor for those would be a lie; naming the
-- KIND is not — somebody typed a password. So `actor_kind` is 'user' on all
-- of them, matching the backfill rule applied above.
--
-- `actor_label` carries the portal, which is the one thing that distinguishes
-- two otherwise identical sign-in failures.
-- ---------------------------------------------------------------------
create or replace function public._auth_audit(
  p_action     text,
  p_actor_id   uuid    default null,
  p_email      text    default null,
  p_portal     text    default null,
  p_outcome    text    default null,
  p_reason     text    default null,
  p_ip         inet    default null,
  p_user_agent text    default null,
  p_device     text    default null,
  p_os         text    default null,
  p_browser    text    default null,
  p_country    text    default null
)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  insert into public.audit_logs(
    actor_id, actor_kind, actor_label, source,
    action, entity_type, entity_id, before, after,
    ip_address, user_agent, device, os, browser, country_code, occurred_at)
  values (
    p_actor_id,
    'user'::audit_actor_kind,
    nullif(btrim(coalesce(p_portal, '')), ''),
    'auth',
    p_action,
    'auth',
    p_actor_id,
    null,
    jsonb_strip_nulls(jsonb_build_object(
      'email',   nullif(btrim(lower(coalesce(p_email, ''))), ''),
      'portal',  p_portal,
      'outcome', p_outcome,
      'reason',  p_reason,
      'device',  p_device,
      'os',      p_os,
      'browser', p_browser,
      'country', p_country
    )),
    p_ip,
    left(nullif(btrim(coalesce(p_user_agent, '')), ''), 512),
    p_device,
    p_os,
    p_browser,
    p_country,
    now());
exception when others then
  raise warning 'auth_audit_failed action=% sqlstate=%', p_action, sqlstate;
end;
$$;

-- ---------------------------------------------------------------------
-- GRANTS.
--
-- All four are internals. They are reached only from inside SECURITY DEFINER
-- functions, which run with the owner's privileges, so revoking them from
-- every client role costs nothing and closes the obvious misuse: a browser
-- calling `_set_payment_context` directly. (That call would be futile anyway —
-- it would set a GUC in its own transaction, which commits immediately — but
-- a function whose entire purpose is to be trusted by an audit trail should
-- not be callable by the people it attributes.)
-- ---------------------------------------------------------------------
revoke all on function public._try_uuid(text) from public, anon, authenticated;
revoke all on function public._try_inet(text) from public, anon, authenticated;
revoke all on function public._set_payment_context(jsonb, text) from public, anon, authenticated;
revoke all on function public._ensure_correlation(uuid) from public, anon, authenticated;
revoke all on function public._payment_context() from public, anon, authenticated;
revoke all on function public._clear_payment_context() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RETENTION — unchanged, and verified unchanged.
--
-- `purge_auth_audit_events` (0802e:472) deletes `where entity_type = 'auth'`
-- and nothing else, so no column added here can widen it and no new
-- `actor_kind` value can be caught by it. The 7-year hold on `audit_logs`
-- (0618l:168) and `trg_append_only` are both still in force — the backfill
-- above re-enabled the trigger before this line.
--
-- This is asserted rather than asserted-in-prose, because the assertion is
-- the part that survives someone editing the purge later.
-- ---------------------------------------------------------------------
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'purge_auth_audit_events';

  if v_def is null then
    raise exception 'purge_auth_audit_events is missing; 0802e must apply before 0904a';
  end if;
  if v_def not like '%entity_type = ''auth''%' then
    raise exception 'purge_auth_audit_events no longer restricts to entity_type = auth — '
      'payment audit rows are under a 7-year hold and must not be purgeable';
  end if;

  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.audit_logs'::regclass
       and tgname  = 'trg_append_only'
       and tgenabled <> 'D') then
    raise exception 'trg_append_only is missing or disabled on audit_logs after backfill';
  end if;

  if not exists (
    select 1 from public.data_retention_policies
     where data_category = 'audit_logs' and legal_hold) then
    raise exception 'audit_logs legal hold is not in force';
  end if;
end$$;
