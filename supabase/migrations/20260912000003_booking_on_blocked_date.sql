-- =====================================================================
-- 0912c — A BLOCKED DAY IS A WARNING, NOT A REFUSAL
--
-- `create_booking` and `create_booking_from_quotation` both refused any date
-- in `vendor_blocked_dates` with `date_unavailable`. The client portal has
-- never agreed: `EventDateField` marks closed days, keeps them selectable, and
-- tells the client "You can still send the request". So the one screen that
-- explains the rule promised a request the database then threw away.
--
-- The client's side is the right one. A booking starts `requested`; it holds
-- nothing until the vendor confirms it, and the vendor is exactly the person
-- who knows whether a closed day can move. Refusing the request only loses it.
--
-- Both kinds of block are let through — `manual` (the vendor's own time off)
-- and `booking` (a confirmed job on that day) — because the client cannot tell
-- them apart and should not be able to. Confirming afterwards is already safe:
-- `tg_auto_block_date` inserts with `on conflict do nothing`.
--
-- What replaces the refusal is the vendor being told. Each function works out
-- `v_date_blocked` once, says so in the new-booking notification body, and puts
-- `date_was_blocked` in its data payload so a screen can flag it later.
--
-- Bodies are 0901e's otherwise unchanged. Signatures are identical, so the
-- existing grants carry over and no `drop function` is needed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BOOKING FROM AN ACCEPTED QUOTATION
-- ---------------------------------------------------------------------
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
  q              public.quotations;
  v_id           uuid;
  v_existing     uuid;
  v_constraint   text;
  v_location     text := nullif(btrim(coalesce(p_location, '')), '');
  v_owner        uuid;
  v_vendor_ok    boolean;
  v_terms        record;
  v_adv_r        numeric;
  v_limit        numeric;
  v_date_blocked boolean;
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

  -- Recorded, not refused: the vendor answers the request, so the vendor is
  -- the one who needs to know.
  v_date_blocked := exists (select 1 from public.vendor_blocked_dates
                             where vendor_id = q.vendor_id and blocked_date = p_event_date);

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
           || 'outside Sinnapi. Confirm the booking and the terms to hold it.' end
    || case when v_date_blocked
      then ' Note: this date is marked unavailable on your calendar.' else '' end,
    jsonb_build_object(
      'booking_id',       v_id,
      'quotation_id',     q.id,
      'reference_no',     q.reference_no,
      'vendor_id',        q.vendor_id,
      'client_id',        q.client_id,
      'payment_type',     v_terms.o_type,
      'event_date',       p_event_date,
      'date_was_blocked', v_date_blocked)
  where v_owner is not null;

  return v_id;
end;$$;

-- ---------------------------------------------------------------------
-- 2. BOOKING A VENDOR DIRECTLY
-- ---------------------------------------------------------------------
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
  v_id           uuid;
  v_constraint   text;
  q              public.quotations;
  v_terms        record;
  v_adv_r        numeric;
  v_days         integer;
  v_limit        numeric;
  v_owner        uuid;
  v_date_blocked boolean;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  -- Recorded, not refused — see the header.
  v_date_blocked := exists (select 1 from public.vendor_blocked_dates
                             where vendor_id = p_vendor_id and blocked_date = p_event_date);

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
           || 'terms, or propose escrow instead.' end
    || case when v_date_blocked
      then ' Note: this date is marked unavailable on your calendar.' else '' end,
    jsonb_build_object(
      'booking_id',       v_id,
      'vendor_id',        p_vendor_id,
      'client_id',        auth.uid(),
      'payment_type',     v_terms.o_type,
      'event_date',       p_event_date,
      'date_was_blocked', v_date_blocked)
  where v_owner is not null;

  return v_id;
end;$$;
