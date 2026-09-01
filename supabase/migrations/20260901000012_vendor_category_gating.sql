-- =====================================================================
-- 0901l — VENDOR CATEGORY GATING
--
-- THE BUG THIS CLOSES
-- A vendor approved for Photography and Videography could express interest in
-- — and open a real quotation against — a Makeup Artist line. `express_event_interest`
-- checked that the caller was a vendor, that their subscription was live, that the
-- event was published and not in the past, and then stopped. It never asked the one
-- question the client cares about: do they actually do this work?
--
-- The rule was not missing from the codebase. `recommend_vendors_for_event` (0901j)
-- has had it inline since it shipped — a vendor is a candidate for a line when they
-- were approved under its category or offer an active service in it. So the platform
-- was already answering "who could fill this line" correctly on the client's side and
-- not asking it at all on the vendor's. That asymmetry is what produced makeup quotes
-- from a photographer.
--
-- WHAT THIS MIGRATION DOES
--   1. Extracts that rule into `vendor_serves_category`, so it is written once.
--   2. Extracts "is this line still open" into `requirement_is_open`, for the same
--      reason — the sourcing gate and the public plan listing must agree on it.
--   3. Rebuilds `express_event_interest` around both.
--   4. Repoints `recommend_vendors_for_event` and `list_event_requirements_public`
--      at the helpers, so there is no second copy left to drift.
--
-- WHAT IT DELIBERATELY DOES NOT DO
-- `invite_vendor_to_event` is untouched. A client approaching a vendor directly is a
-- judgement, not an accident: they may know that vendor does the work off-catalogue,
-- or want them for a line they have not listed. Blocking it would override a decision
-- the client made on purpose. The client portal warns instead, in the invite dialog,
-- which is where the person making the choice can see it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- vendor_serves_category — can this vendor do this kind of work?
--
-- Two ways to qualify, and both are needed. `primary_category_id` is what the
-- vendor was approved under (`approve_vendor` copies it off the application),
-- and it is the only category a vendor who never published a service has.
-- `vendor_services` is how a photographer who also shoots video says so, and it
-- is the reason this cannot simply compare one column.
--
-- SECURITY DEFINER because both tables are behind RLS and this is asked about
-- OTHER people's vendors — the client portal's invite dialog and the sourcing
-- gate both need an answer about a vendor the caller does not own. It discloses
-- nothing new: `vendors` and `vendor_services` are already publicly readable for
-- a public vendor (`vendors_public_read`, `vsvc_read`), and the answer for a
-- non-public vendor is the same `false` a stranger would get anyway.
--
-- A null category is `true`: there is nothing to check, which is the honest
-- answer for an event with no itemised plan.
-- ---------------------------------------------------------------------
create or replace function public.vendor_serves_category(
  p_vendor_id   uuid,
  p_category_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_category_id is null
      or exists (select 1 from public.vendors v
                  where v.id = p_vendor_id
                    and v.deleted_at is null
                    and v.primary_category_id = p_category_id)
      or exists (select 1 from public.vendor_services vs
                  where vs.vendor_id = p_vendor_id
                    and vs.category_id = p_category_id
                    and vs.is_active
                    and vs.deleted_at is null);
$$;

comment on function public.vendor_serves_category(uuid, uuid) is
  'Whether a vendor may quote for a service category: approved under it, or offering an active '
  'service in it. The single definition — sourcing, recommendation and the client''s invite '
  'warning all read this one.';

grant execute on function public.vendor_serves_category(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- requirement_is_open — does the client still need someone for this line?
--
-- Committed bookings only, and that is the whole subtlety: a line with two
-- quotes already out is still worth a third vendor's time, and one that is
-- booked is not. Lifted verbatim out of `list_event_requirements_public` (0901d)
-- so the gate below and the list a vendor reads cannot disagree about which
-- lines are available — a plan showing a line as open beside a button that
-- refuses it is worse than either alone.
-- ---------------------------------------------------------------------
create or replace function public.requirement_is_open(p_requirement_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.bookings b
                      where b.requirement_id = p_requirement_id
                        and b.deleted_at is null
                        and b.status in ('confirmed', 'in_progress', 'completed'));
$$;

comment on function public.requirement_is_open(uuid) is
  'Whether an event requirement still needs a vendor. Committed bookings only — outstanding '
  'quotes do not close a line.';

grant execute on function public.requirement_is_open(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- list_event_requirements_public — repointed at the helper.
--
-- Identical output; the inline `not exists` is now the function above. Restated
-- here in full because `create or replace` takes a whole body, not a patch.
-- ---------------------------------------------------------------------
create or replace function public.list_event_requirements_public(p_event_id uuid)
returns table (
  id            uuid,
  category_id   uuid,
  category_key  text,
  category_name text,
  title         text,
  brief         text,
  priority      text,
  sort_order    integer,
  is_open       boolean
)
language plpgsql stable security definer set search_path = public as $$
declare e public.events;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;

  -- Same visibility rule as `events_public_read` (0011), restated rather than
  -- inherited: this function is SECURITY DEFINER and so does not get the policy
  -- applied for free.
  if not ((e.status = 'published' and e.is_public)
          or e.posted_by = auth.uid()
          or public.is_admin()) then
    perform public._forbidden();
  end if;

  return query
  select r.id, r.category_id, c.key, c.name, r.title, r.brief,
         r.priority::text, r.sort_order,
         public.requirement_is_open(r.id)
  from public.event_requirements r
  join public.service_categories c on c.id = r.category_id
  where r.event_id = p_event_id
    and r.deleted_at is null
    and r.cancelled_at is null
  order by r.sort_order, c.sort_order, c.name;
end;$$;

-- ---------------------------------------------------------------------
-- express_event_interest — now gated on what the vendor actually does.
--
-- The gate has two shapes, because the button has two shapes.
--
--   A LINE IS NAMED (the plan's "Quote for this"): the vendor must serve that
--   line's category. Nothing else is defensible — the client filed the line
--   under Makeup Artist and a photographer answering it is the bug.
--
--   NO LINE IS NAMED (the feed's "Express interest"): there is no single
--   category to check, so the question becomes "is there anything here for
--   them" — at least one line that is still open AND in a category they serve.
--   Without this the gate is trivially walked around: a vendor refused on the
--   makeup line just uses the feed button instead and lands in the same inbox.
--
--   THE EVENT HAS NO PLAN AT ALL: allowed, unchanged. A client who posted a
--   brief and never itemised it is asking for the whole thing, and there is no
--   category to judge against — refusing every vendor on an un-itemised brief
--   would quietly close the most common kind of event on the platform.
--
-- Raises `vendor_category_mismatch`, mapped to a sentence in both portals. It is
-- a distinct token from `vendor_not_eligible` on purpose: that one means "your
-- account or subscription is not in good standing", this one means "this is not
-- your line of work", and a vendor who reads the first when the second is true
-- goes to check their billing.
-- ---------------------------------------------------------------------
create or replace function public.express_event_interest(
  p_event_id       uuid,
  p_message        text default null,
  p_requirement_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e          public.events;
  v_vendor   uuid := public.current_vendor_id();
  v_message  text := nullif(btrim(coalesce(p_message, '')), '');
  v_req      uuid;
  v_category uuid;
  v_quote    uuid;
  v_existing interest_status;
  v_lines    integer;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if v_vendor is null then raise exception 'not_a_vendor'; end if;

  -- The subscription and approval gate. Identical to the one `interests_write`
  -- applied, kept because this function is SECURITY DEFINER and bypasses it.
  if not public.is_approved_active_vendor(v_vendor) then
    raise exception 'vendor_not_eligible';
  end if;

  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;
  if e.status <> 'published' or not e.is_public then raise exception 'event_unavailable'; end if;
  if e.posted_by = auth.uid() then raise exception 'own_event'; end if;

  -- Quoting for a date that has been and gone wastes both parties' time. The
  -- feed already hides past events; this is the backstop for a stale tab.
  if e.event_date is not null and e.event_date < current_date then
    raise exception 'event_past';
  end if;

  if v_message is not null and length(v_message) > 2000 then raise exception 'message_too_long'; end if;

  if p_requirement_id is not null then
    select r.id, r.category_id into v_req, v_category
      from public.event_requirements r
     where r.id = p_requirement_id and r.event_id = p_event_id
       and r.deleted_at is null and r.cancelled_at is null;
    if v_req is null then raise exception 'requirement_not_found'; end if;

    -- A line somebody has already been booked for is not available to bid on,
    -- whatever the vendor does. Checked before the category so the vendor is
    -- told the real reason rather than a category refusal on a dead line.
    if not public.requirement_is_open(v_req) then raise exception 'requirement_closed'; end if;

    if not public.vendor_serves_category(v_vendor, v_category) then
      raise exception 'vendor_category_mismatch';
    end if;
  else
    select count(*) into v_lines
      from public.event_requirements r
     where r.event_id = p_event_id
       and r.deleted_at is null
       and r.cancelled_at is null;

    -- Only where there is a plan to judge against. See the header.
    if v_lines > 0 and not exists (
         select 1 from public.event_requirements r
          where r.event_id = p_event_id
            and r.deleted_at is null
            and r.cancelled_at is null
            and public.requirement_is_open(r.id)
            and public.vendor_serves_category(v_vendor, r.category_id))
    then
      raise exception 'vendor_category_mismatch';
    end if;
  end if;

  select ei.status into v_existing from public.event_interests ei
   where ei.event_id = p_event_id and ei.vendor_id = v_vendor;

  insert into public.event_interests(event_id, vendor_id, message, status)
  values (p_event_id, v_vendor, v_message, 'interested')
  on conflict (event_id, vendor_id) do update
     set message    = coalesce(excluded.message, event_interests.message),
         -- A vendor answering an invitation moves to `interested`. One the
         -- client has already shortlisted stays shortlisted — the vendor
         -- pressing the button again must not undo the client's decision — and
         -- one the client declined stays declined, so a vendor cannot re-enter
         -- a race they were taken out of.
         status     = case
                        when event_interests.status in ('shortlisted', 'declined')
                          then event_interests.status
                        else 'interested'::interest_status
                      end,
         updated_at = now();

  v_quote := public.open_event_quotation(
    p_event_id, v_vendor, e.posted_by, v_req, v_message, 'draft', e.currency);

  -- The client is the audience for this. Only on the first expression: a vendor
  -- reopening their draft is not news, and `v_existing` is null exactly once.
  if v_existing is null then
    insert into public.notifications(recipient_id, trigger_key, title, body, data)
    select e.posted_by, 'event.interest_expressed',
      coalesce(v.business_name || ' is interested in your event', 'A vendor is interested in your event'),
      'They can now send you a quote. You can shortlist them, or ask them for more detail first.',
      jsonb_build_object(
        'event_id', p_event_id, 'vendor_id', v_vendor,
        'quotation_id', v_quote, 'requirement_id', v_req)
      from public.vendors v where v.id = v_vendor;
  end if;

  return v_quote;
end;$$;

comment on function public.express_event_interest(uuid, text, uuid) is
  'Vendor-only: records interest in a published public event AND opens the draft quotation to '
  'price it. Refuses a line the vendor does not serve, or an event whose whole plan is outside '
  'their categories. Idempotent — a second call returns the quote already in play.';


-- ---------------------------------------------------------------------
-- recommend_vendors_for_event — repointed at the shared helper.
--
-- Behaviour is unchanged: `vendor_serves_category` is the clause that used to
-- sit inline here, extracted verbatim. Restated in full because
-- `create or replace` takes a whole body, not a patch.
--
-- This is the half of the fix that keeps the two sides honest with each other.
-- A client is recommended vendors who serve the line; a vendor may now quote
-- only for lines they serve. One definition, so a vendor can never be
-- recommended for work the sourcing gate would then refuse them.
-- ---------------------------------------------------------------------
create or replace function public.recommend_vendors_for_event(
  p_event_id       uuid,
  p_requirement_id uuid    default null,
  p_only_available boolean default false,
  p_within_budget  boolean default false,
  p_match_region   boolean default false,
  p_limit          integer default null,
  p_offset         integer default 0)
returns table (
  vendor_id          uuid,
  business_name      text,
  slug               text,
  primary_image_url  text,
  base_city          text,
  biography          text,
  avg_rating         numeric,
  review_count       integer,
  is_featured        boolean,
  category_name      text,

  from_amount        numeric,
  from_currency      text,
  from_amount_in_event_currency numeric,

  is_available       boolean,
  covers_region      boolean,
  fits_budget        boolean,

  score              numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  e            public.events;
  r            public.event_requirements;
  v_cur        text;
  v_category   uuid;
  v_headroom   numeric;
  v_limit      integer;
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;

  -- Owner or admin. The budget headroom below is derived from figures a vendor
  -- must never read, so this cannot be a public browse endpoint.
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  v_cur   := coalesce(e.currency, 'UGX');
  v_limit := coalesce(p_limit,
                      (public.get_setting('event_recommendation_limit') #>> '{}')::integer, 12);

  if p_requirement_id is not null then
    select * into r from public.event_requirements
     where id = p_requirement_id and event_id = p_event_id and deleted_at is null;
    if r.id is null then raise exception 'requirement_not_found'; end if;
    v_category := r.category_id;
  end if;

  -- What the client can still spend on this. The line's own remaining
  -- allocation when a line is named — that is the figure they are shopping
  -- against — otherwise what is left of the whole budget.
  if p_requirement_id is not null and r.allocated_amount is not null then
    select r.allocated_amount - s.spoken_for
      into v_headroom
      from (select coalesce(sum(l.amount), 0) as spoken_for
              from public.event_money_lines(p_event_id) l
             where l.requirement_id = p_requirement_id) s;
  else
    select b.remaining_amount into v_headroom
      from public.event_budget_summary(p_event_id) b;
  end if;

  return query
  with candidate as (
    select
      v.id, v.business_name, v.slug, v.primary_image_url, v.base_city, v.biography,
      v.avg_rating, v.review_count, v.is_featured, v.search_weight,
      c.name as category_name
    from public.vendors v
    left join public.service_categories c on c.id = v.primary_category_id
    where public.vendor_is_public(v.id)
      -- The category gate, now the shared one. It used to be spelled out here,
      -- which is how the vendor's own sourcing path came to have no gate at
      -- all: there was nothing to reuse. `vendor_serves_category` handles the
      -- null (unscoped) case itself.
      and public.vendor_serves_category(v.id, v_category)
      -- Never re-suggest someone the client has passed on, on any line.
      and not exists (select 1 from public.event_interests ei
                       where ei.event_id = p_event_id
                         and ei.vendor_id = v.id
                         and ei.status in ('declined', 'withdrawn'))
      -- Already in the running for this line (or, unscoped, for the event).
      and not exists (select 1 from public.quotations q
                       where q.event_id = p_event_id
                         and q.vendor_id = v.id
                         and q.deleted_at is null
                         and (p_requirement_id is null
                              or q.requirement_id is not distinct from p_requirement_id))
      and not exists (select 1 from public.event_interests ei
                       where ei.event_id = p_event_id
                         and ei.vendor_id = v.id
                         and p_requirement_id is null)
  ),
  priced as (
    select
      cd.*,
      fp.o_amount   as from_amount,
      fp.o_currency as from_currency,
      public.fx_convert(fp.o_amount, fp.o_currency, v_cur) as from_in_event_cur,
      -- Free on the day. `vendor_blocked_dates` is the same table
      -- `create_booking` refuses against, so a vendor this says is available is
      -- one the booking RPC will actually accept.
      (e.event_date is null
       or not exists (select 1 from public.vendor_blocked_dates bd
                       where bd.vendor_id = cd.id and bd.blocked_date = e.event_date))
        as is_available,
      -- Region, as a heuristic and openly so: the event's location is free text
      -- a client typed, and this matches it against the vendor's declared
      -- service regions and their home city. It is a filter the client turns
      -- on, never a reason a vendor is silently buried.
      (e.location is null
       or cd.base_city is not null and e.location ilike '%' || cd.base_city || '%'
       or exists (select 1 from public.vendor_service_regions vsr
                    join public.service_regions sr on sr.id = vsr.region_id
                   where vsr.vendor_id = cd.id
                     and (e.location ilike '%' || sr.name || '%' or sr.scope = 'national')))
        as covers_region
    from candidate cd
    cross join lateral public.vendor_from_price(cd.id, v_category) fp
  ),
  scored as (
    select
      p.*,
      -- An unknown price PASSES the budget filter. See `vendor_from_price`.
      (v_headroom is null
       or p.from_in_event_cur is null
       or p.from_in_event_cur <= v_headroom) as fits_budget,
      -- The cast is load-bearing: `ln()` returns double precision, which makes
      -- the whole sum a float, and there is no `round(double precision, int)`
      -- in Postgres — only `round(numeric, int)`. Without it this fails at run
      -- time, not at creation, because a plpgsql body is not resolved until it
      -- is first executed.
      round(
        (
          (case when p.is_featured then 40 else 0 end)
          + coalesce(p.search_weight, 0)
          + coalesce(p.avg_rating, 0) * 8
          + ln(1 + coalesce(p.review_count, 0)) * 3
        )::numeric
      , 2) as score
    from priced p
  )
  select
    s.id, s.business_name, s.slug, s.primary_image_url, s.base_city, s.biography,
    s.avg_rating, s.review_count, s.is_featured, s.category_name,
    s.from_amount, s.from_currency, s.from_in_event_cur,
    s.is_available, s.covers_region, s.fits_budget,
    s.score
  from scored s
  where (not p_only_available or s.is_available)
    and (not p_within_budget  or s.fits_budget)
    and (not p_match_region   or s.covers_region)
  order by s.score desc, s.avg_rating desc nulls last, s.business_name
  limit v_limit offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

