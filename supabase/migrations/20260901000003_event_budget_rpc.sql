-- =====================================================================
-- Sinnapi — 0901c EVENT PLANNING: the money
--
-- Three reads and one check, all built on ONE definition of what counts as
-- spending an event budget. That definition is `event_money_lines`, and
-- everything else in this file and in 0901e aggregates it. The alternative —
-- each surface writing its own sum — is how a meter that says 82% and a guard
-- that refuses at 79% end up in the same product.
--
-- WHAT COUNTS, AND IN WHICH BAND
--
--   COMMITTED   a booking the vendor has taken: confirmed, in_progress or
--               completed. Money the client is on the hook for.
--
--   PENDING     a booking still `requested` (the client has asked, the vendor
--               has not answered), and an accepted quotation that has not been
--               turned into a booking yet. Money the client has committed to in
--               substance but which has not landed as a booking.
--
-- Nothing else counts. A `sent` quote is an offer the client has not answered
-- and reserving budget against it would have four competing decor quotes
-- consume the entire decor allocation between them. Cancelled and declined
-- bookings, and declined, expired and voided quotes, are dead.
--
-- THE DOUBLE-COUNT THAT MATTERS
-- An accepted quotation becomes a booking, and for the whole life of that
-- booking the quotation is still `accepted`. Counting both would double every
-- deal made through the quote flow — which is the flow this whole series is
-- built on. So an accepted quotation is only pending while no live booking
-- points at it.
--
-- CURRENCY
-- The budget has one; each booking and quote carries its own. Amounts are
-- restated in the event's currency through `fx_convert` (0901a). A pair with no
-- rate converts to NULL, and those rows are counted — never dropped and never
-- guessed at — so the client is told "2 items could not be converted" instead
-- of being shown a total that quietly omits them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- event_money_lines — every commitment against one event, one row each.
--
-- Internal: it does no authorisation of its own, because it is only ever called
-- from the functions below, each of which checks the caller first. It is not
-- granted to `authenticated`.
--
-- `amount` is null exactly when the pair had no rate; `amount_native` always
-- holds what the row actually says, so a caller can list the unconverted ones
-- with real figures beside them.
-- ---------------------------------------------------------------------
create or replace function public.event_money_lines(p_event_id uuid)
returns table (
  source         text,      -- 'booking' | 'quotation'
  ref_id         uuid,
  requirement_id uuid,
  vendor_id      uuid,
  bucket         text,      -- 'committed' | 'pending'
  status         text,
  amount_native  numeric,
  currency       text,
  amount         numeric    -- restated in the event currency; null if no rate
)
language sql stable security definer set search_path = public as $$
  with ev as (
    select e.id, coalesce(e.currency, 'UGX') as currency
      from public.events e where e.id = p_event_id
  )
  select
    'booking'::text,
    b.id,
    b.requirement_id,
    b.vendor_id,
    case when b.status = 'requested' then 'pending' else 'committed' end,
    b.status::text,
    b.amount,
    b.currency,
    public.fx_convert(b.amount, b.currency, ev.currency)
  from public.bookings b
  cross join ev
  where b.event_id = p_event_id
    and b.deleted_at is null
    and b.status in ('requested', 'confirmed', 'in_progress', 'completed')

  union all

  -- Accepted, and not yet a booking. `ux_bookings_quotation` (0816g) makes the
  -- NOT EXISTS at most one row, so this cannot fan out.
  select
    'quotation'::text,
    q.id,
    q.requirement_id,
    q.vendor_id,
    'pending'::text,
    q.status::text,
    q.total,
    q.currency,
    public.fx_convert(q.total, q.currency, ev.currency)
  from public.quotations q
  cross join ev
  where q.event_id = p_event_id
    and q.deleted_at is null
    and q.status = 'accepted'
    and not exists (
      select 1 from public.bookings b
       where b.quotation_id = q.id and b.deleted_at is null
    );
$$;

