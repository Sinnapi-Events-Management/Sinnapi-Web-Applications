-- =====================================================================
-- Sinnapi — 0821 Vendor dashboard overview RPC
-- One round-trip behind the vendor landing page. Replaces the four separate
-- head-count queries the vendor dashboard used to fire with a single aggregate
-- that also carries money, trends, backlog ages, an upcoming-events list and a
-- recent-activity feed.
--
--   vendor_dashboard_overview(p_vendor_id, p_days, p_granularity) -> jsonb
--
-- SHAPE OF THE PAYLOAD
--   { generated_at, period_days, granularity,
--     queues:     { <key>: { count, oldest_at } },
--     earnings:   { released, in_escrow, pending_payout, commission,
--                   lifetime_released, trend[] },
--     pipeline:   { booking_requests, quote_requests, bookings, quotations,
--                   confirmed, completed, cancelled, conversion,
--                   upcoming_count, upcoming_value, trend[], status_mix[] },
--     reputation: { avg_rating, review_count, new_reviews, unanswered,
--                   rating_mix[] },
--     upcoming:   [ { id, reference_no, event_date, status, amount, currency,
--                     client_name } ],
--     activity:   [ { id, kind, reference_no, status, occurred_at } ] }
--
-- PERMISSIONS
-- `security definer`, gated on `is_vendor_owner(p_vendor_id)` — the same check
-- every vendor RLS policy makes. A vendor can therefore only ever aggregate
-- their own rows, and the function reads nothing a vendor could not already
-- open on their own bookings, quotations, escrow, payout and review pages.
--
-- MONEY DEFINITIONS (deliberately the same ones the pages below quote)
--   released       settled payouts inside the window — cash that actually left
--                  escrow for the vendor's account.
--   in_escrow      `net_payout_amount` on escrows still in custody: funded and
--                  waiting, mid-release, or approved but not yet settled. Money
--                  earned and safe, but not yet paid.
--   pending_payout raised payouts not yet settled — the subset of the above
--                  that finance is already working.
--   commission     the platform's cut on escrows funded in the window. Shown so
--                  the vendor can reconcile gross against take-home.
--
-- Trend buckets are zero-filled via generate_series so a chart keeps a
-- continuous x-axis. numeric/bigint values arrive at the client as JSON numbers
-- (jsonb_build_object casts them), timestamps as ISO strings.
-- =====================================================================

create or replace function public.vendor_dashboard_overview(
  p_vendor_id   uuid,
  p_days        integer default 30,
  p_granularity text default 'day')
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days       integer := greatest(1, least(coalesce(p_days, 30), 400));
  v_gran       text;
  v_step       interval;
  v_from       timestamptz;
  -- Escrow states that represent money the client actually paid in. Booked
  -- income and commission are both measured against this one list, so the two
  -- can never be computed off different definitions. The custody balance uses a
  -- narrower list further down — money already paid out is booked income but is
  -- no longer held.
  v_funded_states text[] := array['funded', 'held', 'awaiting_advance', 'advance_released',
                                  'release_requested', 'admin_review', 'payout_approved',
                                  'paid_out', 'partially_refunded', 'disputed'];
  v_queues     jsonb;
  v_earnings   jsonb;
  v_pipeline   jsonb;
  v_reputation jsonb;
  v_upcoming   jsonb;
  v_activity   jsonb;
