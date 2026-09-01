-- =====================================================================
-- Sinnapi — 0901d EVENT PLANNING: sourcing
--
-- How a budget line gets a vendor against it. Four ways in, and they converge
-- on the one flow the platform already has — a quotation the vendor prices and
-- the client accepts:
--
--   the client writes a line              save_event_requirement
--   a vendor volunteers on a public event express_event_interest
--   the client approaches a vendor        invite_vendor_to_event
--   the client picks between them         set_event_interest_status
--
-- WHY INTEREST AND QUOTATION ARE CREATED TOGETHER
-- `event_interests` has existed since 0005 and has never led anywhere. A vendor
-- pressed "Express interest", a row appeared that only an admin could see, and
-- the client — who is the person the interest is addressed to — was never told
-- and had no way to answer. Meanwhile `send_quotation` cannot start a quote: it
-- requires a `quotations` row to already exist, and the only thing that creates
-- one is the client asking first. So the vendor could raise their hand and then
-- could not put a price on it, and the client could not ask them to.
--
-- Expressing interest now opens the draft quote in the same call. The interest
-- still stands on its own if the vendor abandons the draft — "interested, no
-- price yet" is a real state and the client can chase it — but the vendor lands
-- in the builder with the event's brief in front of them, which is the only
-- reason they pressed the button.
--
-- WHY THE VENDOR NEVER SEES THE MONEY
-- Everything in this file that a vendor can call returns categories, titles and
-- briefs, and no allocation. `events.budget_max` is already public by design —
-- it is the client advertising a range — but how much of it is left, and how it
-- is split, is the client's negotiating position. A vendor who can see that
-- 3m of a decor allocation is unspent does not quote 2.5m.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Which vendor is the caller? Null for anyone who is not a vendor owner.
--
-- Derived rather than passed. Every vendor-facing RPC below could have taken a
-- `p_vendor_id` and checked ownership — that is what `is_approved_active_vendor`
-- is for — but a parameter that must always equal one derivable value is a
-- parameter that will eventually be passed the wrong one.
-- ---------------------------------------------------------------------
create or replace function public.current_vendor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select v.id from public.vendors v
   where v.owner_id = auth.uid() and v.deleted_at is null
   order by v.created_at asc
   limit 1;
$$;

comment on function public.current_vendor_id() is
  'The vendor the signed-in user owns, or null. Derived so no RPC has to take a vendor id it '
  'would only ever check against this.';

-- =====================================================================
-- REQUIREMENTS — the client's own budget lines
-- =====================================================================

