-- =====================================================================
-- Sinnapi — 0901k EVENT PLANNING: putting two prices next to each other
--
-- The vendor board (0901i) shows every quote as a card in a list, which answers
-- "who has replied" and does not answer "which of these should I take". Those
-- are different questions: the second one is asked about two or three quotes at
-- once, attribute by attribute, and a vertical list makes the reader hold each
-- figure in their head while they scroll to the next one.
--
-- WHY THE WHOLE PAYLOAD IN ONE CALL
-- A comparison is worthless if its columns arrive at different times — a client
-- reading three totals while a fourth column is still loading will compare the
-- three. So everything the comparison shows, including each quote's line items,
-- comes back in one round trip, with the items as `jsonb` rather than as a
-- second query the caller would have to fan out and re-assemble.
--
-- WHAT IS WORTH COMPARING, AND WHY IT IS MORE THAN THE TOTAL
-- Two caterers at 8m are not the same offer if one wants 50% up front and the
-- other 10%, or if one quote expires on Friday. `bookings` inherits
-- `advance_rate` and `advance_release_days_before` straight off the accepted
-- quotation (0816g), so those are terms the client is agreeing to at the moment
-- they accept — and until now the only place to read them was inside each quote,
-- one at a time.
--
-- THE CAP IS SERVER-SIDE TOO
-- Four. The UI offers three, because usability testing on comparison tools is
-- consistent that more than about three columns stops being read — but the cap
-- also has to hold here, because `p_quotation_ids` is an array arriving through
-- PostgREST and an uncapped one is an invitation to ask for two hundred.
-- =====================================================================
create or replace function public.compare_event_quotations(
  p_event_id       uuid,
  p_quotation_ids  uuid[])
returns table (
  quotation_id       uuid,
  reference_no       text,
  status             text,
  sent_at            timestamptz,

  vendor_id          uuid,
  business_name      text,
  slug               text,
  primary_image_url  text,
  avg_rating         numeric,
  review_count       integer,
  is_featured        boolean,

  requirement_id     uuid,
  requirement_title  text,
  allocated_amount   numeric,

  currency           text,
  subtotal           numeric,
  discount_rate      numeric,
  discount_total     numeric,
  tax_rate           numeric,
  tax_inclusive      boolean,
  tax_total          numeric,
  total              numeric,
  total_in_event_currency numeric,
  event_currency     text,

  valid_until        timestamptz,
  is_expired         boolean,

  advance_rate       numeric,
  advance_release_days_before integer,
  advance_terms_note text,

  item_count         integer,
  items              jsonb
)
language plpgsql stable security definer set search_path = public as $$
declare
  e     public.events;
  v_cur text;
  v_n   integer := coalesce(array_length(p_quotation_ids, 1), 0);
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;

  -- Every figure below is a price the client was quoted. A vendor reading this
  -- would be reading their competitors' numbers, so this is owner-or-admin and
  -- never public.
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  if v_n = 0 then return; end if;
  if v_n > 4 then raise exception 'too_many_quotations'; end if;

  v_cur := coalesce(e.currency, 'UGX');

  -- Every id must belong to THIS event. Without it a client could name a
  -- quotation from another of their events — or, worse, probe for ids that are
  -- not theirs and learn which exist from whether a row comes back.
  if exists (
    select 1 from unnest(p_quotation_ids) as want(id)
     where not exists (
       select 1 from public.quotations q
        where q.id = want.id
          and q.event_id = p_event_id
          and q.client_id = auth.uid()
          and q.deleted_at is null)
  ) then
    raise exception 'quotation_not_on_event';
  end if;

  return query
  select
    q.id,
    q.reference_no,
    q.status::text,
    q.sent_at,

    v.id, v.business_name, v.slug, v.primary_image_url,
    v.avg_rating, v.review_count, v.is_featured,

    q.requirement_id,
    coalesce(r.title, rc.name),
    r.allocated_amount,

    q.currency,
    q.subtotal, q.discount_rate, q.discount_total,
    q.tax_rate, q.tax_inclusive, q.tax_total,
    q.total,
    public.fx_convert(q.total, q.currency, v_cur),
    v_cur,

    q.valid_until,
    (q.valid_until is not null and q.valid_until < now()),

    q.advance_rate, q.advance_release_days_before, q.advance_terms_note,

    coalesce(it.n, 0)::integer,
    coalesce(it.rows, '[]'::jsonb)
  from public.quotations q
  join public.vendors v on v.id = q.vendor_id
  left join public.event_requirements r  on r.id = q.requirement_id
  left join public.service_categories rc on rc.id = r.category_id
  left join lateral (
    select
      count(*) as n,
      jsonb_agg(jsonb_build_object(
        'description', qi.description,
        'quantity',    qi.quantity,
        'unit_price',  qi.unit_price,
        'line_total',  qi.line_total
      ) order by qi.sort_order, qi.description) as rows
    from public.quotation_items qi
   where qi.quotation_id = q.id
  ) it on true
  where q.id = any(p_quotation_ids)
  -- Cheapest first, in the event's currency. The comparison marks the best
  -- value per attribute anyway, but the leftmost column being the cheapest is
  -- what a reader expects and is one less thing to work out.
  order by public.fx_convert(q.total, q.currency, v_cur) nulls last, q.total;
end;
$$;

comment on function public.compare_event_quotations(uuid, uuid[]) is
  'Client-or-admin: two to four quotations on one event, side by side — pricing breakdown, '
  'validity, advance terms and line items, with totals restated in the event currency. Refuses '
  'ids that are not the caller''s own on this event.';

grant execute on function public.compare_event_quotations(uuid, uuid[]) to authenticated;
