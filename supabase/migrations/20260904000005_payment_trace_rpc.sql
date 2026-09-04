-- =====================================================================
-- Sinnapi — 0904e Reading the trace: one id, one ordered story
--
-- An audit trail nobody can query is a compliance artefact, not a tool. 0904a
-- through 0904d put the attribution and the correlation on the rows; this is
-- the function that turns them back into an answer.
--
-- THE ACCEPTANCE TEST THIS EXISTS TO PASS
-- Given one correlation id, a single query returns the complete life of that
-- transaction, in order, across all seven tables:
--
--   payments         the charge itself
--   audit_logs       every state change, and who caused it
--   payment_logs     the raw provider traffic
--   payment_events   what each delivery was gated as and what came of it
--   ledger_entries   the double-entry postings
--   escrow_events    the domain stream
--   outbox           what we told people, and whether it went
--
-- One ordered axis, `actor_kind` on every row that has one. Seven `select`s
-- unioned rather than seven round trips, because the ordering is the product:
-- interleaving them client-side means paginating seven cursors in lockstep,
-- and getting it subtly wrong the first time a log row and an audit row share
-- a millisecond.
--
-- WHY AN RPC AND NOT SEVEN POSTGREST READS
-- The same reason `get_payment_admin` is an RPC (0903j:204): a `payments.read`
-- holder cannot read `profiles`, so resolving the actor's name — the single
-- most useful column on an audit row — is impossible from the client. And
-- `ledger_entries`, `escrow_events` and `outbox` are gated on finance
-- permissions this caller may not hold, which the client would have to
-- discover by receiving an error rather than by being told.
--
-- PERMISSIONS. Gated on `payments.read`, matching `get_payment_admin`, with
-- the finance-only streams (ledger, escrow events, outbox) included only for a
-- caller who also holds `finance.read` or `finance.reconcile` — the same
-- any-of rule the reconciliation page uses. A caller without them gets the
-- payment story without the accounting, rather than an error.
-- =====================================================================

-- ---------------------------------------------------------------------
-- REDACTION AT THE READING END.
--
-- `payment_logs.payload` is redacted on write by the shared Edge helper, and
-- rows written before that helper existed are not. Rather than trusting the
-- writer for all time, the trace strips the known secret keys again on the way
-- out — belt and braces on the one column in this system that has ever been
-- handed a whole third-party response.
--
-- The list is short and specific on purpose. A `payload` is evidence; a
-- reader that guesses at what looks sensitive removes the field an
-- investigator opened the page for. These are the keys that are never
-- evidence: an authorization header, a token, a consumer key or secret.
--
-- THERE IS NO CARDHOLDER DATA IN THIS SYSTEM AND THERE MUST NEVER BE. Card
-- details are entered on the provider's own hosted page — `useEscrowCheckout`
-- hands off with a full navigation, never a form — which is what keeps Sinnapi
-- in PCI SAQ A scope. Nothing below is a PAN filter, because a PAN reaching
-- this database is not a redaction problem, it is an incident.
-- ---------------------------------------------------------------------
create or replace function public._redact_payload(p_payload jsonb)
returns jsonb
language plpgsql immutable parallel safe set search_path = public as $$
declare
  v_out  jsonb := p_payload;
  v_key  text;
  v_hit  text[] := '{}';
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return p_payload;
  end if;

  foreach v_key in array array[
    'authorization', 'Authorization', 'token', 'access_token', 'bearer',
    'consumer_key', 'consumer_secret', 'client_secret', 'apikey', 'api_key',
    'password', 'secret', 'account_number', 'accountNumber'
  ] loop
    if v_out ? v_key then
      v_out := v_out - v_key;
      v_hit := v_hit || v_key;
    end if;
  end loop;

  if array_length(v_hit, 1) is null then
    return v_out;
  end if;
  -- Say what was taken. A reader must be able to tell a redacted field from a
  -- field the provider never sent; those mean very different things.
  return v_out || jsonb_build_object('_redacted', to_jsonb(v_hit));
end;$$;

