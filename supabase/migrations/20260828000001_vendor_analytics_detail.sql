-- =====================================================================
-- Sinnapi — 0828 Vendor analytics detail RPC
--
-- WHY A SECOND RPC RATHER THAN MORE FIELDS ON THE FIRST
-- `vendor_dashboard_overview` is the vendor's landing read: it runs on every
-- portal open, for every plan, and its cost is paid by everyone. The cuts
-- below are the *paid* Analytics page (`plan_features.client_analytics`), they
-- are read by one screen, and several of them scan lifetime history rather
-- than the reporting window. Bolting them onto the landing read would make
-- every vendor pay for a payload only Professional and Elite are shown.
--
-- So the two stay separate and the Analytics page issues both. The overview
-- answers "what are my numbers"; this answers "where do they come from" —
-- which services and packages earn, which event types book, how far ahead
-- clients commit, how fast the vendor answers, and who comes back.
--
--   vendor_analytics_detail(p_vendor_id, p_days) -> jsonb
--
-- SHAPE OF THE PAYLOAD
--   { generated_at, period_days,
--     services:    [ { name, bookings, revenue } ],
--     packages:    [ { name, quotes, accepted, revenue } ],
--     event_types: [ { name, value } ],
--     lead_time:   { median_days, sample, buckets: [ { name, value } ] },
--     speed:       { quote_median_hours, quotes_priced,
--                    reply_median_hours, replies, published, reply_rate },
--     clients:     { total, repeat, repeat_rate, new_clients,
--                    top: [ { name, bookings, value } ] },
--     seasonality: [ { bucket_start, bookings, revenue } ] }
--
-- PERMISSIONS
-- `security definer` gated on `is_vendor_owner(p_vendor_id)` — the identical
-- gate `vendor_dashboard_overview` makes. Every row aggregated here is a row
-- the vendor can already open on their own bookings, quotations and reviews
-- pages; nothing is exposed that RLS would otherwise withhold. The one piece
-- of third-party data is a client's display name on the top-clients list, and
-- the vendor already reads that on each of those bookings.
--
-- WHAT COUNTS AS "BOOKED WORK"
-- Every revenue and volume figure below excludes `cancelled` and `declined`
-- bookings, and uses `bookings.amount` — the agreed contract value. This is
-- deliberately NOT the escrow figure the Earnings tab quotes: that one tracks
-- money custody over time, whereas these attribute *work won* to the service,
-- package, event type and client it came from. Stated once here so the two
-- can never be mistaken for a discrepancy.
-- =====================================================================

