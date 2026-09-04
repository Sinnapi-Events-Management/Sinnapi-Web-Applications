-- =====================================================================
-- Sinnapi — 0903j Payments admin search + one-payment investigation
--
-- THE GAP
-- The console could list payments and nothing more: five columns, no
-- search, no filter, no payer, no booking, no row to open. `payment_logs`
-- (every request and IPN body) and `payment_events` (every delivery and
-- what it did) were readable under `payments.read` and reachable only from
-- the SQL editor. Tracing one bad transaction meant leaving the console.
--
-- Three SECURITY DEFINER reads, following the 0717/0718 admin-search
-- convention (fixed search_path, internal authz re-check, whitelisted sort,
-- window count):
--
--   * search_payments_admin           -> one page of rows + total_count
--   * count_payments_admin_by_status  -> per-status counts for the tabs
--   * get_payment_admin               -> one payment, whole, as jsonb
--
-- All three are gated on `payments.read`, the permission the
-- `payments_read` / `payment_logs_read` / `payment_events_read` policies
-- already grant admins. The detail read joins the payer's profile and the
-- booking's reference without asking for `users.read` or `bookings.read`:
-- a payment with no payer and no booking is not something anyone can
-- investigate, and the links onward to those pages keep their own guards.
--
-- Reconciliation exceptions are the one part of the document gated
-- differently. They are included only when the caller also holds
-- `finance.read` or `finance.reconcile` — the exact predicate of the
-- `recon_read` policy — and the key is null (not an empty array) otherwise,
-- so the page can tell "none filed" from "not yours to see".
--
-- WHY THE LOG AND EVENT JOINS ARE NOT `payment_id = $1`
-- The Pesapal IPN handler writes its `payment_logs` row before it knows
-- which payment the notification is for (it has only the tracking id), and
-- its `payment_events` gate row is keyed on the tracking id for the same
-- reason. Both are usually back-filled later, but a notification that was
-- rejected — wrong merchant reference, amount mismatch — never is, and
-- those are precisely the rows an investigator needs. So the document also
-- matches on the provider's reference inside the payload, and on the
-- merchant reference (which is our payment id) where the payload carries
-- one.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Text matching. `profiles` already has trigram coverage on name and
-- email (0810). Booking references and provider references did not; the
-- search below ILIKEs both.
-- ---------------------------------------------------------------------
create index if not exists ix_bookings_reference_trgm
  on public.bookings using gin (reference_no gin_trgm_ops);
create index if not exists ix_payments_provider_ref_trgm
  on public.payments using gin (provider_ref gin_trgm_ops)
  where provider_ref is not null;
-- The list's default order and the tab counts both walk this.
create index if not exists ix_payments_created_at
  on public.payments (created_at desc);

-- ---------------------------------------------------------------------
-- search_payments_admin
--
-- Null/empty parameters mean "no constraint". Free text matches, case-
-- insensitively: the booking reference, the payer's name or email, the
-- provider's reference, and — when the term parses as a uuid — the
-- payment's own id, since that is what a reconciliation exception, a log
-- line or a support thread quotes. `p_from`/`p_to` bound `created_at`;
-- the caller widens a calendar day to its full-day bounds before sending.
-- `total_count` is a window count over the filtered set so one round trip
-- drives server-side pagination.
-- ---------------------------------------------------------------------
create or replace function public.search_payments_admin(
  p_search     text        default null,
  p_status     text        default null,
  p_provider   text        default null,
  p_purpose    text        default null,
  p_from       timestamptz default null,
  p_to         timestamptz default null,
  p_sort_field text        default 'created_at',
  p_sort_dir   text        default 'desc',
  p_limit      integer     default 25,
  p_offset     integer     default 0)
