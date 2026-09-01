-- =====================================================================
-- Sinnapi — 0901e EVENT PLANNING: the guard, wired in
--
-- `event_budget_check` (0901c) answers the question. This file makes the RPCs
-- that commit money ask it, and refuse when the answer is "over" unless the
-- client says otherwise in the same call.
--
--   respond_quotation('accept')          agreeing a price
--   create_booking_from_quotation        scheduling that price
--   create_booking                       booking a vendor directly
--
-- THE SHAPE OF THE REFUSAL
-- Each gains one parameter, `p_acknowledge_over_budget`, defaulting to false.
-- The first call comes back with `budget_exceeded: over by X CUR`, the UI shows
-- the client exactly how far over they are and what it would leave them, and
-- only a second, deliberate call carries `true`. That second call writes a row
-- to `event_budget_overrides` before it commits anything.
--
-- WHY A PARAMETER RATHER THAN A HARD BLOCK
-- A budget is the client's own estimate, and it is often wrong in the client's
-- favour — the photographer they want costs 4.2m against the 4m they guessed,
-- and no useful product tells them to go and edit a form before they may agree
-- to that. The refusal exists so nobody commits without seeing the number; it
-- does not exist to overrule them. What it must not be is silent, which is what
-- `event_budget_overrides` is for.
--
-- WHY THE VENDOR NEVER SEES ANY OF IT
-- Every check here is on a client action, keyed on the client's own event. A
-- vendor sending a quote, confirming a booking or countering terms passes
-- through none of it. A vendor must never learn that the client is near their
-- ceiling — that is the fact that turns a negotiation.
--
-- ON REPLACING THESE FOUR BODIES
-- Each is the CURRENT body, verbatim, with the guard inserted — not an earlier
-- revision rebuilt from memory. That matters more here than usual: all four
-- have been redefined several times (`create_booking` alone in 0807a, 0808a,
-- 0809c, 0816g and 0817a), and each `drop function` below names the exact
-- argument list that is live today. `create or replace` with a different
-- argument list OVERLOADS rather than supersedes, which is the fault 0816g
-- existed to clean up: two definitions coexisted, PostgREST answered PGRST203
-- to the ambiguous calls and silently routed the rest to the older branch. An
-- unguarded `create_booking` left reachable would be that bug again, with the
-- budget check as its casualty.
-- =====================================================================

