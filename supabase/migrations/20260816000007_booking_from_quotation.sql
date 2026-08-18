-- =====================================================================
-- Sinnapi — 0816g Turning an accepted quotation into a booking
--
-- WHAT WAS MISSING
-- Accepting a quote was a dead end. `respond_quotation` moves the quotation to
-- `accepted` and then does this:
--
--   update public.bookings b
--      set advance_rate = q.advance_rate, ...
--    where b.quotation_id = p_quotation_id
--
-- — which in the ordinary flow matches zero rows, because nothing in the
-- product ever wrote `bookings.quotation_id`. The client portal's only booking
-- path is the direct request on a vendor's profile, which passes no quotation
-- at all. So the accept dialog's promise ("the advance terms are copied onto
-- your booking, which is what the payment step then asks you to fund") named a
-- booking that did not exist and was never going to.
--
-- The gap is real for both sides. A client who accepted a price had nowhere to
-- go: no booking, no escrow, no date on the vendor's calendar. A vendor saw a
-- quote turn `accepted` and then heard nothing.
--
-- WHY A DEDICATED RPC RATHER THAN A `p_quotation_id` ON `create_booking`
-- `create_booking` already takes `p_quotation_id`, and passing it would have
-- been the small change. It is the wrong one: that function's authorisation is
-- "any signed-in client may ask any public vendor for a date", and it never
-- looks at the quotation it is handed beyond copying terms off it. Nothing
-- stops a caller pointing it at someone else's quote, at a `draft` one, or at a
-- quote that already has a booking — and PostgREST exposes it directly, so
-- "the form only ever sends good arguments" is not a control.
--
-- Creating a booking from a quote is a different act with different rules: the
-- price is settled and not the client's to state, the vendor is fixed, the
-- quotation must be one the caller accepted, and it may happen once. Those
-- belong in a function whose whole body is about them.
--
-- WHY THE BOOKING IS STILL `requested`
-- The vendor has agreed a price, not a date. The quotation carries no date at
-- all — the client picks one here — so the vendor still has to confirm they are
-- free. `requested` is the honest state, and the existing respond/confirm path
-- takes it from there.
--
-- ALSO IN HERE: `create_booking` had quietly forked into two functions.
--   0807a  created the 8-argument version, with a reference-retry loop.
--   0808a  DROPPED the 8-arg one and created a 10-arg version that adds
--          start/end times — but was written against 0807a's body and so has
--          no advance-terms copy.
--   0809c  (later timestamp, escrow) `create or replace`d the *8-argument*
--          signature to add the advance-terms copy. `create or replace` with a
--          different argument list does not supersede — it overloads.
--
-- Both therefore exist in the database right now, which has two consequences.
-- A call naming only the arguments they share is ambiguous and fails with
-- PGRST203; and the one the client portal actually reaches — the 10-arg, since
-- it sends times — is the branch with no advance-terms copy, so every booking
-- made from the vendor profile has null advance terms. This file drops both and
-- leaves one definition with both behaviours.
-- =====================================================================

-- ---------------------------------------------------------------------
-- One booking per quotation, as a database fact.
--
-- The RPC checks this before inserting and returns a sentence about it, which
-- is the version a person sees. This index is for the case the check cannot
-- cover: two taps landing together, each reading "no booking yet" before the
-- other writes one. The second insert then fails on the constraint rather than
-- producing a quote with two bookings hanging off it and an escrow flow that
-- cannot say which one it is funding.
--
-- Partial on both counts: `quotation_id` is null for every direct booking, and
-- a soft-deleted booking should not block a fresh one.
-- ---------------------------------------------------------------------
create unique index if not exists ux_bookings_quotation
  on public.bookings(quotation_id)
  where quotation_id is not null and deleted_at is null;

-- ---------------------------------------------------------------------
-- create_booking — one definition, both behaviours.
--
-- Body is 0808a's (times, reference retry) with 0809c's advance-terms copy
-- folded back in. Behaviour is otherwise unchanged for every existing caller.
-- ---------------------------------------------------------------------
drop function if exists public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text);
drop function if exists
  public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text, time, time);