-- ---------------------------------------------------------------------
-- save_event_requirement — create or edit one line.
--
-- Upsert on (event, category) rather than insert-or-fail, because the client's
-- mental model is "Decor is a thing I need", not "Decor is a row". A client
-- who adds Decor twice means the second amount, and telling them a duplicate
-- exists sends them to find a line they cannot see.
--
-- NOT budget-guarded. Allocating 25m across the lines of a 20m event is a
-- planning state, not a commitment — a client sketching out what they want
-- before trimming it is doing the thing this table is for. The over-allocation
-- shows up as a negative `unallocated_amount` on the summary and the page says
-- so. The guard exists for money that actually moves, which is 0901e.
-- ---------------------------------------------------------------------
create or replace function public.save_event_requirement(
  p_event_id         uuid,
  p_category_id      uuid,
  p_title            text    default null,
  p_brief            text    default null,
  p_allocated_amount numeric default null,
  p_priority         text    default 'must_have',
  p_sort_order       integer default null,
  p_requirement_id   uuid    default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e        public.events;
  v_id     uuid;
  v_title  text := nullif(btrim(coalesce(p_title, '')), '');
  v_brief  text := nullif(btrim(coalesce(p_brief, '')), '');
  v_prio   requirement_priority;
  v_sort   integer;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into e from public.events ev
   where ev.id = p_event_id and ev.deleted_at is null for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.posted_by <> auth.uid() then perform public._forbidden(); end if;

  if p_priority not in ('must_have', 'nice_to_have') then raise exception 'invalid_priority'; end if;
  v_prio := p_priority::requirement_priority;

  if not exists (select 1 from public.service_categories c
                  where c.id = p_category_id and c.is_active) then
    raise exception 'category_unavailable';
  end if;

  if p_allocated_amount is not null then
    if p_allocated_amount < 0 then raise exception 'allocation_negative'; end if;
    -- The column is numeric(14,2); a figure that will not fit is better refused
    -- by name here than as a constraint violation the client cannot read.
    if p_allocated_amount >= 1e12 then raise exception 'allocation_too_large'; end if;
  end if;

  if v_title is not null and length(v_title) > 120 then raise exception 'title_too_long'; end if;
  if v_brief is not null and length(v_brief) > 2000 then raise exception 'brief_too_long'; end if;

  -- New lines land at the end. Reordering is a separate act with its own call,
  -- so an edit that does not mention position must not silently move the line.
  v_sort := coalesce(
    p_sort_order,
    (select coalesce(max(r.sort_order), -1) + 1 from public.event_requirements r
      where r.event_id = p_event_id and r.deleted_at is null));

  if p_requirement_id is not null then
    update public.event_requirements r
       set category_id      = p_category_id,
           title            = v_title,
           brief            = v_brief,
           allocated_amount = p_allocated_amount,
           priority         = v_prio,
           sort_order       = coalesce(p_sort_order, r.sort_order),
           updated_by       = auth.uid()
     where r.id = p_requirement_id
       and r.event_id = p_event_id
       and r.deleted_at is null
    returning r.id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
    return v_id;
  end if;

  insert into public.event_requirements(
      event_id, category_id, title, brief, allocated_amount, priority, sort_order, created_by)
  values (p_event_id, p_category_id, v_title, v_brief, p_allocated_amount, v_prio, v_sort, auth.uid())
  -- The partial unique index is on live rows, so a line the client soft-deleted
  -- earlier does not collide and does not come back either — this reaches the
  -- DO UPDATE only for a line that is currently on their screen.
  on conflict (event_id, category_id) where deleted_at is null do update
     set title            = excluded.title,
         brief            = excluded.brief,
         allocated_amount = excluded.allocated_amount,
         priority         = excluded.priority,
         -- Re-adding a category the client had cancelled means they want it
         -- again. Leaving `cancelled_at` set would file the line back under
         -- "not wanted" the moment it was re-added.
         cancelled_at     = null,
         cancelled_by     = null,
         updated_by       = auth.uid()
  returning id into v_id;

  return v_id;
end;$$;

-- ---------------------------------------------------------------------
-- cancel_event_requirement — "we are not doing this after all", and its undo.
--
-- Distinct from deleting the line. A cancelled requirement keeps every quote
-- and booking made against it, and any of those that were committed still count
-- against the budget: withdrawing the plan does not withdraw the money already
-- promised. What it stops is the line claiming an allocation and appearing as a
-- gap to recommend into.
-- ---------------------------------------------------------------------
create or replace function public.cancel_event_requirement(
  p_requirement_id uuid,
  p_cancelled      boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select e.posted_by into v_owner
    from public.event_requirements r
    join public.events e on e.id = r.event_id
   where r.id = p_requirement_id and r.deleted_at is null and e.deleted_at is null;
  if v_owner is null then raise exception 'not_found'; end if;
  if v_owner <> auth.uid() then perform public._forbidden(); end if;

  update public.event_requirements
     set cancelled_at = case when p_cancelled then now() end,
         cancelled_by = case when p_cancelled then auth.uid() end,
         updated_by   = auth.uid()
   where id = p_requirement_id;
end;$$;

-- ---------------------------------------------------------------------
-- delete_event_requirement — the line was a mistake.
--
-- Refused once anything is attached to it. A line with a booking against it is
-- the only record of which part of the budget that booking answers, and the
-- `on delete set null` on `bookings.requirement_id` would quietly cut that
-- link. A client who no longer wants the line but has already engaged someone
-- cancels it; deleting is for the line typed in error.
-- ---------------------------------------------------------------------
create or replace function public.delete_event_requirement(p_requirement_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select e.posted_by into v_owner
    from public.event_requirements r
    join public.events e on e.id = r.event_id
   where r.id = p_requirement_id and r.deleted_at is null and e.deleted_at is null;
  if v_owner is null then raise exception 'not_found'; end if;
  if v_owner <> auth.uid() then perform public._forbidden(); end if;

  if exists (select 1 from public.bookings b
              where b.requirement_id = p_requirement_id and b.deleted_at is null)
     or exists (select 1 from public.quotations q
                 where q.requirement_id = p_requirement_id and q.deleted_at is null) then
    raise exception 'requirement_in_use';
  end if;

  -- The soft-delete trigger from 0010 turns this into an update. Written as a
  -- delete so the intent reads as one, and so the routing stays in one place.
  delete from public.event_requirements where id = p_requirement_id;
end;$$;

-- ---------------------------------------------------------------------
-- list_event_requirements_public — what a vendor is allowed to see.
--
-- The categories the event needs and the brief for each, with no allocation and
-- no rollup. Readable by any signed-in user for a published public event,
-- because that is who the event is advertised to, and a vendor deciding whether
-- to express interest needs to know whether the client wants what they sell.
--
-- Its own function rather than an RLS policy on `event_requirements`, because
-- the rule being enforced is column-level — vendors may read four of the
-- columns and must never read `allocated_amount` — and RLS filters rows.
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
         -- Whether the client still needs someone for this. Derived from
         -- committed bookings only: a line with two quotes out is still worth a
         -- third vendor's time, but one already booked is not.
         not exists (select 1 from public.bookings b
                      where b.requirement_id = r.id
                        and b.deleted_at is null
                        and b.status in ('confirmed', 'in_progress', 'completed'))
  from public.event_requirements r
  join public.service_categories c on c.id = r.category_id
  where r.event_id = p_event_id
    and r.deleted_at is null
    and r.cancelled_at is null
  order by r.sort_order, c.sort_order, c.name;
end;$$;

-- =====================================================================
-- SOURCING — the three ways a vendor ends up against a line
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared: open (or find) the quotation that carries one vendor⇄event pair.
--
-- Internal, and it is the reason the two entry points below cannot drift. Both
-- an invitation and an expression of interest need "the live quote for this
-- vendor on this event, creating one if there isn't one", and both must be safe
-- to press twice — the second tap of a double-tap, or a vendor re-opening a
-- draft they abandoned. Returning the existing row is what makes them
-- idempotent; the alternative is a client with four quote requests out to one
-- vendor because the button did not disable fast enough.
--
-- `p_status` differs because the two starts are different facts: an invited
-- vendor has a request waiting for them (`requested`), and a vendor who
-- volunteered is already writing (`draft`).
-- ---------------------------------------------------------------------
create or replace function public.open_event_quotation(
  p_event_id       uuid,
  p_vendor_id      uuid,
  p_client_id      uuid,
  p_requirement_id uuid,
  p_details        text,
  p_status         quotation_status,
  p_currency       text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
begin
  -- An OPEN quote for this line is the quote. Two exclusions carry real weight:
  --
  --   `accepted` is not reusable. It is a settled deal, and reusing it would
  --   mean a client inviting the same vendor for a second line re-pointed the
  --   agreed one at the new line — silently moving a booked commitment from
  --   Photography to Decor. A fresh approach to a vendor who already won
  --   something is a new quote.
  --
  --   the line has to match. One vendor may legitimately quote for two lines of
  --   one event — the caterer who also does the cake — so the key is
  --   (event, vendor, client, LINE), not (event, vendor, client). A quote that
  --   has not been assigned to a line yet is adoptable by the first caller that
  --   names one; one already on a different line is not.
  select q.id into v_id
    from public.quotations q
   where q.event_id = p_event_id
     and q.vendor_id = p_vendor_id
     and q.client_id = p_client_id
     and q.deleted_at is null
     and q.status in ('requested', 'draft', 'sent', 'revised')
     and (p_requirement_id is null
          or q.requirement_id is null
          or q.requirement_id = p_requirement_id)
   -- An exact line match beats an unassigned quote, so a caller naming a line
   -- adopts the quote already on it rather than the older loose one.
   order by (q.requirement_id is not distinct from p_requirement_id) desc,
            q.created_at desc
   limit 1;

  if v_id is not null then
    update public.quotations q
       -- Fills a gap; never overwrites. The line a quote already carries is the
       -- line the vendor has been pricing against.
       set requirement_id  = coalesce(q.requirement_id, p_requirement_id),
           -- A draft is the vendor's private scratch — it sits in no queue and
           -- the client cannot see it. A client inviting them turns it into a
           -- real request, which is what puts it in front of the vendor and
           -- lets the client see that they have asked. Only ever upwards:
           -- a vendor re-opening their draft must not demote a request the
           -- client has already made of them.
           status          = case when p_status = 'requested' and q.status = 'draft'
                                  then 'requested'::quotation_status
                                  else q.status end,
           -- Only while it is still a request. Rewriting the brief under a
           -- quote the vendor has already priced would leave the client reading
           -- one set of requirements and the vendor having answered another.
           request_details = case
             when q.status in ('requested', 'draft')
               then coalesce(nullif(btrim(coalesce(p_details, '')), ''), q.request_details)
             else q.request_details
           end
     where q.id = v_id;
    return v_id;
  end if;

  -- `reference_no` is trigger-assigned (0807a) and can collide; the retry loop
  -- is the same one `request_quotation` and `create_booking` use.
  for i in 1 .. 8 loop
    begin
      insert into public.quotations(
          vendor_id, client_id, event_id, requirement_id,
          status, currency, request_details)
      values (p_vendor_id, p_client_id, p_event_id, p_requirement_id,
              p_status, coalesce(p_currency, 'UGX'),
              nullif(btrim(coalesce(p_details, '')), ''))
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: quotations' using errcode = '23505';
end;$$;

revoke execute on function
  public.open_event_quotation(uuid, uuid, uuid, uuid, text, quotation_status, text)
from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- express_event_interest — the vendor volunteers, and starts pricing.
--
-- Replaces the bare insert the vendor portal has been doing since the feed
-- shipped. That insert leaned entirely on `interests_write`'s
-- `is_approved_active_vendor` check and said nothing about the event: a vendor
-- could register interest in a draft event, an archived one, or one whose date
-- has passed, and the unique constraint turned a second tap into a raw
-- `23505` on the vendor's screen.
--
-- Returns the quotation to open, which is the whole point — the caller
-- navigates straight into the builder.
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
  v_quote    uuid;
  v_existing interest_status;
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
    select r.id into v_req from public.event_requirements r
     where r.id = p_requirement_id and r.event_id = p_event_id
       and r.deleted_at is null and r.cancelled_at is null;
    if v_req is null then raise exception 'requirement_not_found'; end if;
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
  'price it. Idempotent — a second call returns the quote already in play.';

-- ---------------------------------------------------------------------
-- invite_vendor_to_event — the client approaches a vendor.
--
-- The other direction, and the reason `interest_status` gained `invited` in
-- 0901a. The vendor gets a `requested` quotation, which is exactly what they
-- get when a client asks from their profile, so the whole existing quote
-- builder works unchanged — the only difference is that this one arrives
-- carrying the event and the budget line it answers.
--
-- The brief falls back through three sources: what the client typed here, the
-- requirement's own brief, then the event description. A vendor who is asked to
-- quote with no brief at all cannot price anything, and the client has usually
-- already written the words — on the line, or on the event.
-- ---------------------------------------------------------------------
create or replace function public.invite_vendor_to_event(
  p_event_id       uuid,
  p_vendor_id      uuid,
  p_requirement_id uuid default null,
  p_details        text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  e         public.events;
  r         public.event_requirements;
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
  v_quote   uuid;
  v_owner   uuid;
  v_wanted  text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;
  if e.posted_by <> auth.uid() then perform public._forbidden(); end if;

  -- Unlike `create_booking_from_quotation`, which honours a deal already struck
  -- with a vendor whose listing has since gone hidden, an invitation is a NEW
  -- approach. Nobody should be invited into a marketplace they are not
  -- currently part of.
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  if p_requirement_id is not null then
    select * into r from public.event_requirements
     where id = p_requirement_id and event_id = p_event_id
       and deleted_at is null and cancelled_at is null;
    if r.id is null then raise exception 'requirement_not_found'; end if;
  end if;

  if v_details is not null and length(v_details) > 2000 then raise exception 'details_too_long'; end if;
  v_details := coalesce(v_details, r.brief, e.description);

  insert into public.event_interests(event_id, vendor_id, status)
  values (p_event_id, p_vendor_id, 'invited')
  on conflict (event_id, vendor_id) do update
     -- Inviting a vendor who already volunteered must not demote them to
     -- `invited`; the client is confirming interest that already exists.
     set status     = case when event_interests.status = 'withdrawn'
                            then 'invited'::interest_status
                          else event_interests.status end,
         updated_at = now();

  v_quote := public.open_event_quotation(
    p_event_id, p_vendor_id, auth.uid(), r.id, v_details, 'requested', e.currency);

  select v.owner_id into v_owner from public.vendors v where v.id = p_vendor_id;

  -- What the vendor is being asked for, in the client's own words where they
  -- gave any: the line's title, else the category it sits under. Resolved into
  -- a variable rather than joined into the insert, because `r` is a record and
  -- a null requirement would otherwise turn the whole concatenation to null —
  -- which `notifications.title` is NOT NULL and would refuse, taking the
  -- invitation down with it.
  select coalesce(r.title, c.name) into v_wanted
    from public.service_categories c where c.id = r.category_id;

  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select v_owner, 'event.vendor_invited',
    'You have been invited to quote for an event',
    case
      when v_wanted is not null
        then 'The client is looking for ' || v_wanted || ' for “' || e.title || '”. '
             || 'Open the request to send them a price.'
      else 'A client has asked you to quote for “' || e.title || '”.'
    end,
    jsonb_build_object(
      'event_id', p_event_id, 'vendor_id', p_vendor_id,
      'quotation_id', v_quote, 'requirement_id', r.id)
  where v_owner is not null;

  return v_quote;
end;$$;

comment on function public.invite_vendor_to_event(uuid, uuid, uuid, text) is
  'Client-only: invites a vendor to quote for one of their events, optionally against one budget '
  'line. Creates the `requested` quotation the existing builder answers. Idempotent.';

-- ---------------------------------------------------------------------
-- set_event_interest_status — the client picks, or passes.
--
-- The client's half of `admin_decide_event_vendor` (0717d), and it follows the
-- same rule about knock-on effects: declining a vendor declines the quotes they
-- have open on this event, because leaving a `sent` quote alive after telling
-- the vendor no is how a client ends up with an offer they thought they had
-- refused sitting in their accept queue.
--
-- Shortlisting deliberately does NOT accept quotes, which is where it parts
-- company with the admin function. An admin approving a vendor is settling a
-- dispute; a client shortlisting one is saying "you are in the running". The
-- price is accepted by `respond_quotation`, which is the call that checks the
-- budget.
-- ---------------------------------------------------------------------
create or replace function public.set_event_interest_status(
  p_event_id  uuid,
  p_vendor_id uuid,
  p_status    text,
  p_reason    text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  e        public.events;
  v_status interest_status;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_owner  uuid;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if p_status not in ('shortlisted', 'declined', 'interested') then
    raise exception 'invalid_status';
  end if;
  if length(coalesce(v_reason, '')) > 500 then raise exception 'reason_too_long'; end if;
  v_status := p_status::interest_status;

  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;
  if e.posted_by <> auth.uid() then perform public._forbidden(); end if;

  update public.event_interests
     set status = v_status, updated_at = now()
   where event_id = p_event_id and vendor_id = p_vendor_id;
  if not found then raise exception 'interest_not_found'; end if;

  if p_status = 'declined' then
    perform set_config('sinnapi.status_reason', coalesce(v_reason, ''), true);
    update public.quotations
       set status = 'declined'::quotation_status, responded_at = now()
     where event_id = p_event_id
       and vendor_id = p_vendor_id
       and client_id = auth.uid()
       and deleted_at is null
       -- `accepted` is absent on purpose. A quote the client accepted is a deal
       -- with a booking hanging off it; unpicking that is a cancellation, not a
       -- change of mind about a shortlist.
       and status in ('requested', 'draft', 'sent', 'revised');
    perform set_config('sinnapi.status_reason', '', true);

    select v.owner_id into v_owner from public.vendors v where v.id = p_vendor_id;
    insert into public.notifications(recipient_id, trigger_key, title, body, data)
    select v_owner, 'event.interest_declined',
      'A client has gone another way',
      coalesce('They said: ' || v_reason,
               'The client has chosen not to take this one forward. Any open quote for this event '
               || 'has been closed.'),
      jsonb_build_object('event_id', p_event_id, 'vendor_id', p_vendor_id)
    where v_owner is not null;
  end if;
end;$$;

comment on function public.set_event_interest_status(uuid, uuid, text, text) is
  'Client-only: shortlist a vendor on their event, or decline them (which closes that vendor’s '
  'open quotes for the event). Never accepts a price — that is respond_quotation.';

grant execute on function
  public.current_vendor_id(),
  public.save_event_requirement(uuid, uuid, text, text, numeric, text, integer, uuid),
  public.cancel_event_requirement(uuid, boolean),
  public.delete_event_requirement(uuid),
  public.list_event_requirements_public(uuid),
  public.express_event_interest(uuid, text, uuid),
  public.invite_vendor_to_event(uuid, uuid, uuid, text),
  public.set_event_interest_status(uuid, uuid, text, text)
to authenticated;