-- ---------------------------------------------------------------------
-- assert_event_budget — check, refuse, or record the override.
--
-- The whole policy in one place, so the call sites below carry a single
-- statement each and cannot drift apart in how strictly they read the answer.
--
-- Three things it deliberately does NOT refuse:
--   * an event with no budget           — nothing to be over
--   * an amount in an unconvertible     — a stale FX feed is the platform's
--     currency                            problem, not grounds to block a deal
--   * an over-*allocation* on one line  — the line is the client's own sketch;
--                                         the budget is the commitment
-- The last two still come back on the check row, so the UI warns about both.
-- ---------------------------------------------------------------------
create or replace function public.assert_event_budget(
  p_event_id             uuid,
  p_amount               numeric,
  p_currency             text,
  p_requirement_id       uuid,
  p_acknowledge          boolean,
  p_exclude_quotation_id uuid default null,
  p_exclude_booking_id   uuid default null,
  p_quotation_id         uuid default null,
  p_booking_id           uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if p_event_id is null then return; end if;

  select * into c from public.event_budget_check(
    p_event_id, p_amount, p_currency, p_requirement_id,
    p_exclude_quotation_id, p_exclude_booking_id);

  if not c.would_exceed then return; end if;

  -- The platform-wide off switch (0901a). The override is still recorded when
  -- the client acknowledged, because that is a fact about what they were shown.
  if not c.enforced then return; end if;

  if not coalesce(p_acknowledge, false) then
    -- The message carries the figure because the client portal is not the only
    -- caller — an over-budget refusal reaching a support agent through a raw
    -- PostgREST error should still say how far over.
    raise exception 'budget_exceeded: over by % %', round(c.over_by, 2), c.currency;
  end if;

  insert into public.event_budget_overrides(
      event_id, requirement_id, quotation_id, booking_id, actor_id,
      currency, budget_amount, committed_before, attempted_amount, over_by)
  values (
      p_event_id, p_requirement_id, p_quotation_id, p_booking_id, auth.uid(),
      c.currency, c.budget_amount, c.spoken_for, c.incoming_amount, c.over_by);
end;$$;

comment on function public.assert_event_budget(uuid, numeric, text, uuid, boolean, uuid, uuid, uuid, uuid) is
  'Internal. Refuses an over-budget commitment with `budget_exceeded` unless the client explicitly '
  'acknowledged it, in which case the decision is written to event_budget_overrides.';

revoke execute on function
  public.assert_event_budget(uuid, numeric, text, uuid, boolean, uuid, uuid, uuid, uuid)
from public, anon, authenticated;

-- =====================================================================
-- 1. ACCEPTING A PRICE
--
-- Body is 0816i's verbatim — the typed status arms, the lock, the expiry and
-- zero-total gates, and the price/terms copy onto any linked booking — with the
-- budget check added between the gates and the write. Placed there on purpose:
-- after everything that decides whether the quote is answerable at all, and
-- before anything is mutated, so a refusal leaves no trace.
--
-- `p_exclude_quotation_id` is this quote itself. It is `sent` or `revised` at
-- this point and so is not yet counted — but passing it costs nothing and keeps
-- the call correct if a future state ever is.
-- =====================================================================
create or replace function public.respond_quotation(
  p_quotation_id uuid,
  p_action       text,
  p_reason       text default null,
  p_acknowledge_over_budget boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare
  q        public.quotations;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_action not in ('accept', 'decline', 'revise') then
    raise exception 'invalid_action';
  end if;
  if length(coalesce(v_reason, '')) > 500 then raise exception 'reason_too_long'; end if;

  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  if q.status not in ('sent', 'revised') then
    raise exception 'quotation_not_answerable';
  end if;

  if p_action = 'accept' and q.valid_until is not null and q.valid_until < now() then
    raise exception 'quotation_expired';
  end if;

  if p_action = 'accept' and coalesce(q.total, 0) <= 0 then
    raise exception 'quotation_not_priced';
  end if;

  -- THE GUARD. Only on accept: declining or asking for a revision commits
  -- nothing, and a client who is already over budget must never be prevented
  -- from saying no to another quote.
  if p_action = 'accept' then
    perform public.assert_event_budget(
      q.event_id, q.total, q.currency, q.requirement_id,
      p_acknowledge_over_budget,
      p_exclude_quotation_id => q.id,
      p_quotation_id         => q.id);
  end if;

  perform set_config('sinnapi.status_reason', coalesce(v_reason, ''), true);
  -- The ::quotation_status annotations are load-bearing. See 0816f.
  update public.quotations
     set status = case p_action
                    when 'accept'  then 'accepted'::quotation_status
                    when 'decline' then 'declined'::quotation_status
                    else                'revised' ::quotation_status
                  end,
         responded_at = now()
   where id = p_quotation_id;
  perform set_config('sinnapi.status_reason', '', true);

  if p_action = 'accept' then
    update public.bookings b
       set amount                      = q.total,
           currency                    = coalesce(q.currency, b.currency),
           advance_rate                = q.advance_rate,
           advance_release_days_before = q.advance_release_days_before,
           advance_terms_note          = q.advance_terms_note
     where b.quotation_id = p_quotation_id
       and b.client_id = auth.uid()
       and b.deleted_at is null
       and b.advance_terms_accepted_at is null
       and not exists (select 1 from public.escrow_transactions t
                        where t.booking_id = b.id);
  end if;
end;$$;

drop function if exists public.respond_quotation(uuid, text, text);

-- =====================================================================
-- 2. SCHEDULING AN ACCEPTED PRICE
--
-- Body is the current 7-argument definition (0817a's, which added the rail and
-- the advance consent on top of 0816g's) with the guard added after the last
-- validation and before the insert, plus `requirement_id` carried onto the
-- booking so the line a quote answered is the line its booking answers.
--
-- The exclusion is what makes this correct. By the time a client reaches here
-- the quotation is `accepted`, so `event_money_lines` already counts its total
-- as pending. Checking without excluding it would price the booking as if the
-- client were spending the money twice, and would refuse a booking that changes
-- the event total by exactly nothing. In practice the guard here is a backstop:
-- the same money was checked at acceptance.
-- =====================================================================
create or replace function public.create_booking_from_quotation(
  p_quotation_id uuid,
  p_event_date   date,
  p_start_time   time default null,
  p_end_time     time default null,
  p_location     text default null,
  p_payment_type payment_type default null,
  p_advance_rate numeric default null,
  p_acknowledge_over_budget boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  q            public.quotations;
  v_id         uuid;
  v_existing   uuid;
  v_constraint text;
  v_location   text := nullif(btrim(coalesce(p_location, '')), '');
  v_owner      uuid;
  v_vendor_ok  boolean;
  v_terms      record;
  v_adv_r      numeric;
  v_limit      numeric;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  if q.status <> 'accepted' then raise exception 'quotation_not_accepted'; end if;

  select b.id into v_existing from public.bookings b
   where b.quotation_id = q.id and b.deleted_at is null
   limit 1;
  if v_existing is not null then raise exception 'booking_already_exists'; end if;

  select (v.status <> 'suspended' and v.deleted_at is null), v.owner_id
    into v_vendor_ok, v_owner
    from public.vendors v where v.id = q.vendor_id;
  if not coalesce(v_vendor_ok, false) then raise exception 'vendor_unavailable'; end if;

  if p_event_date < current_date then raise exception 'event_date_in_past'; end if;

  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = q.vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable';
  end if;

  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'invalid_time_window';
  end if;
  if p_end_time is not null and p_start_time is null then
    raise exception 'start_time_required';
  end if;

  if length(coalesce(v_location, '')) > 160 then raise exception 'location_too_long'; end if;

  -- The quotation's own event, not one the caller names: a quote requested
  -- against an event is already bound to it, and letting a second event's terms
  -- reach this booking would be a way around the first one's.
  select * into v_terms from public.resolve_booking_payment_terms(q.event_id, p_payment_type);

  v_limit := public.advance_rate_ceiling(q.advance_rate);
  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_limit) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_limit;
  end if;
  v_adv_r := coalesce(p_advance_rate, q.advance_rate,
                      (public.get_setting('advance_rate_default') #>> '{}')::numeric);

  perform public.assert_event_budget(
    q.event_id, q.total, q.currency, q.requirement_id,
    p_acknowledge_over_budget,
    p_exclude_quotation_id => q.id,
    p_quotation_id         => q.id);

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(
          vendor_id, client_id, vendor_service_id, quotation_id, event_id, requirement_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note,
          advance_terms_accepted_at, advance_terms_accepted_by,
          payment_type, payment_terms_status, payment_terms_from_event, payment_terms_proposed_at)
      values (
          q.vendor_id, q.client_id, null, q.id, q.event_id, q.requirement_id,
          'requested', p_event_date, p_start_time, p_end_time, v_location, q.currency, q.total,
          v_adv_r,
          coalesce(q.advance_release_days_before,
                   (public.get_setting('advance_release_days_default') #>> '{}')::int),
          q.advance_terms_note,
          case when v_terms.o_type = 'escrow' and p_advance_rate is not null then now() end,
          case when v_terms.o_type = 'escrow' and p_advance_rate is not null then auth.uid() end,
          v_terms.o_type, 'proposed', v_terms.o_from_event, now())
      returning id into v_id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'ux_bookings_quotation' then
        raise exception 'booking_already_exists';
      end if;
      if v_constraint is distinct from 'ux_bookings_ref' then raise; end if;
    end;
  end loop;

  if v_id is null then
    raise exception 'reference_generation_failed: bookings' using errcode = '23505';
  end if;

  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select
    v_owner,
    'booking.from_quotation',
    coalesce('Quote ' || q.reference_no || ' has been booked', 'A quote has been booked'),
    case when v_terms.o_type = 'escrow'
      then 'The client accepted this quote, picked a date, and asked to pay through Sinnapi '
           || 'escrow. Confirm the booking and the terms to hold it.'
      else 'The client accepted this quote, picked a date, and asked to pay you directly, '
           || 'outside Sinnapi. Confirm the booking and the terms to hold it.' end,
    jsonb_build_object(
      'booking_id',   v_id,
      'quotation_id', q.id,
      'reference_no', q.reference_no,
      'vendor_id',    q.vendor_id,
      'client_id',    q.client_id,
      'payment_type', v_terms.o_type,
      'event_date',   p_event_date)
  where v_owner is not null;

  return v_id;
end;$$;

drop function if exists
  public.create_booking_from_quotation(uuid, date, time, time, text, payment_type, numeric);

-- =====================================================================
-- 3. BOOKING A VENDOR DIRECTLY
--
-- Body is the current 12-argument definition (0817a's) with the guard and
-- `p_requirement_id` added. The event-ownership check 0817a introduced is
-- already here and is left exactly as it was — it is what makes the budget
-- arithmetic below meaningful, since without it a client could file a booking
-- against a stranger's event and move the number that client plans against.
-- =====================================================================
create or replace function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null,
  p_start_time time default null, p_end_time time default null,
  p_payment_type payment_type default null,
  p_advance_rate numeric default null,
  p_requirement_id uuid default null,
  p_acknowledge_over_budget boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
  q            public.quotations;
  v_terms      record;
  v_adv_r      numeric;
  v_days       integer;
  v_limit      numeric;
  v_owner      uuid;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = p_vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable'; end if;

  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'invalid_time_window';
  end if;

  if p_quotation_id is not null then
    select * into q from public.quotations
     where id = p_quotation_id and client_id = auth.uid() and deleted_at is null;
    if q.id is null then raise exception 'quotation_not_found'; end if;
  end if;

  -- An event may only bind bookings for the client who posted it. Without this
  -- check a caller could point at someone else's event and inherit — or, worse,
  -- fail to inherit and quietly get their own choice on a booking the other
  -- client's event was supposed to govern.
  if p_event_id is not null and not exists (
       select 1 from public.events e
        where e.id = p_event_id and e.posted_by = auth.uid() and e.deleted_at is null) then
    raise exception 'event_not_found';
  end if;

  -- A requirement is only meaningful alongside the event it belongs to. The
  -- trigger from 0901b would refuse a mismatch anyway; this refuses the
  -- likelier caller error by name.
  if p_requirement_id is not null then
    if p_event_id is null then raise exception 'requirement_without_event'; end if;
    if not exists (select 1 from public.event_requirements r
                    where r.id = p_requirement_id and r.event_id = p_event_id
                      and r.deleted_at is null) then
      raise exception 'requirement_not_found';
    end if;
  end if;

  select * into v_terms from public.resolve_booking_payment_terms(p_event_id, p_payment_type);

  v_days  := coalesce(q.advance_release_days_before,
                      (public.get_setting('advance_release_days_default') #>> '{}')::int);
  v_limit := public.advance_rate_ceiling(q.advance_rate);

  -- The client consents to the split here rather than at checkout, so the
  -- vendor is answering terms the client has already agreed to. Bounded by the
  -- same ceiling `accept_advance_terms` applies, because this reaches the same
  -- column by a different door.
  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_limit) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_limit;
  end if;

  v_adv_r := coalesce(p_advance_rate, q.advance_rate,
                      (public.get_setting('advance_rate_default') #>> '{}')::numeric);

  -- THE GUARD. `p_amount` is the client's own estimate on this path — no
  -- quotation has settled a figure — which is exactly why it is worth checking:
  -- a direct booking is the one place a client types a number straight onto a
  -- commitment.
  perform public.assert_event_budget(
    p_event_id, p_amount, p_currency, p_requirement_id,
    p_acknowledge_over_budget,
    p_exclude_quotation_id => q.id);

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          requirement_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note,
          -- Consent is only meaningful on the rail that has a schedule to
          -- consent to. Off-platform money never passes through Sinnapi, so
          -- there is nothing here for the client to agree to hold back.
          advance_terms_accepted_at, advance_terms_accepted_by,
          payment_type, payment_terms_status, payment_terms_from_event, payment_terms_proposed_at)
      values (p_vendor_id, auth.uid(), p_service_id, q.id, p_event_id,
          p_requirement_id,
          'requested', p_event_date, p_start_time, p_end_time, p_location, p_currency, p_amount,
          v_adv_r, v_days, q.advance_terms_note,
          case when v_terms.o_type = 'escrow' and p_advance_rate is not null then now() end,
          case when v_terms.o_type = 'escrow' and p_advance_rate is not null then auth.uid() end,
          v_terms.o_type, 'proposed', v_terms.o_from_event, now())
      returning id into v_id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'ux_bookings_quotation' then
        raise exception 'booking_already_exists';
      end if;
      if v_constraint is distinct from 'ux_bookings_ref' then raise; end if;
    end;
  end loop;

  if v_id is null then
    raise exception 'reference_generation_failed: bookings' using errcode = '23505';
  end if;

  -- The vendor is now being asked two questions rather than one, and the second
  -- of them is about money. Saying so in the notification is the difference
  -- between a vendor who opens it today and one who opens it after the event.
  select v.owner_id into v_owner from public.vendors v where v.id = p_vendor_id;
  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select v_owner, 'booking.terms_proposed',
    'New booking request',
    case when v_terms.o_type = 'escrow'
      then 'The client has asked to pay through Sinnapi escrow. Confirm the date and the terms, '
           || 'or propose paying directly instead.'
      else 'The client has asked to pay you directly, outside Sinnapi. Confirm the date and the '
           || 'terms, or propose escrow instead.' end,
    jsonb_build_object(
      'booking_id',   v_id,
      'vendor_id',    p_vendor_id,
      'client_id',    auth.uid(),
      'payment_type', v_terms.o_type,
      'event_date',   p_event_date)
  where v_owner is not null;

  return v_id;
end;$$;

drop function if exists public.create_booking(
  uuid, date, numeric, text, uuid, uuid, uuid, text, time, time, payment_type, numeric);

-- =====================================================================
-- 4. REQUESTING A QUOTE — an ownership hole, and the line it is for
--
-- Body is 0823b's, plus `p_requirement_id` and the event-ownership check that
-- `create_booking` has had since 0817a and this function never got. Both take a
-- `p_event_id`, both are reachable directly through PostgREST, and only one of
-- them checked that the caller posted the event they named. Until now that only
-- meant a mis-filed quotation; with a budget hanging off `events` it means one
-- client could put quotes onto another client's budget line.
--
-- No budget guard: asking for a price commits nothing, and a client near their
-- ceiling has more reason to shop around, not less.
-- =====================================================================
create or replace function public.request_quotation(
  p_vendor_id        uuid,
  p_details          text,
  p_event_id         uuid default null,
  p_currency         text default 'UGX',
  p_template_id      uuid default null,
  p_template_tier_id uuid default null,
  p_requirement_id   uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  if p_event_id is not null
     and not exists (select 1 from public.events e
                      where e.id = p_event_id
                        and e.posted_by = auth.uid()
                        and e.deleted_at is null) then
    raise exception 'event_not_found';
  end if;

  if p_requirement_id is not null then
    if p_event_id is null then raise exception 'requirement_without_event'; end if;
    if not exists (select 1 from public.event_requirements r
                    where r.id = p_requirement_id and r.event_id = p_event_id
                      and r.deleted_at is null and r.cancelled_at is null) then
      raise exception 'requirement_not_found';
    end if;
  end if;

  if p_template_id is not null then
    if not public.quote_package_is_public(p_template_id)
       or not exists (select 1 from public.quote_templates t
                       where t.id = p_template_id and t.vendor_id = p_vendor_id) then
      raise exception 'package_unavailable';
    end if;
    if p_template_tier_id is not null
       and not exists (select 1 from public.quote_template_tiers ti
                        where ti.id = p_template_tier_id and ti.template_id = p_template_id) then
      raise exception 'tier_not_in_package';
    end if;
  end if;

  for i in 1 .. 8 loop
    begin
      insert into public.quotations(
        vendor_id, client_id, event_id, requirement_id, status, currency, request_details,
        template_id, template_tier_id)
      values (p_vendor_id, auth.uid(), p_event_id, p_requirement_id, 'requested', p_currency,
              p_details, p_template_id, p_template_tier_id)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: quotations' using errcode = '23505';
end;$$;

drop function if exists public.request_quotation(uuid, text, uuid, text, uuid, uuid);

-- ---------------------------------------------------------------------
-- Grants. Every signature changed, so every one needs its own — a grant
-- follows an argument list, not a name.
-- ---------------------------------------------------------------------
grant execute on function
  public.respond_quotation(uuid, text, text, boolean),
  public.create_booking_from_quotation(uuid, date, time, time, text, payment_type, numeric, boolean),
  public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text, time, time,
                        payment_type, numeric, uuid, boolean),
  public.request_quotation(uuid, text, uuid, text, uuid, uuid, uuid)
to authenticated;