create function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null,
  p_start_time time default null, p_end_time time default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
  q            public.quotations;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = p_vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable'; end if;

  -- Either end may be omitted — "from 14:00, open-ended" is a real request —
  -- but an end before its start is not a window, it is a typo. The client-side
  -- picker already prevents it; this is the backstop for any other caller.
  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'invalid_time_window';
  end if;

  -- A quotation may only be inherited from by the client it belongs to. This
  -- entry point makes no other check on it — it does not care about the quote's
  -- status and does not enforce one-booking-per-quote beyond the index — so the
  -- ownership test is the whole of its authority to read the row. Scheduling a
  -- quote you have *accepted* is create_booking_from_quotation below, which
  -- checks all of it.
  --
  -- Raised rather than silently dropped: a caller who names a quotation and
  -- gets a booking with no quotation attached, no advance terms and no error is
  -- the version of this that gets debugged twice.
  if p_quotation_id is not null then
    select * into q from public.quotations
     where id = p_quotation_id and client_id = auth.uid() and deleted_at is null;
    if q.id is null then raise exception 'quotation_not_found'; end if;
  end if;

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note)
      values (p_vendor_id, auth.uid(), p_service_id, q.id, p_event_id,
          'requested', p_event_date, p_start_time, p_end_time, p_location, p_currency, p_amount,
          coalesce(q.advance_rate, (public.get_setting('advance_rate_default') #>> '{}')::numeric),
          coalesce(q.advance_release_days_before,
                   (public.get_setting('advance_release_days_default') #>> '{}')::int),
          q.advance_terms_note)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      -- ux_bookings_quotation is not a collision to retry through: the same
      -- reference twice is bad luck, a second booking on one quote is a rule.
      if v_constraint = 'ux_bookings_quotation' then
        raise exception 'booking_already_exists';
      end if;
      if v_constraint is distinct from 'ux_bookings_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: bookings' using errcode = '23505';
end;$$;

-- ---------------------------------------------------------------------
-- create_booking_from_quotation — the client schedules a price they accepted.
--
-- Everything commercial comes off the quotation and nothing about it is a
-- parameter: the vendor, the amount, the currency, the event and the advance
-- schedule are all facts the two parties already agreed, and a client-supplied
-- amount on a booking made from a quote would be a way to rewrite the price
-- after the fact. What the client supplies is exactly what the quotation never
-- had — when, and where.
-- ---------------------------------------------------------------------
create or replace function public.create_booking_from_quotation(
  p_quotation_id uuid,
  p_event_date   date,
  p_start_time   time default null,
  p_end_time     time default null,
  p_location     text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  q            public.quotations;
  v_id         uuid;
  v_existing   uuid;
  v_constraint text;
  v_location   text := nullif(btrim(coalesce(p_location, '')), '');
  v_owner      uuid;
  v_vendor_ok  boolean;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  -- Locked for the same reason respond_quotation locks: this reads a status,
  -- decides from it, and then writes a row that escrow will later price. Two
  -- accepted-quote taps arriving together must not both pass the gate.
  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  -- Only an accepted quote is a deal. `sent` is an offer the client has not
  -- answered — booking against it would skip the acceptance that binds the
  -- price and copies the terms.
  if q.status <> 'accepted' then raise exception 'quotation_not_accepted'; end if;

  -- Once per quotation. Checked here so the ordinary case gets a named refusal
  -- rather than a raw constraint violation; the index below the two of them is
  -- what actually holds when two taps race. The id is not returned with the
  -- error — the caller reads the existing booking off `bookings.quotation_id`,
  -- which is the same read that decided whether to offer the button at all.
  select b.id into v_existing from public.bookings b
   where b.quotation_id = q.id and b.deleted_at is null
   limit 1;
  if v_existing is not null then raise exception 'booking_already_exists'; end if;

  -- Deliberately not `vendor_is_public`. A vendor whose listing has gone hidden
  -- — a lapsed subscription is the common way — has still agreed this price,
  -- and stranding a deal both parties settled is not what hiding a listing is
  -- for. Suspended or deleted is different: that is the platform withdrawing
  -- them, and no new commitment should be made against it.
  select (v.status <> 'suspended' and v.deleted_at is null), v.owner_id
    into v_vendor_ok, v_owner
    from public.vendors v where v.id = q.vendor_id;
  if not coalesce(v_vendor_ok, false) then raise exception 'vendor_unavailable'; end if;

  -- A booking is a commitment to a future date. The picker disables the past;
  -- this is what holds for anything reaching the RPC another way.
  if p_event_date < current_date then raise exception 'event_date_in_past'; end if;

  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = q.vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable';
  end if;

  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'invalid_time_window';
  end if;
  -- An end with no start is not a window: there is nothing to measure it from.
  if p_end_time is not null and p_start_time is null then
    raise exception 'start_time_required';
  end if;

  if length(coalesce(v_location, '')) > 160 then raise exception 'location_too_long'; end if;

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(
          vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note)
      values (
          q.vendor_id, q.client_id, null, q.id, q.event_id,
          -- The price is agreed; the date is not. The vendor confirms.
          'requested', p_event_date, p_start_time, p_end_time, v_location, q.currency, q.total,
          coalesce(q.advance_rate, (public.get_setting('advance_rate_default') #>> '{}')::numeric),
          coalesce(q.advance_release_days_before,
                   (public.get_setting('advance_release_days_default') #>> '{}')::int),
          q.advance_terms_note)
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

  -- The vendor is the one who has to act on this — they confirm the date — and
  -- they have no other signal that an accepted quote became a real request.
  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select
    v_owner,
    'booking.from_quotation',
    -- `notifications.title` is NOT NULL, and `'Quote ' || null` is null — the
    -- reference is trigger-assigned and never absent in practice, but a null
    -- here would fail the insert and take the booking down with it.
    coalesce('Quote ' || q.reference_no || ' has been booked', 'A quote has been booked'),
    'The client has accepted this quote and picked a date. Confirm the booking to hold it.',
    jsonb_build_object(
      'booking_id',   v_id,
      'quotation_id', q.id,
      'reference_no', q.reference_no,
      'vendor_id',    q.vendor_id,
      'client_id',    q.client_id,
      'event_date',   p_event_date)
  -- A vendor row with no owner cannot be notified; the booking still stands.
  where v_owner is not null;

  return v_id;
end;$$;

comment on function public.create_booking_from_quotation(uuid, date, time, time, text) is
  'Client-only: turns a quotation they have accepted into a `requested` booking, carrying the '
  'agreed vendor, amount, currency, event and advance terms. One booking per quotation.';

-- ---------------------------------------------------------------------
-- Grants. Both functions check the caller themselves, which is what makes
-- `authenticated` the right audience rather than a narrower role.
-- ---------------------------------------------------------------------
grant execute on function
  public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text, time, time)
to authenticated;

grant execute on function
  public.create_booking_from_quotation(uuid, date, time, time, text)
to authenticated;