returns table (
  id                uuid,
  purpose           payment_purpose,
  provider          payment_provider,
  provider_method   payment_method,
  provider_ref      text,
  amount            numeric,
  currency          text,
  status            payment_status,
  failure_reason    text,
  created_at        timestamptz,
  paid_at           timestamptz,
  payer_id          uuid,
  payer_name        text,
  payer_email       text,
  booking_id        uuid,
  booking_reference text,
  escrow_id         uuid,
  subscription_id   uuid,
  total_count       bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort_field text;
  v_sort_dir   text;
  v_search     text := nullif(btrim(coalesce(p_search, '')), '');
  v_search_id  uuid;
begin
  if not public.has_permission('payments.read') then perform public._forbidden(); end if;

  -- A term that is a whole uuid is also tried as the payment id. Anything
  -- else is text only; `::uuid` on free text would raise, hence the guard.
  if v_search ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_search_id := v_search::uuid;
  end if;

  -- Whitelist the sort inputs — they are interpolated as identifiers into
  -- the dynamic query below and must never come straight from input.
  v_sort_field := case
    when p_sort_field in ('created_at', 'paid_at', 'amount', 'status') then p_sort_field
    else 'created_at' end;
  v_sort_dir := case when lower(coalesce(p_sort_dir, '')) = 'asc' then 'asc' else 'desc' end;

  return query execute format($q$
    select p.id, p.purpose, p.provider, p.provider_method, p.provider_ref,
           p.amount, p.currency, p.status, p.failure_reason, p.created_at, p.paid_at,
           p.payer_id, pr.full_name as payer_name, pr.email::text as payer_email,
           p.booking_id, b.reference_no as booking_reference,
           p.escrow_id, p.subscription_id,
           count(*) over() as total_count
      from public.payments p
      join public.profiles pr on pr.id = p.payer_id
      left join public.bookings b on b.id = p.booking_id
     where ($1 is null
            or pr.full_name ilike '%%' || $1 || '%%'
            or pr.email::text ilike '%%' || $1 || '%%'
            or p.provider_ref ilike '%%' || $1 || '%%'
            or b.reference_no ilike '%%' || $1 || '%%'
            or p.id = $2)
       and ($3 is null or p.status   = $3::payment_status)
       and ($4 is null or p.provider = $4::payment_provider)
       and ($5 is null or p.purpose  = $5::payment_purpose)
       and ($6 is null or p.created_at >= $6)
       and ($7 is null or p.created_at <= $7)
     order by p.%I %s, p.id desc
     limit $8 offset $9
  $q$, v_sort_field, v_sort_dir)
  using v_search, v_search_id, p_status, p_provider, p_purpose, p_from, p_to, p_limit, p_offset;
end;
$$;

-- ---------------------------------------------------------------------
-- count_payments_admin_by_status
-- Row counts grouped by status, honouring every filter EXCEPT status
-- (status is what the tabs switch, so each badge must show the count it
-- would show once selected). Statuses with no rows do not appear; the
-- caller defaults them to zero.
-- ---------------------------------------------------------------------
create or replace function public.count_payments_admin_by_status(
  p_search   text        default null,
  p_provider text        default null,
  p_purpose  text        default null,
  p_from     timestamptz default null,
  p_to       timestamptz default null)
returns table (status payment_status, count bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_search    text := nullif(btrim(coalesce(p_search, '')), '');
  v_search_id uuid;
begin
  if not public.has_permission('payments.read') then perform public._forbidden(); end if;

  if v_search ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_search_id := v_search::uuid;
  end if;

  return query
    select p.status, count(*)
      from public.payments p
      join public.profiles pr on pr.id = p.payer_id
      left join public.bookings b on b.id = p.booking_id
     where (v_search is null
            or pr.full_name ilike '%' || v_search || '%'
            or pr.email::text ilike '%' || v_search || '%'
            or p.provider_ref ilike '%' || v_search || '%'
            or b.reference_no ilike '%' || v_search || '%'
            or p.id = v_search_id)
       and (p_provider is null or p.provider = p_provider::payment_provider)
       and (p_purpose  is null or p.purpose  = p_purpose::payment_purpose)
       and (p_from is null or p.created_at >= p_from)
       and (p_to   is null or p.created_at <= p_to)
     group by p.status;
end;
$$;

-- ---------------------------------------------------------------------
-- get_payment_admin
--
-- One payment as the console investigates it: the row, who paid, what it
-- was for (booking + escrow, or subscription), every provider delivery and
-- what we did with it, every raw request/response/IPN body we kept, and
-- any reconciliation exception filed against it.
--
-- One RPC rather than six PostgREST reads, for the reasons `get_booking_admin`
-- gives: four of the six halves are optional, and the payer's name is not
-- something a `payments.read` holder can read from `profiles` directly.
-- Returns null for an unknown id — the page renders an empty state rather
-- than an error.
--
-- `escrow.funding_payment_id` is included deliberately. When it is not this
-- payment's id, this checkout was superseded (see 0903i) and any money that
-- arrived on it funded nothing — which is the finding an investigator opened
-- the page to make.
-- ---------------------------------------------------------------------
create or replace function public.get_payment_admin(p_payment_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_doc       jsonb;
  v_can_recon boolean;
begin
  if not public.has_permission('payments.read') then perform public._forbidden(); end if;

  v_can_recon := public.has_permission('finance.read') or public.has_permission('finance.reconcile');

  select jsonb_build_object(
    'id',                    p.id,
    'purpose',               p.purpose,
    'status',                p.status,
    'provider',              p.provider,
    'provider_method',       p.provider_method,
    'provider_ref',          p.provider_ref,
    'idempotency_key',       p.idempotency_key,
    'client_idempotency_key', p.client_idempotency_key,
    'checkout_url',          p.checkout_url,
    'amount',                p.amount,
    'currency',              p.currency,
    'base_amount',           p.base_amount,
    'base_currency',         p.base_currency,
    'fx_rate',               fx.rate,
    'failure_reason',        p.failure_reason,
    'paid_at',               p.paid_at,
    'created_at',            p.created_at,
    'updated_at',            p.updated_at,

    'payer', jsonb_build_object(
      'id',    pr.id,
      'name',  pr.full_name,
      'email', pr.email,
      'phone', pr.phone,
      -- Subscription payments are made by a vendor's owner, who has no
      -- console page of their own; the vendor listing is where that payer
      -- is investigated. Resolved through the subscription, never by
      -- guessing which of the payer's vendors it was.
      'vendor_id', sv.id),

    'booking', case when b.id is null then null else jsonb_build_object(
      'id',           b.id,
      'reference_no', b.reference_no,
      'status',       b.status,
      'event_date',   b.event_date,
      'payment_type', b.payment_type,
      'vendor', jsonb_build_object('id', bv.id, 'name', bv.business_name)) end,

    'escrow', case when e.id is null then null else jsonb_build_object(
      'id',                     e.id,
      'booking_id',             e.booking_id,
      'status',                 e.status,
      'currency',               e.currency,
      'gross_amount',           e.gross_amount,
      'agreed_amount',          e.agreed_amount,
      'commission_amount',      e.commission_amount,
      'psp_fee_amount',         e.psp_fee_amount,
      'advance_rate',           e.advance_rate,
      'advance_amount',         e.advance_amount,
      'balance_amount',         e.balance_amount,
      'advance_release_due_at', e.advance_release_due_at,
      'advance_released_at',    e.advance_released_at,
      'balance_released_at',    e.balance_released_at,
      'attempt_no',             e.attempt_no,
      'failure_reason',         e.failure_reason,
      'timers_frozen_at',       e.timers_frozen_at,
      'funding_payment_id',     e.funding_payment_id) end,

    'subscription', case when s.id is null then null else jsonb_build_object(
      'id',        s.id,
      'status',    s.status,
      'vendor_id', sv.id,
      'vendor_name', sv.business_name,
      'plan_name', pp.name) end,

    -- Every delivery the provider made that we could tie to this payment,
    -- oldest first — the order the story reads in.
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',           ev.id,
               'provider',     ev.provider,
               'event_id',     ev.event_id,
               'event_type',   ev.event_type,
               'outcome',      ev.outcome,
               'received_at',  ev.received_at,
               'processed_at', ev.processed_at)
             order by ev.received_at asc)
        from public.payment_events ev
       where ev.payment_id = p.id
          or (ev.payment_id is null
              and ev.provider = p.provider
              and p.provider_ref is not null
              and ev.event_id = p.provider_ref)), '[]'::jsonb),

    -- Raw bodies, newest first, capped: a payment retried by a provider for
    -- a day can accrue hundreds, and the page collapses each one anyway.
    'logs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',              lg.id,
               'provider',        lg.provider,
               'direction',       lg.direction,
               'event_type',      lg.event_type,
               'http_status',     lg.http_status,
               'signature_valid', lg.signature_valid,
               'received_at',     lg.received_at,
               'payload',         lg.payload)
             order by lg.received_at desc)
        from (
          select *
            from public.payment_logs l
           where l.payment_id = p.id
              or (l.payment_id is null
                  and l.provider = p.provider
                  and ((p.provider_ref is not null
                        and l.payload ->> 'orderTrackingId' = p.provider_ref)
                       or l.payload ->> 'merchantRef' = p.id::text))
           order by l.received_at desc
           limit 200) lg), '[]'::jsonb),

    'exceptions', case when not v_can_recon then null else coalesce((
      select jsonb_agg(jsonb_build_object(
               'id',               x.id,
               'kind',             x.kind,
               'status',           x.status,
               'severity',         x.severity,
               'detail',           x.detail,
               'metadata',         x.metadata,
               'expected',         x.expected,
               'actual',           x.actual,
               'occurrences',      x.occurrences,
               'escrow_id',        x.escrow_id,
               'payment_id',       x.payment_id,
               'payout_id',        x.payout_id,
               'refund_id',        x.refund_id,
               'first_seen_at',    x.first_seen_at,
               'last_seen_at',     x.last_seen_at,
               'resolved_at',      x.resolved_at,
               'resolved_by',      rb.full_name,
               'resolution_notes', x.resolution_notes)
             order by (x.status in ('open', 'investigating')) desc, x.last_seen_at desc)
        from public.reconciliation_exceptions x
        left join public.profiles rb on rb.id = x.resolved_by
       where x.payment_id = p.id), '[]'::jsonb) end
  )
  into v_doc
  from public.payments p
  join public.profiles pr on pr.id = p.payer_id
  left join public.exchange_rates fx on fx.id = p.fx_rate_id
  left join public.bookings b on b.id = p.booking_id
  left join public.vendors bv on bv.id = b.vendor_id
  left join public.escrow_transactions e on e.id = p.escrow_id
  left join public.subscriptions s on s.id = p.subscription_id
  left join public.vendors sv on sv.id = s.vendor_id
  left join public.pricing_plans pp on pp.id = s.plan_id
  where p.id = p_payment_id;

  return v_doc;
end;
$$;

grant execute on function
  public.search_payments_admin(text, text, text, text, timestamptz, timestamptz, text, text, integer, integer),
  public.count_payments_admin_by_status(text, text, text, timestamptz, timestamptz),
  public.get_payment_admin(uuid)
to authenticated;
