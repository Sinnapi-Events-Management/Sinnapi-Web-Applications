-- =====================================================================
-- Sinnapi — 0901i EVENT PLANNING: who is in the running
--
-- The client's side of `event_interests`. Admins have had `search_event_interests`
-- since 0717d; the client — the person the interest is actually addressed to —
-- has had nothing, which is why 0901d's header calls the table a dead end.
--
-- WHAT ONE ROW IS
-- An ENGAGEMENT: one vendor, on one budget line, with whatever has happened
-- between them and the client so far. Not one row per vendor, because 0901d
-- deliberately lets one vendor quote for two lines of the same event — the
-- caterer who also does the cake — and collapsing those into one row would make
-- the client choose between two prices they were never offered as alternatives.
--
-- So: one row per quotation, plus one row per vendor whose interest has not
-- produced a quotation yet. That second half is the state the whole feature
-- exists to make visible — "interested, no price yet", which the client can
-- chase.
--
-- WHY THE AMOUNT IS CONVERTED HERE
-- The board is where a client compares prices, and comparing 1,200 against
-- 4,400,000 is not comparing. `amount_in_event_currency` restates every quote
-- in the currency the budget is in, through the same `fx_convert` the rollups
-- use — so the figure a client compares on this board is the figure the guard
-- will check when they accept. NULL when the pair has no rate, and the card
-- says so rather than showing a converted number that does not exist.
-- =====================================================================
create or replace function public.list_event_vendors(
  p_event_id       uuid,
  p_requirement_id uuid default null)
returns table (
  -- Identity of the engagement. Not the vendor id: a vendor can appear twice.
  engagement_key      text,
  vendor_id           uuid,
  business_name       text,
  slug                text,
  primary_image_url   text,
  base_city           text,
  avg_rating          numeric,
  review_count        integer,
  is_featured         boolean,
  category_name       text,

  requirement_id      uuid,
  requirement_title   text,

  interest_status     text,
  interest_message    text,
  interest_at         timestamptz,

  quotation_id        uuid,
  quotation_reference text,
  quotation_status    text,
  quotation_total     numeric,
  quotation_currency  text,
  quotation_valid_until timestamptz,
  amount_in_event_currency numeric,

  booking_id          uuid,
  booking_status      text,

  event_currency      text
)
language plpgsql stable security definer set search_path = public as $$
declare
  e     public.events;
  v_cur text;
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;

  -- Owner or admin only. This row set carries every price the client has been
  -- quoted; a vendor reading it would be reading their competitors' numbers.
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  v_cur := coalesce(e.currency, 'UGX');

  return query
  with quotes as (
    select q.*
      from public.quotations q
     where q.event_id = p_event_id
       and q.deleted_at is null
       and (p_requirement_id is null or q.requirement_id = p_requirement_id)
  ),
  interests as (
    select ei.*
      from public.event_interests ei
     where ei.event_id = p_event_id
  ),
  engagements as (
    -- One row per quotation.
    select
      'q:' || q.id::text        as key,
      q.vendor_id,
      q.requirement_id,
      i.status                  as interest_status,
      i.message                 as interest_message,
      i.created_at              as interest_at,
      q.id                      as quotation_id,
      q.reference_no,
      q.status::text            as quotation_status,
      q.total,
      q.currency,
      q.valid_until
    from quotes q
    left join interests i on i.vendor_id = q.vendor_id

    union all

    -- One row per vendor who put their hand up and has not priced anything.
    -- Filtered out entirely when the caller asked for a single line, because an
    -- interest is recorded against the EVENT and never names a line — see
    -- 0901d. Attributing it to whichever line happened to be open would be the
    -- platform inventing an intention the vendor never expressed.
    select
      'i:' || i.vendor_id::text,
      i.vendor_id,
      null::uuid,
      i.status,
      i.message,
      i.created_at,
      null::uuid,
      null::text,
      null::text,
      null::numeric,
      null::text,
      null::timestamptz
    from interests i
    where p_requirement_id is null
      and not exists (select 1 from quotes q where q.vendor_id = i.vendor_id)
  )
  select
    g.key,
    g.vendor_id,
    v.business_name,
    v.slug,
    v.primary_image_url,
    v.base_city,
    v.avg_rating,
    v.review_count,
    v.is_featured,
    c.name,
    g.requirement_id,
    coalesce(r.title, rc.name),
    g.interest_status::text,
    g.interest_message,
    g.interest_at,
    g.quotation_id,
    g.reference_no,
    g.quotation_status,
    g.total,
    g.currency,
    g.valid_until,
    public.fx_convert(g.total, g.currency, v_cur),
    b.id,
    b.status::text,
    v_cur
  from engagements g
  join public.vendors v on v.id = g.vendor_id
  left join public.service_categories c  on c.id = v.primary_category_id
  left join public.event_requirements r  on r.id = g.requirement_id
  left join public.service_categories rc on rc.id = r.category_id
  -- The booking made from this quote, if the client got that far.
  -- `ux_bookings_quotation` (0816g) makes this at most one row.
  left join public.bookings b
         on b.quotation_id = g.quotation_id and b.deleted_at is null
  order by
    -- The client's own decisions first, then vendors waiting on one, then the
    -- ones they have already turned down. Within each, the newest activity —
    -- a vendor who quoted this morning is the one being thought about.
    case g.interest_status
      when 'shortlisted' then 0
      when 'interested'  then 1
      when 'invited'     then 2
      when 'declined'    then 4
      when 'withdrawn'   then 5
      else 3
    end,
    g.interest_at desc nulls last,
    v.business_name;
end;
$$;

comment on function public.list_event_vendors(uuid, uuid) is
  'Client-or-admin: every vendor engagement on one event — one row per quotation, plus one per '
  'vendor whose interest has produced no quote yet. Quote totals are restated in the event '
  'currency so the client compares like with like. Owner-gated: this carries competitors'' prices.';

grant execute on function public.list_event_vendors(uuid, uuid) to authenticated;