begin
  -- The outer gate. Everything below runs as definer, so this is the only thing
  -- standing between a caller and another vendor's books.
  if not public.is_vendor_owner(p_vendor_id) then
    raise exception 'not authorised for vendor %', p_vendor_id
      using errcode = '42501';
  end if;

  v_gran := lower(coalesce(p_granularity, 'day'));
  if v_gran not in ('day', 'week', 'month') then
    raise exception 'unsupported dashboard granularity %', v_gran;
  end if;
  v_step := ('1 ' || v_gran)::interval;
  v_from := date_trunc(v_gran, now() - make_interval(days => v_days));

  -- ---------------- Action queues ----------------
  -- Each queue mirrors the status filter its own vendor page uses, so a tile's
  -- count and the list it links to can never disagree. `oldest_at` is what the
  -- card ages on — a request sitting three days is the actual signal, not the
  -- count on its own.
  select jsonb_build_object(
    'booking_requests', jsonb_build_object(
      'count',     count(*) filter (where b.status = 'requested'),
      'oldest_at', min(b.created_at) filter (where b.status = 'requested')),
    'unpaid', jsonb_build_object(
      -- Confirmed and waiting on the client's money. The vendor's date is held
      -- off the market for it, so it belongs on the same band as new requests.
      -- Escrow bookings only: a `direct` booking is settled between the two
      -- parties off-platform, so no escrow row is ever expected for one and
      -- counting it here would report every direct booking as unpaid.
      'count',     count(*) filter (
                     where b.status = 'confirmed'
                       and b.payment_type = 'escrow' and e.id is null),
      'oldest_at', min(b.created_at) filter (
                     where b.status = 'confirmed'
                       and b.payment_type = 'escrow' and e.id is null))
  ) into v_queues
  from public.bookings b
  left join public.escrow_transactions e on e.booking_id = b.id
  where b.vendor_id = p_vendor_id and b.deleted_at is null;

  v_queues := v_queues || (
    select jsonb_build_object('quote_requests', jsonb_build_object(
      'count',     count(*),
      'oldest_at', min(created_at)))
    from public.quotations
    where vendor_id = p_vendor_id and deleted_at is null and status = 'requested');

  v_queues := v_queues || (
    select jsonb_build_object('escrow', jsonb_build_object(
      'count',     count(*),
      'oldest_at', min(created_at)))
    from public.escrow_transactions
    where vendor_id = p_vendor_id
      and status in ('funded', 'held', 'awaiting_advance', 'advance_released',
                     'release_requested', 'admin_review'));

  v_queues := v_queues || (
    select jsonb_build_object('payouts', jsonb_build_object(
      'count',     count(*),
      'oldest_at', min(created_at)))
    from public.payouts
    where vendor_id = p_vendor_id
      and status in ('requested', 'approved', 'settlement_recorded', 'processing'));

  -- Published reviews the vendor has not answered. A reply is the one review
  -- action a vendor owns, so unanswered — not total — is the queue.
  v_queues := v_queues || (
    select jsonb_build_object('reviews', jsonb_build_object(
      'count',     count(*),
      'oldest_at', min(r.created_at)))
    from public.reviews r
    left join public.review_responses rr
      on rr.review_id = r.id and rr.deleted_at is null
    where r.vendor_id = p_vendor_id
      and r.deleted_at is null
      and r.status = 'published'
      and rr.id is null);

  -- ---------------- Earnings ----------------
  with buckets as (
    select b as bstart
    from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
  ),
  released_by as (
    select date_trunc(v_gran, coalesce(settled_at, completed_at, updated_at)) as b,
           sum(amount) as amt
    from public.payouts
    where vendor_id = p_vendor_id
      and status = 'completed'
      and coalesce(settled_at, completed_at, updated_at) >= v_from
    group by 1
  ),
  commission_by as (
    select date_trunc(v_gran, created_at) as b, sum(commission_amount) as amt
    from public.escrow_transactions
    where vendor_id = p_vendor_id
      and created_at >= v_from
      and status::text = any(v_funded_states)
    group by 1
  ),
  earned_by as (
    -- What the vendor booked in the window, whether or not it has been paid out
    -- yet. Read beside `released` it answers "am I earning faster than I'm
    -- being paid?", which a single cash-out series cannot.
    --
    -- Funded states only: an `initiated` escrow is a checkout the client never
    -- completed and a `failed`/`refunded` one is money that came back out, so
    -- neither is income the vendor booked.
    select date_trunc(v_gran, created_at) as b, sum(net_payout_amount) as amt
    from public.escrow_transactions
    where vendor_id = p_vendor_id
      and created_at >= v_from
      and status::text = any(v_funded_states)
    group by 1
  ),
  series as (
    select bk.bstart,
           coalesce(r.amt, 0)::numeric as released,
           coalesce(e.amt, 0)::numeric as earned,
           coalesce(c.amt, 0)::numeric as commission
    from buckets bk
    left join released_by r   on r.b = bk.bstart
    left join earned_by e     on e.b = bk.bstart
    left join commission_by c on c.b = bk.bstart
  ),
  custody as (
    select coalesce(sum(net_payout_amount), 0)::numeric as amount, count(*)::bigint as n
    from public.escrow_transactions
    where vendor_id = p_vendor_id
      and status in ('funded', 'held', 'awaiting_advance', 'advance_released',
                     'release_requested', 'admin_review', 'payout_approved')
  ),
  pending as (
    select coalesce(sum(amount), 0)::numeric as amount
    from public.payouts
    where vendor_id = p_vendor_id
      and status in ('requested', 'approved', 'settlement_recorded', 'processing')
  ),
  lifetime as (
    select coalesce(sum(amount), 0)::numeric as amount
    from public.payouts
    where vendor_id = p_vendor_id and status = 'completed'
  )
  select jsonb_build_object(
    'released',          (select coalesce(sum(released), 0) from series),
    'earned',            (select coalesce(sum(earned), 0) from series),
    'commission',        (select coalesce(sum(commission), 0) from series),
    'in_escrow',         (select amount from custody),
    'escrow_count',      (select n from custody),
    'pending_payout',    (select amount from pending),
    'lifetime_released', (select amount from lifetime),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bucket_start', bstart, 'released', released,
               'earned', earned, 'commission', commission) order by bstart)
      from series), '[]'::jsonb)
  ) into v_earnings;

  -- ---------------- Pipeline ----------------
  -- Demand and what became of it. `conversion` is quotes answered with a yes
  -- over quotes the vendor actually sent — priced work won ÷ priced work
  -- offered. Quotes still sitting unanswered are excluded from the base, so a
  -- busy week of fresh quotes cannot read as a collapse in win rate.
  with buckets as (
    select b as bstart
    from generate_series(date_trunc(v_gran, v_from), date_trunc(v_gran, now()), v_step) b
  ),
  bookings_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.bookings
    where vendor_id = p_vendor_id and deleted_at is null and created_at >= v_from
    group by 1
  ),
  quotations_by as (
    select date_trunc(v_gran, created_at) as b, count(*) as c
    from public.quotations
    where vendor_id = p_vendor_id and deleted_at is null and created_at >= v_from
    group by 1
  ),
  series as (
    select bk.bstart,
           coalesce(bo.c, 0)::bigint as bookings,
           coalesce(qu.c, 0)::bigint as quotations
    from buckets bk
    left join bookings_by bo   on bo.b = bk.bstart
    left join quotations_by qu on qu.b = bk.bstart
  ),
  quote_outcomes as (
    select count(*) filter (where status in ('accepted', 'declined', 'expired')) as answered,
           count(*) filter (where status = 'accepted')                           as accepted
    from public.quotations
    where vendor_id = p_vendor_id and deleted_at is null and created_at >= v_from
  ),
  booking_states as (
    select count(*) filter (where status = 'requested')                        as requested,
           count(*) filter (where status in ('confirmed', 'in_progress'))      as confirmed,
           count(*) filter (where status = 'completed')                        as completed,
           count(*) filter (where status in ('cancelled', 'declined'))         as cancelled,
           count(*) filter (where status in ('confirmed', 'in_progress')
                              and event_date >= current_date)                  as upcoming_count,
           coalesce(sum(amount) filter (where status in ('confirmed', 'in_progress')
                                          and event_date >= current_date), 0)  as upcoming_value
    from public.bookings
    where vendor_id = p_vendor_id and deleted_at is null
  ),
  status_mix as (
    select status::text as name, count(*)::bigint as value
    from public.bookings
    where vendor_id = p_vendor_id and deleted_at is null
    group by status
  )
  select jsonb_build_object(
    'bookings',         (select coalesce(sum(bookings), 0) from series),
    'quotations',       (select coalesce(sum(quotations), 0) from series),
    'booking_requests', (select requested from booking_states),
    'confirmed',        (select confirmed from booking_states),
    'completed',        (select completed from booking_states),
    'cancelled',        (select cancelled from booking_states),
    'upcoming_count',   (select upcoming_count from booking_states),
    'upcoming_value',   (select upcoming_value from booking_states),
    'quotes_answered',  (select answered from quote_outcomes),
    'quotes_accepted',  (select accepted from quote_outcomes),
    'trend', coalesce((
      select jsonb_agg(jsonb_build_object(
               'bucket_start', bstart, 'bookings', bookings, 'quotations', quotations)
             order by bstart) from series), '[]'::jsonb),
    'status_mix', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc)
      from status_mix), '[]'::jsonb)
  ) into v_pipeline;

  -- ---------------- Reputation ----------------
  -- Lifetime rating comes off `vendors`, which the search index and the public
  -- profile also read — so the dashboard can never quote a different score from
  -- the one clients see.
  select jsonb_build_object(
    'avg_rating',   coalesce(v.avg_rating, 0)::numeric,
    'review_count', coalesce(v.review_count, 0)::bigint,
    'new_reviews',  (select count(*) from public.reviews r
                     where r.vendor_id = p_vendor_id and r.deleted_at is null
                       and r.status = 'published' and r.created_at >= v_from),
    'unanswered',   (select count(*) from public.reviews r
                     left join public.review_responses rr
                       on rr.review_id = r.id and rr.deleted_at is null
                     where r.vendor_id = p_vendor_id and r.deleted_at is null
                       and r.status = 'published' and rr.id is null),
    'rating_mix', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'value', value) order by name desc)
      from (
        select r.rating::text as name, count(*)::bigint as value
        from public.reviews r
        where r.vendor_id = p_vendor_id and r.deleted_at is null and r.status = 'published'
        group by r.rating
      ) m), '[]'::jsonb)
  ) into v_reputation
  from public.vendors v
  where v.id = p_vendor_id;

  -- ---------------- What's next ----------------
  -- The vendor's diary: the next five dates they are committed to. Ordered by
  -- event date, not by booking age — this band answers "what am I preparing
  -- for", which is the one dashboard question the queues cannot.
  select coalesce(jsonb_agg(to_jsonb(t) order by t.event_date), '[]'::jsonb)
  into v_upcoming
  from (
    select b.id,
           b.reference_no,
           b.event_date,
           b.status::text                        as status,
           b.amount,
           b.currency,
           b.start_time,
           b.location,
           coalesce(p.full_name, p.email)        as client_name
    from public.bookings b
    left join public.profiles p on p.id = b.client_id
    where b.vendor_id = p_vendor_id
      and b.deleted_at is null
      and b.status in ('confirmed', 'in_progress')
      and b.event_date >= current_date
    order by b.event_date
    limit 5
  ) t;

  -- ---------------- Recent activity ----------------
  -- The vendor's own status trail, bookings and quotations interleaved. Short
  -- and read-only: it exists to prompt a click through to the record, not to
  -- replace either list page.
  select coalesce(jsonb_agg(to_jsonb(t) order by t.occurred_at desc), '[]'::jsonb)
  into v_activity
  from (
    (select h.id,
            'booking'::text        as kind,
            b.id::text             as entity_id,
            b.reference_no,
            h.to_status::text      as status,
            h.occurred_at
     from public.booking_status_history h
     join public.bookings b on b.id = h.booking_id
     where b.vendor_id = p_vendor_id and b.deleted_at is null
     order by h.occurred_at desc
     limit 8)
    union all
    (select h.id,
            'quotation'::text      as kind,
            q.id::text             as entity_id,
            q.reference_no,
            h.to_status::text      as status,
            h.occurred_at
     from public.quotation_status_history h
     join public.quotations q on q.id = h.quotation_id
     where q.vendor_id = p_vendor_id and q.deleted_at is null
     order by h.occurred_at desc
     limit 8)
    order by occurred_at desc
    limit 8
  ) t;

  return jsonb_build_object(
    'generated_at', now(),
    'period_days',  v_days,
    'granularity',  v_gran,
    'queues',       coalesce(v_queues, '{}'::jsonb),
    'earnings',     v_earnings,
    'pipeline',     v_pipeline,
    'reputation',   v_reputation,
    'upcoming',     coalesce(v_upcoming, '[]'::jsonb),
    'activity',     coalesce(v_activity, '[]'::jsonb)
  );
end;
$$;

grant execute on function
  public.vendor_dashboard_overview(uuid, integer, text)
to authenticated;