-- ---------------------------------------------------------------------
-- get_payment_trace — the seven-table union.
--
-- Every row is flattened to the same six columns so they can share one
-- ordering, plus a `detail` jsonb carrying whatever is particular to that
-- stream. `occurred_at` is the sort key everywhere, taken from whichever
-- column each table happens to call it (`received_at`, `created_at`,
-- `occurred_at`) — which is itself part of why this belongs in one function
-- rather than in seven client-side reads.
--
-- `stream` is the tie-breaker after time, and its order is the order the
-- events causally happen in a checkout: the payment exists, then it is
-- audited, then the provider is talked to, then the delivery is gated, then
-- the ledger moves, then the domain event fires, then people are told. Rows
-- sharing a timestamp — and they do, constantly, because they are written in
-- one transaction — then read in the order they make sense in.
-- ---------------------------------------------------------------------
create or replace function public.get_payment_trace(p_correlation_id uuid)
returns table (
  occurred_at timestamptz,
  stream      text,
  label       text,
  actor_kind  audit_actor_kind,
  actor_label text,
  actor_name  text,
  detail      jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_finance boolean;
begin
  if not public.has_permission('payments.read') then perform public._forbidden(); end if;
  v_finance := public.has_permission('finance.read') or public.has_permission('finance.reconcile');

  return query
  with rows_all as (
    -- 1. The charge. One row, the anchor the rest hang off.
    select p.created_at as occurred_at, 'payment'::text as stream, 1 as ord,
           ('Payment ' || p.status)::text as label,
           null::audit_actor_kind as actor_kind, null::text as actor_label,
           pr.full_name as actor_name,
           jsonb_build_object(
             'payment_id',      p.id,
             'purpose',         p.purpose,
             'status',          p.status,
             'provider',        p.provider,
             'provider_method', p.provider_method,
             'provider_ref',    p.provider_ref,
             'amount',          p.amount,
             'currency',        p.currency,
             'paid_at',         p.paid_at,
             'failure_reason',  p.failure_reason,
             'booking_id',      p.booking_id,
             'escrow_id',       p.escrow_id,
             'subscription_id', p.subscription_id) as detail
      from public.payments p
      left join public.profiles pr on pr.id = p.payer_id
     where p.correlation_id = p_correlation_id

    union all

    -- 2. Every state change and who caused it. The reason this whole thing
    -- exists, so it carries the actor columns in full.
    select a.occurred_at, 'audit', 2,
           a.action,
           a.actor_kind, a.actor_label, pr.full_name,
           jsonb_strip_nulls(jsonb_build_object(
             'entity_type', a.entity_type,
             'entity_id',   a.entity_id,
             'source',      a.source,
             'ip_address',  host(a.ip_address),
             'user_agent',  a.user_agent,
             'before',      a.before,
             'after',       a.after))
      from public.audit_logs a
      left join public.profiles pr on pr.id = a.actor_id
     where a.correlation_id = p_correlation_id

    union all

    -- 3. Raw provider traffic, redacted again on the way out.
    select l.received_at, 'psp_traffic', 3,
           (l.direction || ' ' || coalesce(l.event_type, 'message')),
           null, null, null,
           jsonb_strip_nulls(jsonb_build_object(
             'provider',        l.provider,
             'direction',       l.direction,
             'http_status',     l.http_status,
             'signature_valid', l.signature_valid,
             'payload',         public._redact_payload(l.payload)))
      from public.payment_logs l
     where l.correlation_id = p_correlation_id

    union all

    -- 4. The idempotency gate and what each delivery became.
    select e.received_at, 'delivery', 4,
           coalesce(e.event_type, 'delivery'),
           null, null, null,
           jsonb_strip_nulls(jsonb_build_object(
             'provider',     e.provider,
             'event_id',     e.event_id,
             'outcome',      e.outcome,
             'processed_at', e.processed_at))
      from public.payment_events e
     where e.correlation_id = p_correlation_id

    union all

    -- 5. The money itself.
    select le.occurred_at, 'ledger', 5,
           (le.direction || ' ' || le.account),
           null, null, null,
           jsonb_strip_nulls(jsonb_build_object(
             'entry_group_id', le.entry_group_id,
             'account',        le.account,
             'direction',      le.direction,
             'amount',         le.amount,
             'currency',       le.currency,
             'description',    le.description))
      from public.ledger_entries le
     where le.correlation_id = p_correlation_id
       and v_finance

    union all

    -- 6. The domain stream. Carries actor columns of its own since 0904b.
    select ev.occurred_at, 'escrow', 6,
           ev.event_type::text,
           ev.actor_kind, ev.actor_label, pr.full_name,
           jsonb_strip_nulls(jsonb_build_object(
             'escrow_id', ev.escrow_id,
             'amount',    ev.amount,
             'metadata',  ev.metadata))
      from public.escrow_events ev
      left join public.profiles pr on pr.id = ev.actor_id
     where ev.correlation_id = p_correlation_id
       and v_finance

    union all

    -- 7. What we told people, and whether it actually went. A trace that ends
    -- at "payment succeeded" answers half the question support was asked.
    select o.created_at, 'notification', 7,
           o.event_type,
           null, null, null,
           jsonb_strip_nulls(jsonb_build_object(
             'aggregate_type', o.aggregate_type,
             'aggregate_id',   o.aggregate_id,
             'status',         o.status,
             'attempts',       o.attempts,
             'processed_at',   o.processed_at,
             'error',          o.error,
             'audience',       o.payload ->> 'audience',
             'recipient_id',   o.payload ->> 'recipient_id'))
      from public.outbox o
     where o.correlation_id = p_correlation_id
       and v_finance
  )
  select r.occurred_at, r.stream, r.label, r.actor_kind, r.actor_label,
         r.actor_name, r.detail
    from rows_all r
   order by r.occurred_at asc, r.ord asc;
end;$$;

revoke all on function public.get_payment_trace(uuid) from public, anon;
grant execute on function public.get_payment_trace(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- resolve_correlation_id — the lookup support actually starts from.
--
-- Nobody arrives holding a correlation id. They arrive holding whatever the
-- person in front of them read out: a payment id from an email, a provider
-- reference from a bank statement, a Pesapal tracking id from the PSP's own
-- dashboard, or a booking reference. All four resolve to the same trace, and
-- making the console ask for the one identifier a human never has would waste
-- the entire feature.
--
-- Ordered by specificity, and `provider_ref` before `booking_id` deliberately:
-- a booking can have several payment attempts, so it is the loosest handle and
-- the last one tried. Returns the newest match when a booking has more than
-- one; the drawer offers the rest.
-- ---------------------------------------------------------------------
create or replace function public.resolve_correlation_id(p_handle text)
returns table (correlation_id uuid, payment_id uuid, matched_on text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_handle text := btrim(coalesce(p_handle, ''));
  v_uuid   uuid := public._try_uuid(v_handle);
begin
  if not public.has_permission('payments.read') then perform public._forbidden(); end if;
  if v_handle = '' then return; end if;

  return query
  select p.correlation_id, p.id,
         case
           when p.correlation_id = v_uuid          then 'correlation_id'
           when p.id = v_uuid                      then 'payment_id'
           when p.provider_ref = v_handle          then 'provider_ref'
           when p.client_idempotency_key = v_handle then 'idempotency_key'
           else 'booking_reference'
         end
    from public.payments p
    left join public.bookings b on b.id = p.booking_id
   where p.correlation_id is not null
     and (
       (v_uuid is not null and (p.correlation_id = v_uuid or p.id = v_uuid or b.id = v_uuid))
       or p.provider_ref = v_handle
       or p.client_idempotency_key = v_handle
       or b.reference_no = upper(v_handle)
     )
   order by p.created_at desc
   limit 25;
end;$$;

revoke all on function public.resolve_correlation_id(text) from public, anon;
grant execute on function public.resolve_correlation_id(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- search_audit_logs — the Audit page's read, moved server-side.
--
-- `useAuditLogs` builds a PostgREST query today and filters actors with
-- `actor_id is null`, which is the binary this whole change exists to
-- replace. It cannot simply gain an `actor_kind` filter and stay where it is:
-- the actor's NAME comes from an embed on `profiles`, and the page needs to
-- offer `actor_kind` and `correlation_id` alongside it, over a table whose
-- RLS policy already restricts by permission. Doing that as one RPC keeps the
-- filter set and the permission in the same place.
--
-- Returns the total alongside the page so the console's pager has a count
-- without a second head request.
-- ---------------------------------------------------------------------
create or replace function public.search_audit_logs(
  p_op          text    default null,
  p_entity_type text    default null,
  p_actor_kind  text    default null,
  p_correlation uuid    default null,
  p_actor_id    uuid    default null,
  p_from        timestamptz default null,
  p_to          timestamptz default null,
  p_limit       integer default 25,
  p_offset      integer default 0)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_kind  audit_actor_kind := null;
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 200);
  v_total bigint;
  v_rows  jsonb;
begin
  if not public.has_permission('audit.read') then perform public._forbidden(); end if;

  -- An unrecognised kind is refused rather than ignored. Silently dropping it
  -- would show the caller every row while their toolbar says one kind is
  -- selected, which is the worst of the three possible behaviours.
  if nullif(btrim(coalesce(p_actor_kind, '')), '') is not null then
    begin
      v_kind := btrim(p_actor_kind)::audit_actor_kind;
    exception when invalid_text_representation then
      raise exception 'unknown_actor_kind: %', p_actor_kind;
    end;
  end if;

  with filtered as (
    select a.*
      from public.audit_logs a
     where (p_op          is null or a.action like p_op || '\_%')
       and (p_entity_type is null or a.entity_type = p_entity_type)
       and (v_kind        is null or a.actor_kind = v_kind)
       and (p_correlation is null or a.correlation_id = p_correlation)
       and (p_actor_id    is null or a.actor_id = p_actor_id)
       and (p_from        is null or a.occurred_at >= p_from)
       and (p_to          is null or a.occurred_at <= p_to)
  )
  select count(*), coalesce(jsonb_agg(x.row order by x.occurred_at desc), '[]'::jsonb)
    into v_total, v_rows
    from (
      select f.occurred_at,
             jsonb_build_object(
               'id',             f.id,
               'action',         f.action,
               'entity_type',    f.entity_type,
               'entity_id',      f.entity_id,
               'actor_id',       f.actor_id,
               'actor_kind',     f.actor_kind,
               'actor_label',    f.actor_label,
               'correlation_id', f.correlation_id,
               'source',         f.source,
               'occurred_at',    f.occurred_at,
               'ip_address',     host(f.ip_address),
               'user_agent',     f.user_agent,
               'device',         f.device,
               'os',             f.os,
               'browser',        f.browser,
               'country_code',   f.country_code,
               'before',         f.before,
               'after',          f.after,
               -- The actor's roles come back with them. The page renders them
               -- as chips beside the name, and a `payments.read` holder cannot
               -- read `profiles` — let alone `user_roles` — from the client, so
               -- dropping them here would silently empty a column the console
               -- has always shown.
               'actor', case when pr.id is null then null else jsonb_build_object(
                 'id',        pr.id,
                 'full_name', pr.full_name,
                 'email',     pr.email,
                 'user_roles', coalesce((
                   select jsonb_agg(jsonb_build_object(
                            'roles', jsonb_build_object(
                              'id',       ro.id,
                              'key',      ro.key,
                              'name',     ro.name,
                              'is_admin', ro.is_admin))
                          order by ro.name)
                     from public.user_roles ur
                     join public.roles ro on ro.id = ur.role_id
                    where ur.profile_id = pr.id), '[]'::jsonb)) end) as row
        from filtered f
        left join public.profiles pr on pr.id = f.actor_id
       order by f.occurred_at desc
       limit v_limit offset greatest(coalesce(p_offset, 0), 0)
    ) x,
    lateral (select count(*) from filtered) c(n)
   group by c.n;

  -- `jsonb_agg` over an empty page yields no group at all, so the count has to
  -- be re-read rather than assumed: an offset past the end still has a total.
  if v_total is null then
    select count(*) into v_total
      from public.audit_logs a
     where (p_op          is null or a.action like p_op || '\_%')
       and (p_entity_type is null or a.entity_type = p_entity_type)
       and (v_kind        is null or a.actor_kind = v_kind)
       and (p_correlation is null or a.correlation_id = p_correlation)
       and (p_actor_id    is null or a.actor_id = p_actor_id)
       and (p_from        is null or a.occurred_at >= p_from)
       and (p_to          is null or a.occurred_at <= p_to);
    v_rows := '[]'::jsonb;
  end if;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;$$;

revoke all on function public.search_audit_logs(
  text, text, text, uuid, uuid, timestamptz, timestamptz, integer, integer) from public, anon;
grant execute on function public.search_audit_logs(
  text, text, text, uuid, uuid, timestamptz, timestamptz, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- get_payment_admin — 0903j's read, plus the trace handle.
--
-- The detail page needs the correlation id to fetch the trace, and adding it
-- to the document it already fetches saves the drawer a round trip before it
-- can render its primary view. The rest of the document is untouched: this is
-- a `jsonb_set` on the result rather than a reproduction of a 200-line
-- builder, for the same reason 0904c wrapped rather than retyped.
-- ---------------------------------------------------------------------
alter function public.get_payment_admin(uuid) rename to get_payment_admin_core;

create function public.get_payment_admin(p_payment_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_doc  jsonb := public.get_payment_admin_core(p_payment_id);
  v_corr uuid;
begin
  if v_doc is null then return null; end if;
  select p.correlation_id into v_corr from public.payments p where p.id = p_payment_id;
  return v_doc || jsonb_build_object('correlation_id', v_corr);
end;$$;

revoke all on function public.get_payment_admin_core(uuid) from public, anon, authenticated;
revoke all on function public.get_payment_admin(uuid) from public, anon;
grant execute on function public.get_payment_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- VERIFY. Same overload guard as 0904c and 0904d.
-- ---------------------------------------------------------------------
do $$
declare v_n integer;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'get_payment_admin';
  if v_n <> 1 then
    raise exception 'get_payment_admin has % definitions, expected exactly 1 (PGRST203)', v_n;
  end if;
end$$;
