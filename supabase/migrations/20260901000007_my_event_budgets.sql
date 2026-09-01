-- =====================================================================
-- Sinnapi — 0901g EVENT PLANNING: every budget the client is planning, in one read
--
-- WHY THIS EXISTS
-- `event_budget_summary` (0901c) answers for one event, which is right for the
-- event page and wrong for the list in front of it. The client's events grid
-- shows a meter per card, and the obvious way to fill it — call the per-event
-- summary once per card — is a request per event on the first paint of the
-- page a client lands on most. Eight events is nine round trips before the
-- grid settles, on a connection where that is the difference between a page
-- and a wait.
--
-- So the grid gets one call. It is deliberately NOT a variant of
-- `event_budget_summary` with a nullable argument: that function is
-- owner-or-admin on a named event, and this one is "every event I posted",
-- which is a different authorisation with a different shape. Folding them
-- together would mean one function whose permission check depends on which
-- argument was null.
--
-- WHAT IT DOES NOT DUPLICATE
-- The definition of what spends a budget. It calls `event_money_lines` through
-- a LATERAL, exactly as the single-event summary does, so the figure on the
-- card and the figure on the page it opens cannot disagree. Restating the
-- union here as one grouped query would have been faster and would have
-- created a second definition of "committed" — which is the bug this whole
-- series was written to avoid.
--
-- The lateral is per-event, and a client has a handful of events, not a
-- million. `ix_events_poster` (0005) selects them and `ix_bookings_event` /
-- `ix_quotations_event` (0901b, 0006) serve each lateral.
-- =====================================================================
create or replace function public.list_my_event_budgets()
returns table (
  event_id               uuid,
  currency               text,
  budget_amount          numeric,
  allocated_amount       numeric,
  committed_amount       numeric,
  pending_amount         numeric,
  spoken_for             numeric,
  remaining_amount       numeric,
  usage_percent          numeric,
  requirement_count      integer,
  open_requirement_count integer,
  vendor_count           integer,
  unconverted_count      integer,
  warn_threshold         numeric,
  state                  text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_warn numeric := coalesce((public.get_setting('event_budget_warn_threshold') #>> '{}')::numeric, 80);
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  return query
  select
    e.id,
    coalesce(e.currency, 'UGX'),
    coalesce(e.budget_max, e.budget_min),
    coalesce(alloc.allocated, 0),
    coalesce(m.committed, 0),
    coalesce(m.pending, 0),
    coalesce(m.committed, 0) + coalesce(m.pending, 0),
    case when coalesce(e.budget_max, e.budget_min) is null then null
         else coalesce(e.budget_max, e.budget_min)
              - (coalesce(m.committed, 0) + coalesce(m.pending, 0)) end,
    case when coalesce(coalesce(e.budget_max, e.budget_min), 0) <= 0 then null
         else round((coalesce(m.committed, 0) + coalesce(m.pending, 0)) * 100
                    / coalesce(e.budget_max, e.budget_min), 1) end,
    coalesce(alloc.total_lines, 0)::integer,
    coalesce(alloc.open_lines, 0)::integer,
    coalesce(m.vendors, 0)::integer,
    coalesce(m.unconverted, 0)::integer,
    v_warn,
    -- Identical ladder to `event_budget_summary`. Restated rather than shared
    -- because a CASE cannot be called; if either moves, both move.
    case
      when coalesce(coalesce(e.budget_max, e.budget_min), 0) <= 0 then 'unset'
      when coalesce(m.committed, 0) + coalesce(m.pending, 0)
           > coalesce(e.budget_max, e.budget_min)                 then 'exceeded'
      when (coalesce(m.committed, 0) + coalesce(m.pending, 0)) * 100
           / coalesce(e.budget_max, e.budget_min) >= v_warn       then 'warning'
      else                                                             'healthy'
    end
  from public.events e
  left join lateral (
    select
      coalesce(sum(l.amount) filter (where l.bucket = 'committed'), 0) as committed,
      coalesce(sum(l.amount) filter (where l.bucket = 'pending'), 0)   as pending,
      count(distinct l.vendor_id)                                     as vendors,
      count(*) filter (where l.amount is null)                        as unconverted
    from public.event_money_lines(e.id) l
  ) m on true
  left join lateral (
    select
      coalesce(sum(r.allocated_amount), 0)         as allocated,
      count(*)                                     as total_lines,
      -- A line nobody has committed against yet: the gap a recommendation
      -- fills, and the number the card reports as "still to source".
      count(*) filter (where not exists (
        select 1 from public.bookings b
         where b.requirement_id = r.id
           and b.deleted_at is null
           and b.status in ('confirmed', 'in_progress', 'completed')))  as open_lines
    from public.event_requirements r
     where r.event_id = e.id
       and r.deleted_at is null
       and r.cancelled_at is null
  ) alloc on true
  where e.posted_by = auth.uid()
    and e.deleted_at is null
  order by e.created_at desc;
end;
$$;

comment on function public.list_my_event_budgets() is
  'Client-only: the budget rollup for every event the caller posted, one row each, so the events '
  'grid draws a meter per card in one request instead of one per card. Shares event_money_lines '
  'with event_budget_summary so a card and the page it opens cannot disagree.';

grant execute on function public.list_my_event_budgets() to authenticated;