create or replace function public.vendor_analytics_detail(
  p_vendor_id uuid,
  p_days      integer default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_days        integer := greatest(1, least(coalesce(p_days, 30), 400));
  v_from        timestamptz;
  -- Seasonality is a twelve-month read by design (see its section), so it
  -- ignores the reporting window and anchors on the current month instead.
  v_season_from date := (date_trunc('month', current_date) - interval '11 months')::date;
  v_services    jsonb;
  v_packages    jsonb;
  v_event_types jsonb;
  v_lead_time   jsonb;
  v_speed       jsonb;
  v_clients     jsonb;
  v_seasonality jsonb;
begin
  -- The outer gate. Everything below runs as definer, so this is the only
  -- thing standing between a caller and another vendor's books.
  if not public.is_vendor_owner(p_vendor_id) then
    raise exception 'not authorised for vendor %', p_vendor_id
      using errcode = '42501';
  end if;

  v_from := date_trunc('day', now() - make_interval(days => v_days));

  -- ---------------- Services ----------------
  -- Which of the vendor's own services actually earn. Bookings carry
  -- `vendor_service_id`, but it is nullable — a booking raised from a bare
  -- quotation has none — so those roll into one honest "Unattributed" row
  -- rather than being dropped, which would make the shares add up to less
  -- than the vendor's own total and look like a bug.
  select coalesce(jsonb_agg(to_jsonb(t) order by t.revenue desc), '[]'::jsonb)
  into v_services
  from (
    select coalesce(vs.title, 'Unattributed')     as name,
           count(*)::bigint                       as bookings,
           coalesce(sum(b.amount), 0)::numeric    as revenue
    from public.bookings b
    left join public.vendor_services vs on vs.id = b.vendor_service_id
    where b.vendor_id = p_vendor_id
      and b.deleted_at is null
      and b.created_at >= v_from
      and b.status not in ('cancelled', 'declined')
    group by 1
    order by revenue desc, bookings desc
    limit 6
  ) t;

  -- ---------------- Packages ----------------
  -- Quotes are attributed to the package they were built from
  -- (`quotations.template_id`). `accepted` beside `quotes` is the per-package
  -- win rate the Demand tab reports in aggregate — which is the read that
  -- tells a vendor to re-price a tier rather than to chase more leads.
  -- Revenue counts accepted quotes only: an unaccepted quote is an offer, not
  -- income, and summing all of them would report a book of work never won.
  select coalesce(jsonb_agg(to_jsonb(t) order by t.revenue desc), '[]'::jsonb)
  into v_packages
  from (
    select qt.name                                                        as name,
           count(*)::bigint                                               as quotes,
           count(*) filter (where q.status = 'accepted')                  as accepted,
           coalesce(sum(q.total) filter (where q.status = 'accepted'), 0)::numeric as revenue
    from public.quotations q
    join public.quote_templates qt on qt.id = q.template_id
    where q.vendor_id = p_vendor_id
      and q.deleted_at is null
      and q.created_at >= v_from
    group by qt.name
    order by revenue desc, quotes desc
    limit 6
  ) t;

  -- ---------------- Event type mix ----------------
  -- What kind of events this vendor is actually booked for. `event_type_id`
  -- is the managed taxonomy added in 0814; `events.event_type` is the free
  -- text that predates it, kept in the coalesce so historic bookings are not
  -- silently filed as unspecified.
  select coalesce(jsonb_agg(to_jsonb(t) order by t.value desc), '[]'::jsonb)
  into v_event_types
  from (
    select coalesce(et.name, nullif(btrim(e.event_type), ''), 'Not specified') as name,
           count(*)::bigint                                                   as value
    from public.bookings b
    left join public.events e       on e.id  = b.event_id
    left join public.event_types et on et.id = e.event_type_id
    where b.vendor_id = p_vendor_id
      and b.deleted_at is null
      and b.created_at >= v_from
      and b.status not in ('cancelled', 'declined')
    group by 1
    order by value desc
    limit 8
  ) t;

  -- ---------------- Lead time ----------------
  -- How far ahead of the event a client commits. This is the vendor's
  -- planning horizon and the single most actionable number on the page: a
  -- median that collapses towards zero means the diary is being filled by
  -- last-minute work, which prices and staffs differently from work booked a
  -- season out.
  --
  -- The median rather than the mean, because one wedding booked eighteen
  -- months out drags an average past anything the vendor would recognise.
  -- Buckets are zero-filled from a fixed list so the chart keeps its shape
  -- (and its reading order) in a quiet period.
  with lt as (
    select greatest(b.event_date - b.created_at::date, 0)::float8 as days
    from public.bookings b
    where b.vendor_id = p_vendor_id
      and b.deleted_at is null
      and b.created_at >= v_from
      and b.status not in ('cancelled', 'declined')
  ),
  bands(sort_order, name, lo, hi) as (
    values (1, 'Under 1 week',  0,   6),
           (2, '1–4 weeks',     7,   29),
           (3, '1–3 months',    30,  89),
           (4, '3–6 months',    90,  179),
           (5, '6 months +',    180, 100000)
  )
  select jsonb_build_object(
    'median_days', (select percentile_cont(0.5) within group (order by days) from lt),
    'sample',      (select count(*) from lt),
    'buckets', coalesce((
      select jsonb_agg(jsonb_build_object(
               'name',  bands.name,
               'value', (select count(*) from lt
                          where lt.days between bands.lo and bands.hi))
             order by bands.sort_order)
      from bands), '[]'::jsonb)
  ) into v_lead_time;

  -- ---------------- Responsiveness ----------------
  -- The two clocks a vendor personally controls.
  --
  --   quote_median_hours  request received → quote sent. On a marketplace this
  --                       is the strongest single predictor of winning the
  --                       job, so it is reported next to the win rate.
  --   reply_median_hours  review published → vendor's public response.
  --
  -- Reply RATE is lifetime, not windowed: it is the proportion of a vendor's
  -- public reviews that carry an answer, which is what a client browsing the
  -- profile sees. A windowed rate would read 100% on a week with one review.
  with quoted as (
    select (extract(epoch from (q.sent_at - q.created_at)) / 3600.0)::float8 as hours
    from public.quotations q
    where q.vendor_id = p_vendor_id
      and q.deleted_at is null
      and q.sent_at is not null
      and q.sent_at >= q.created_at
      and q.created_at >= v_from
  ),
  replied as (
    select (extract(epoch from (rr.created_at - r.created_at)) / 3600.0)::float8 as hours
    from public.reviews r
    join public.review_responses rr
      on rr.review_id = r.id and rr.deleted_at is null
    where r.vendor_id = p_vendor_id
      and r.deleted_at is null
      and r.status = 'published'
      and rr.created_at >= r.created_at
  ),
  published as (
    select count(*)::bigint                                            as total,
           count(*) filter (where rr.id is not null)                    as answered
    from public.reviews r
    left join public.review_responses rr
      on rr.review_id = r.id and rr.deleted_at is null
    where r.vendor_id = p_vendor_id
      and r.deleted_at is null
      and r.status = 'published'
  )
  select jsonb_build_object(
    'quote_median_hours', (select percentile_cont(0.5) within group (order by hours) from quoted),
    'quotes_priced',      (select count(*) from quoted),
    'reply_median_hours', (select percentile_cont(0.5) within group (order by hours) from replied),
    'replies',            (select answered from published),
    'published',          (select total from published),
    -- Null rather than 0 with no reviews at all: "nothing to answer yet" and
    -- "answered none of them" are different facts about a vendor.
    'reply_rate',         (select case when total > 0 then answered::numeric / total end
                           from published)
  ) into v_speed;

  -- ---------------- Clients ----------------
  -- Repeat business, lifetime rather than windowed — a repeat rate measured
  -- over 30 days is arithmetic about a month, not about loyalty. `new_clients`
  -- is the windowed half of the same picture: clients whose FIRST booking with
  -- this vendor landed inside the reporting period.
  with cb as (
    select b.client_id,
           count(*)::bigint                    as bookings,
           coalesce(sum(b.amount), 0)::numeric as value,
           min(b.created_at)                   as first_at
    from public.bookings b
    where b.vendor_id = p_vendor_id
      and b.deleted_at is null
      and b.status not in ('cancelled', 'declined')
    group by b.client_id
  )
  select jsonb_build_object(
    'total',        (select count(*) from cb),
    'repeat',       (select count(*) filter (where bookings > 1) from cb),
    'repeat_rate',  (select case when count(*) > 0
                              then (count(*) filter (where bookings > 1))::numeric / count(*)
                            end
                     from cb),
    'new_clients',  (select count(*) filter (where first_at >= v_from) from cb),
    'top', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.value desc)
      from (
        select coalesce(p.full_name, p.email, 'Client') as name,
               cb.bookings,
               cb.value
        from cb
        left join public.profiles p on p.id = cb.client_id
        order by cb.value desc, cb.bookings desc
        limit 5
      ) t), '[]'::jsonb)
  ) into v_clients;

  -- ---------------- Seasonality ----------------
  -- Twelve months of bookings by EVENT date, not by booking date — the
  -- question is "when is my business busy", and an event booked in January for
  -- a June wedding belongs to June. Fixed at twelve months regardless of the
  -- reporting window: a seasonal pattern is not visible in seven days, and a
  -- period selector that could hide it would make the chart misleading.
  with months as (
    select generate_series(v_season_from::timestamp,
                           date_trunc('month', current_date)::timestamp,
                           interval '1 month')::date as m
  ),
  by_month as (
    select date_trunc('month', b.event_date)::date    as m,
           count(*)::bigint                           as bookings,
           coalesce(sum(b.amount), 0)::numeric        as revenue
    from public.bookings b
    where b.vendor_id = p_vendor_id
      and b.deleted_at is null
      and b.status not in ('cancelled', 'declined')
      and b.event_date >= v_season_from
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'bucket_start', months.m,
           'bookings',     coalesce(by_month.bookings, 0),
           'revenue',      coalesce(by_month.revenue, 0)) order by months.m), '[]'::jsonb)
  into v_seasonality
  from months
  left join by_month on by_month.m = months.m;

  return jsonb_build_object(
    'generated_at', now(),
    'period_days',  v_days,
    'services',     coalesce(v_services, '[]'::jsonb),
    'packages',     coalesce(v_packages, '[]'::jsonb),
    'event_types',  coalesce(v_event_types, '[]'::jsonb),
    'lead_time',    coalesce(v_lead_time, '{}'::jsonb),
    'speed',        coalesce(v_speed, '{}'::jsonb),
    'clients',      coalesce(v_clients, '{}'::jsonb),
    'seasonality',  coalesce(v_seasonality, '[]'::jsonb)
  );
end;
$$;

-- The three predicates this function leans on hardest. `bookings(vendor_id,
-- status)` and `quotations(vendor_id, status)` already exist from 0006; these
-- add the created_at/event_date dimensions every aggregate above filters on.
create index if not exists ix_bookings_vendor_created
  on public.bookings(vendor_id, created_at) where deleted_at is null;
create index if not exists ix_bookings_vendor_event_date
  on public.bookings(vendor_id, event_date) where deleted_at is null;
create index if not exists ix_quotations_vendor_created
  on public.quotations(vendor_id, created_at) where deleted_at is null;

grant execute on function public.vendor_analytics_detail(uuid, integer) to authenticated;

comment on function public.vendor_analytics_detail(uuid, integer) is
  'Paid vendor Analytics cuts: service/package attribution, event-type mix, '
  'booking lead time, quote and review responsiveness, repeat clients and '
  '12-month seasonality. Gated on is_vendor_owner.';
