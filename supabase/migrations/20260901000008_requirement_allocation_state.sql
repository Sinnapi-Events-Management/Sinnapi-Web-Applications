-- =====================================================================
-- Sinnapi — 0901h EVENT PLANNING: a budget line's own standing
--
-- WHAT WAS MISSING
-- `event_requirement_summary` (0901c) returns a line's allocation and what is
-- spoken for against it, and a `state` that describes its SOURCING — open,
-- sourcing, booked, cancelled. That is the right answer to "have I found
-- someone yet" and no answer at all to "can I still afford them", which is the
-- other half of what a budget line is for.
--
-- The requirements list draws a meter per line, and a meter needs to know
-- whether it is healthy, near the line or over it. Without this column the
-- portal would have had to derive that in TypeScript from `usage_percent` — a
-- second copy of the ladder `event_budget_summary` already owns, free to drift
-- from it the first time the threshold moves. One event page would then have
-- shown an amber line inside a green event, or the reverse, and both would have
-- been "right" according to their own arithmetic.
--
-- So the same four-value ladder, computed the same way, from the same setting.
--
-- WHY IT IS PURELY PRESENTATIONAL — AND SAYING SO MATTERS
-- Nothing enforces a line's allocation. `event_budget_check` reports
-- `would_exceed_allocation` and `assert_event_budget` deliberately ignores it:
-- the allocation is the client's own sketch of how the budget divides, and the
-- BUDGET is the thing they committed to. A client who puts 5m of decor through
-- a 3m decor line while staying under the event total has not done anything
-- that needs refusing — they have moved money between their own pockets.
--
-- `allocation_state` therefore colours a bar and never blocks a booking, which
-- is exactly the opposite of `event_budget_summary.state`. Two states with one
-- ladder and two jobs, and this comment is the only place that difference is
-- written down.
--
-- DROP AND RECREATE, not `create or replace`: adding a column to a
-- `returns table` changes the return type, which `create or replace` refuses.
-- The drop is safe here because nothing has shipped against this function yet —
-- Phase 2 shipped the event and grid summaries, not the requirement one.
-- =====================================================================
drop function if exists public.event_requirement_summary(uuid);

create function public.event_requirement_summary(p_event_id uuid)
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
  state            text,
  -- The allocation ladder: unset / healthy / warning / exceeded, matching
  -- `event_budget_summary.state` value for value so one component renders both.
  allocation_state text
)
language plpgsql stable security definer set search_path = public as $$
declare
  e      public.events;
  v_warn numeric := coalesce((public.get_setting('event_budget_warn_threshold') #>> '{}')::numeric, 80);
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
    end,
    -- A line with no allocation is `unset`, not `healthy`: the client has named
    -- something they need without deciding what to spend on it, and a green bar
    -- would claim they are within a figure they never gave.
    case
      when coalesce(r.allocated_amount, 0) <= 0 then 'unset'
      when coalesce(m.committed, 0) + coalesce(m.pending, 0)
           > r.allocated_amount                 then 'exceeded'
      when (coalesce(m.committed, 0) + coalesce(m.pending, 0)) * 100
           / r.allocated_amount >= v_warn       then 'warning'
      else                                           'healthy'
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
  left join lateral (
    select count(*) as n from public.quotations q
     where q.requirement_id = r.id
       and q.deleted_at is null
       and q.status in ('requested', 'draft', 'sent', 'revised', 'accepted')
  ) qc on true
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
  'it, a derived sourcing state (open / sourcing / booked / cancelled) and a derived allocation '
  'state (unset / healthy / warning / exceeded). The allocation state colours a meter and is never '
  'enforced — assert_event_budget ignores per-line overspend on purpose.';

grant execute on function public.event_requirement_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- The categories a client may file a budget line under.
--
-- `service_categories` is world-readable (`ref_read_categories`, 0011), so the
-- portal could select from it directly — and `useFilterRefData` already does,
-- for the discovery filters. That read projects `key,name`, because a facet
-- filter matches on the key.
--
-- A budget line needs the `id`, since that is what `event_requirements`
-- references. Rather than widen the filter query — and ship an id to every
-- discovery filter that has no use for one — this is its own tiny function, and
-- it is the one place the "only active" rule for a NEW line is stated: a
-- retired category is one nobody should be able to file fresh work under, while
-- lines already filed against it keep rendering through the summary's join.
-- ---------------------------------------------------------------------
create or replace function public.list_service_category_options()
returns table (id uuid, key text, name text)
language sql stable security definer set search_path = public as $$
  select c.id, c.key, c.name
    from public.service_categories c
   where c.is_active
   order by c.sort_order, c.name;
$$;

comment on function public.list_service_category_options() is
  'The active service categories as pickable options, with ids — what a client files an event '
  'requirement under.';

grant execute on function public.list_service_category_options() to anon, authenticated;