comment on function public.event_money_lines(uuid) is
  'Internal. Every booking and accepted-but-unbooked quotation against one event, banded into '
  'committed / pending and restated in the event currency. The single definition of what spends '
  'an event budget — every rollup and the guard aggregate this and nothing else.';

-- ---------------------------------------------------------------------
-- event_budget_summary — the meter at the top of the event page.
--
-- One row. `state` is computed here rather than in each of the three portals,
-- so "over budget" cannot mean one thing in the client's colour scheme and
-- another in the guard that refuses the booking.
--
--   unset     no budget_max — nothing to measure against, and the page says so
--             rather than drawing a bar at 0%
--   healthy   below the warn threshold
--   warning   at or above the threshold, at or below the budget
--   exceeded  spoken for beyond the budget
--
-- `budget_max` falling back to `budget_min` mirrors `budgetPreviewAmount` in
-- the client portal: a client who said "from 5m upwards" has given us exactly
-- one number, and pricing against nothing when they gave us something is worse
-- than pricing against the number they gave.
-- ---------------------------------------------------------------------
create or replace function public.event_budget_summary(p_event_id uuid)
returns table (
  event_id           uuid,
  currency           text,
  budget_min         numeric,
  budget_max         numeric,
  budget_amount      numeric,
  allocated_amount   numeric,
  unallocated_amount numeric,
  committed_amount   numeric,
  committed_count    integer,
  pending_amount     numeric,
  pending_count      integer,
  spoken_for         numeric,
  remaining_amount   numeric,
  usage_percent      numeric,
  unconverted_count  integer,
  warn_threshold     numeric,
  state              text
)
language plpgsql stable security definer set search_path = public as $$
declare
  e         public.events;
  v_cur     text;
  v_budget  numeric;
  v_warn    numeric := coalesce((public.get_setting('event_budget_warn_threshold') #>> '{}')::numeric, 80);
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;

  -- The budget is the client's own planning figure and their negotiating
  -- position. A vendor quoting into this event must never read how much is left
  -- — that is the number that turns a 2m quote into a 3m one.
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  v_cur    := coalesce(e.currency, 'UGX');
  v_budget := coalesce(e.budget_max, e.budget_min);

  return query
  with lines as (select * from public.event_money_lines(p_event_id)),
  agg as (
    select
      coalesce(sum(l.amount) filter (where l.bucket = 'committed'), 0)   as committed,
      count(*) filter (where l.bucket = 'committed')                     as committed_n,
      coalesce(sum(l.amount) filter (where l.bucket = 'pending'), 0)     as pending,
      count(*) filter (where l.bucket = 'pending')                       as pending_n,
      count(*) filter (where l.amount is null)                           as unconverted_n
    from lines l
  ),
  alloc as (
    select coalesce(sum(r.allocated_amount), 0) as allocated
      from public.event_requirements r
     where r.event_id = p_event_id
       and r.deleted_at is null
       and r.cancelled_at is null
  )
  select
    e.id,
    v_cur,
    e.budget_min,
    e.budget_max,
    v_budget,
    alloc.allocated,
    case when v_budget is null then null else v_budget - alloc.allocated end,
    agg.committed,
    agg.committed_n::integer,
    agg.pending,
    agg.pending_n::integer,
    agg.committed + agg.pending,
    case when v_budget is null then null else v_budget - (agg.committed + agg.pending) end,
    -- Guarded rather than assumed non-zero: `budget_amount` is a client-typed
    -- figure and the zero case reaches here as `null` from the schema's own
    -- "more than zero" rule only on the create path. Division by zero in a
    -- stable function takes the whole page down.
    case when coalesce(v_budget, 0) <= 0 then null
         else round((agg.committed + agg.pending) * 100 / v_budget, 1) end,
    agg.unconverted_n::integer,
    v_warn,
    case
      when coalesce(v_budget, 0) <= 0                                    then 'unset'
      when agg.committed + agg.pending > v_budget                        then 'exceeded'
      when (agg.committed + agg.pending) * 100 / v_budget >= v_warn      then 'warning'
      else 'healthy'
    end
  from agg, alloc;
end;
$$;

comment on function public.event_budget_summary(uuid) is
  'Client-or-admin: one event budget against what is committed and pending, in the event currency. '
  'Owner-gated — a vendor must never read how much of a budget is left.';

-- ---------------------------------------------------------------------
-- event_requirement_summary — one row per budget line, with its state derived.
--
-- The derivation, in the order it is asked:
--   cancelled  the client withdrew the line
--   booked     something is committed against it
--   sourcing   quotes or requests are in flight, nothing committed
--   open       nothing at all — the gap a recommendation fills
--
-- `vendor_count` counts distinct vendors with any live engagement on the line,
-- which is what the card shows ("3 vendors in the running"); the money columns
-- come from the same `event_money_lines` as the event total, so a line's share
-- can never disagree with the whole.
--
-- Requirement-less commitments are deliberately absent here and present in the
-- event total. They are surfaced by `event_budget_summary` as the difference
-- between the two, and by the UI as "not assigned to a line".
-- ---------------------------------------------------------------------
create or replace function public.event_requirement_summary(p_event_id uuid)
returns table (
  id               uuid,
  event_id         uuid,
  category_id      uuid,
  category_key     text,
  category_name    text,
  title            text,
  brief            text,
  priority         text,
  allocated_amount numeric,
  currency         text,
  committed_amount numeric,
  pending_amount   numeric,
  spoken_for       numeric,
  remaining_amount numeric,
  usage_percent    numeric,
  vendor_count     integer,
  quote_count      integer,
  booking_count    integer,
  interest_count   integer,
  sort_order       integer,
  cancelled_at     timestamptz,
  state            text
)
language plpgsql stable security definer set search_path = public as $$
declare e public.events;
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  return query
  with lines as (select * from public.event_money_lines(p_event_id))
  select
    r.id,
    r.event_id,
    r.category_id,
    c.key,
    c.name,
    r.title,
    r.brief,
    r.priority::text,
    r.allocated_amount,
    r.currency,
    coalesce(m.committed, 0),
    coalesce(m.pending, 0),
    coalesce(m.committed, 0) + coalesce(m.pending, 0),
    case when r.allocated_amount is null then null
         else r.allocated_amount - (coalesce(m.committed, 0) + coalesce(m.pending, 0)) end,
    case when coalesce(r.allocated_amount, 0) <= 0 then null
         else round((coalesce(m.committed, 0) + coalesce(m.pending, 0)) * 100
                    / r.allocated_amount, 1) end,
    coalesce(m.vendors, 0)::integer,
    coalesce(qc.n, 0)::integer,
    coalesce(m.bookings, 0)::integer,
    coalesce(ic.n, 0)::integer,
    r.sort_order,
    r.cancelled_at,
    case
      when r.cancelled_at is not null              then 'cancelled'
      when coalesce(m.committed, 0) > 0            then 'booked'
      when coalesce(m.pending, 0) > 0
        or coalesce(qc.n, 0) > 0
        or coalesce(ic.n, 0) > 0                   then 'sourcing'
      else                                              'open'
    end
  from public.event_requirements r
  join public.service_categories c on c.id = r.category_id
  left join lateral (
    select
      coalesce(sum(l.amount) filter (where l.bucket = 'committed'), 0) as committed,
      coalesce(sum(l.amount) filter (where l.bucket = 'pending'), 0)   as pending,
      count(distinct l.vendor_id)                                     as vendors,
      count(*) filter (where l.source = 'booking')                    as bookings
    from lines l where l.requirement_id = r.id
  ) m on true
  -- Live quotes on the line, whether or not they are money yet. A line with two
  -- quotes out and nothing accepted is being sourced, and the count is what the
  -- card shows next to "in the running".
  left join lateral (
    select count(*) as n from public.quotations q
     where q.requirement_id = r.id
       and q.deleted_at is null
       and q.status in ('requested', 'draft', 'sent', 'revised', 'accepted')
  ) qc on true
  -- Interests are recorded against the event, not the line: a vendor putting
  -- their hand up on a public event has not said which of the client's budget
  -- lines they mean. Matched by the vendor's category instead, which is the
  -- same join the recommendations use.
  left join lateral (
    select count(distinct ei.vendor_id) as n
      from public.event_interests ei
      join public.vendors v on v.id = ei.vendor_id
     where ei.event_id = p_event_id
       and ei.status in ('invited', 'interested', 'shortlisted')
       and (v.primary_category_id = r.category_id
            or exists (select 1 from public.vendor_services vs
                        where vs.vendor_id = v.id
                          and vs.category_id = r.category_id
                          and vs.is_active
                          and vs.deleted_at is null))
  ) ic on true
  where r.event_id = p_event_id
    and r.deleted_at is null
  order by r.sort_order, c.sort_order, c.name;
end;
$$;

comment on function public.event_requirement_summary(uuid) is
  'Client-or-admin: each budget line on an event with its allocation, what is spoken for against '
  'it, and a derived state (open / sourcing / booked / cancelled).';

-- =====================================================================
-- THE GUARD
--
-- One function answers "would this commitment take the event over budget", and
-- 0901e calls it from all three committing paths. It returns a row rather than
-- raising, because the same answer is needed twice with different consequences:
-- the UI asks it to draw a warning before the client acts, and the RPC asks it
-- to decide whether to refuse. A function that raised could only serve the
-- second.
--
-- THE EXCLUSIONS ARE NOT OPTIONAL
-- Accepting a quote and then booking it are two commitments to the same money.
-- At the booking step the quotation is already `accepted` and therefore already
-- counted as pending, so without `p_exclude_quotation_id` the client would be
-- told their 8m catering deal costs 16m and refused a booking that changes the
-- total by nothing. Same for re-pricing an existing booking.
-- =====================================================================
create or replace function public.event_budget_check(
  p_event_id             uuid,
  p_amount               numeric,
  p_currency             text default null,
  p_requirement_id       uuid default null,
  p_exclude_quotation_id uuid default null,
  p_exclude_booking_id   uuid default null)
returns table (
  currency            text,
  budget_amount       numeric,
  committed_amount    numeric,
  pending_amount      numeric,
  spoken_for          numeric,
  -- What the event already stands at RIGHT NOW, with nothing excluded. The
  -- reference point that tells a no-op apart from a new commitment.
  baseline_spoken_for numeric,
  incoming_amount     numeric,   -- p_amount in the event currency; null if unconvertible
  projected           numeric,
  -- Whether this act actually puts more money on the event than is already on
  -- it. False for the second leg of one deal — see `would_exceed`.
  increases_exposure  boolean,
  remaining_before    numeric,
  over_by             numeric,   -- 0 when it fits
  would_exceed        boolean,
  would_warn          boolean,
  allocation_amount   numeric,   -- the line's allocation, when one was named
  allocation_over_by  numeric,
  would_exceed_allocation boolean,
  convertible         boolean,
  enforced            boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  e          public.events;
  v_cur      text;
  v_budget   numeric;
  v_warn     numeric := coalesce((public.get_setting('event_budget_warn_threshold') #>> '{}')::numeric, 80);
  v_enforce  boolean := coalesce((public.get_setting('event_budget_enforce') #>> '{}')::boolean, true);
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  v_cur    := coalesce(e.currency, 'UGX');
  v_budget := coalesce(e.budget_max, e.budget_min);

  return query
  with all_lines as (select * from public.event_money_lines(p_event_id)),
  lines as (
    select * from all_lines l
     where not (l.source = 'quotation' and l.ref_id is not distinct from p_exclude_quotation_id)
       and not (l.source = 'booking'   and l.ref_id is not distinct from p_exclude_booking_id)
  ),
  base as (
    select coalesce(sum(l.amount), 0) as total from all_lines l
  ),
  agg as (
    select
      coalesce(sum(l.amount) filter (where l.bucket = 'committed'), 0) as committed,
      coalesce(sum(l.amount) filter (where l.bucket = 'pending'), 0)   as pending,
      coalesce(sum(l.amount) filter (where l.requirement_id
                                       is not distinct from p_requirement_id), 0) as on_line
    from lines l
  ),
  line as (
    select r.allocated_amount
      from public.event_requirements r
     where r.id = p_requirement_id and r.deleted_at is null
  ),
  calc as (
    select
      agg.committed,
      agg.pending,
      agg.committed + agg.pending as spoken,
      agg.on_line,
      base.total as baseline,
      public.fx_convert(p_amount, coalesce(p_currency, v_cur), v_cur) as incoming,
      (select allocated_amount from line) as alloc
    from agg, base
  )
  select
    v_cur,
    v_budget,
    calc.committed,
    calc.pending,
    calc.spoken,
    calc.baseline,
    calc.incoming,
    calc.spoken + coalesce(calc.incoming, 0),
    (calc.incoming is not null and calc.spoken + calc.incoming > calc.baseline),
    case when v_budget is null then null else v_budget - calc.spoken end,
    -- Never negative. "Over by 0" and "under by 3m" are the same state and the
    -- caller should not have to know that a negative overage means headroom.
    case
      when v_budget is null or calc.incoming is null then 0
      else greatest(calc.spoken + calc.incoming - v_budget, 0)
    end,
    -- TWO conditions, and the second is what stops the guard eating its own
    -- tail. Over budget is not enough: converting an accepted quote into its
    -- booking moves the SAME money from one band to the other and puts nothing
    -- new on the event, so `projected` comes back equal to `baseline`. Without
    -- the second test, a client who legitimately acknowledged one overage would
    -- be refused at every later step of that same deal and asked to acknowledge
    -- a no-op — and, worse, an event once over budget would refuse every
    -- remaining step of every deal already agreed under it.
    --
    -- An unconvertible amount cannot be shown to exceed anything either. It is
    -- reported through `convertible = false` instead, and 0901e treats that as
    -- a warning rather than a refusal: refusing a real deal because a rate feed
    -- is stale would be the platform's problem charged to the client.
    (v_budget is not null and calc.incoming is not null
     and calc.spoken + calc.incoming > v_budget
     and calc.spoken + calc.incoming > calc.baseline),
    (v_budget is not null and calc.incoming is not null and v_budget > 0
     and (calc.spoken + calc.incoming) * 100 / v_budget >= v_warn),
    calc.alloc,
    case
      when calc.alloc is null or calc.incoming is null then 0
      else greatest(calc.on_line + calc.incoming - calc.alloc, 0)
    end,
    (calc.alloc is not null and calc.incoming is not null
     and calc.on_line + calc.incoming > calc.alloc),
    (calc.incoming is not null),
    v_enforce
  from calc;
end;
$$;

comment on function public.event_budget_check(uuid, numeric, text, uuid, uuid, uuid) is
  'Client-or-admin: would committing p_amount take this event (and optionally one budget line) '
  'over? Returns a row rather than raising, because the UI asks the same question before the act '
  'that the committing RPCs ask during it. Exclusions prevent double-counting a quotation that is '
  'about to become the booking being checked.';

grant execute on function
  public.event_budget_summary(uuid),
  public.event_requirement_summary(uuid),
  public.event_budget_check(uuid, numeric, text, uuid, uuid, uuid)
to authenticated;

-- `event_money_lines` is deliberately NOT granted. It does no authorisation of
-- its own; the three functions above are its only callers and each gates first.
revoke execute on function public.event_money_lines(uuid) from public, anon, authenticated;
