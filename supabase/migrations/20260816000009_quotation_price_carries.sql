-- =====================================================================
-- Sinnapi — 0816i The agreed price follows the acceptance
--
-- WHAT WAS BROKEN
-- A client accepts a quote for UGX 226,600 and the booking behind it is worth
-- nothing. `respond_quotation` has always copied the advance schedule onto the
-- linked booking:
--
--   update public.bookings b
--      set advance_rate                = q.advance_rate,
--          advance_release_days_before = q.advance_release_days_before,
--          advance_terms_note          = q.advance_terms_note
--    where b.quotation_id = p_quotation_id
--
-- — the terms, and only the terms. Not `q.total`, and not `q.currency`. The
-- booking keeps whatever amount it was created with, and the amount it was
-- created with is very often zero: `create_booking` takes `p_amount` from the
-- caller, and the client portal's request form sends 0 when the client leaves
-- the optional budget field blank (`bookingRequest.ts`, `p_amount: … ? 0 : …`).
--
-- So the ordinary sequence — request a date from a vendor's profile, then agree
-- a price by quotation — ends with a priced quote pointing at a booking worth
-- 0. `start_escrow` then refuses with `booking_amount_not_set`, and the client
-- is stuck holding an accepted quote they cannot pay.
--
-- The second half of the same hole is `create_booking` itself: handed a
-- `p_quotation_id`, it reads the quotation only for its advance terms and still
-- takes the *amount* from its caller. A quote for 226,600 booked through that
-- entry point with `p_amount => 0` produces a 0-priced booking against a priced
-- quote, and PostgREST exposes it directly, so "the form sends the right
-- number" is not a control. The price is a fact the two parties settled; it is
-- not an argument.
--
-- WHAT THIS FILE DOES
--   1. respond_quotation — accepting carries the price, not just the terms.
--   2. create_booking    — a quotation, when named, sets the amount and currency.
--   3. create_booking_from_quotation — refuses to write a 0-priced booking
--      against a quote rather than passing the zero downstream to escrow.
--   4. A backfill for the bookings already sitting at 0 behind an accepted quote.
--
-- WHY NOT EDIT 0816f
-- Same reason 0816f gave for not editing 0813b: an applied migration is the
-- record of what the database was told, the CLI will not replay it, and a fix
-- written into it would repair a database built tomorrow while leaving every
-- existing environment exactly as broken. `respond_quotation` is now defined in
-- five files — 0618n, 0809c, 0813b, 0816f and here. The highest timestamp is
-- the one in the database; the rest are how it got there.
--
-- WHAT IS DELIBERATELY NOT GUARDED HERE
-- A booking that already has an escrow row is left alone. Its amount is what
-- escrow snapshotted its gross, commission and advance from, and re-pricing it
-- after the fact would put the row and the money out of step. The same
-- reasoning already protects the advance terms through
-- `advance_terms_accepted_at`, and both conditions are applied together.
-- =====================================================================

-- ---------------------------------------------------------------------
-- respond_quotation — the client answers an offer, and the price follows.
--
-- Body as 0816f (typed status arms, locked row) with the price carried onto the
-- linked booking alongside the terms it already carried.
-- ---------------------------------------------------------------------
create or replace function public.respond_quotation(
  p_quotation_id uuid,
  p_action       text,
  p_reason       text default null)
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

  -- A client answers an offer. `requested` and `draft` are not offers yet —
  -- there is no price to accept — and everything else is already settled.
  if q.status not in ('sent', 'revised') then
    raise exception 'quotation_not_answerable';
  end if;

  -- Only accepting is blocked by the clock. Declining or asking for a revision
  -- on a lapsed quote is how a client tells the vendor where they stand, and
  -- refusing that would strand the thread.
  if p_action = 'accept' and q.valid_until is not null and q.valid_until < now() then
    raise exception 'quotation_expired';
  end if;

  -- Accepting an unpriced quote is accepting nothing. The status gate above
  -- already means a vendor sent it, so a zero total here is a quote sent with
  -- no line items or one whose total was never written — either way there is no
  -- price to bind, and letting it through is what put zeroes on bookings.
  -- Declining or revising is still allowed: a client is entitled to answer a
  -- broken quote, they just cannot agree to it.
  if p_action = 'accept' and coalesce(q.total, 0) <= 0 then
    raise exception 'quotation_not_priced';
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
    -- The price and the terms are one agreement and are copied together. Before
    -- this file only the right-hand three columns moved, which is how a booking
    -- ended up carrying the vendor's advance schedule applied to an amount of
    -- zero — terms for a deal with no price.
    update public.bookings b
       set amount                      = q.total,
           currency                    = coalesce(q.currency, b.currency),
           advance_rate                = q.advance_rate,
           advance_release_days_before = q.advance_release_days_before,
           advance_terms_note          = q.advance_terms_note
     where b.quotation_id = p_quotation_id
       and b.client_id = auth.uid()
       and b.deleted_at is null
       -- Never re-write terms the client has already consented to.
       and b.advance_terms_accepted_at is null
       -- Never re-price a booking escrow has already been opened on. Any row in
       -- `escrow_transactions` — `initiated` included — has snapshotted
       -- `gross_amount`, the commission and the advance off the amount standing
       -- at the time, and the ledger is written from those. Moving the booking
       -- underneath them would put the row and the money out of step, which is
       -- a worse failure than the zero this file exists to prevent.
       -- `ux_escrow_booking` makes that at most one row per booking.
       and not exists (
         select 1 from public.escrow_transactions e where e.booking_id = b.id);
  end if;
end;$$;

comment on function public.respond_quotation(uuid, text, text) is
  'Client-only: accept, decline or ask for a revision of a quotation. Accepting binds the price and '
  'copies the agreed amount, currency and advance terms onto the linked booking, if there is one.';

-- ---------------------------------------------------------------------
-- create_booking — a named quotation settles the price, not the caller.
--
-- Body as 0816g (times, reference retry, advance-terms copy) with the amount
-- and currency taken from the quotation whenever one is named. `p_amount` still
-- applies to a direct request, which is the only case where the client is
-- stating a figure of their own.
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null,
  p_start_time time default null, p_end_time time default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
  v_amount     numeric := p_amount;
  v_currency   text    := p_currency;
  q            public.quotations;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;
  if exists (select 1 from public.vendor_blocked_dates
             where vendor_id = p_vendor_id and blocked_date = p_event_date) then
    raise exception 'date_unavailable'; end if;

  -- Either end may be omitted — "from 14:00, open-ended" is a real request —
  -- but an end before its start is not a window, it is a typo.
  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'invalid_time_window';
  end if;

  -- A quotation may only be inherited from by the client it belongs to. This
  -- entry point makes no other check on it — it does not care about the quote's
  -- status and does not enforce one-booking-per-quote beyond the index — so the
  -- ownership test is the whole of its authority to read the row. Scheduling a
  -- quote you have *accepted* is create_booking_from_quotation below.
  if p_quotation_id is not null then
    select * into q from public.quotations
     where id = p_quotation_id and client_id = auth.uid() and deleted_at is null;
    if q.id is null then raise exception 'quotation_not_found'; end if;

    -- The quoted price wins over anything the caller sent. A booking that names
    -- a quotation is a booking for that quote's work at that quote's price, and
    -- the two rows disagreeing is the bug this file is here for. A quote with
    -- no total yet — still `requested`, never priced — leaves `p_amount` in
    -- place rather than overwriting a stated budget with zero.
    if coalesce(q.total, 0) > 0 then
      v_amount   := q.total;
      v_currency := coalesce(q.currency, p_currency);
    end if;
  end if;

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note)
      values (p_vendor_id, auth.uid(), p_service_id, q.id, p_event_id,
          'requested', p_event_date, p_start_time, p_end_time, p_location, v_currency, v_amount,
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
-- create_booking_from_quotation — refuse the zero rather than pass it on.
--
-- Body as 0816g with one gate added. Everything downstream of this insert
-- treats `bookings.amount` as the agreed price: escrow charges commission on
-- it, the advance is a percentage of it, and the ledger is written from it. A
-- zero reaching that machinery surfaces four screens later as
-- `booking_amount_not_set`, at the payment step, with no way back to the cause.
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

  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;
  if q.client_id <> auth.uid() then perform public._forbidden(); end if;

  -- Only an accepted quote is a deal.
  if q.status <> 'accepted' then raise exception 'quotation_not_accepted'; end if;

  -- An accepted quote with no total is a data fault, not a free booking. With
  -- `respond_quotation` refusing to accept one this should now be unreachable
  -- through the product; it stays because this function is reachable directly
  -- and because rows accepted before that gate existed are still out there.
  if coalesce(q.total, 0) <= 0 then raise exception 'quotation_not_priced'; end if;

  -- Once per quotation. Checked here so the ordinary case gets a named refusal
  -- rather than a raw constraint violation; the index is what holds when two
  -- taps race.
  select b.id into v_existing from public.bookings b
   where b.quotation_id = q.id and b.deleted_at is null
   limit 1;
  if v_existing is not null then raise exception 'booking_already_exists'; end if;

  -- Deliberately not `vendor_is_public`. A vendor whose listing has gone hidden
  -- has still agreed this price. Suspended or deleted is different: that is the
  -- platform withdrawing them.
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
    coalesce('Quote ' || q.reference_no || ' has been booked', 'A quote has been booked'),
    'The client has accepted this quote and picked a date. Confirm the booking to hold it.',
    jsonb_build_object(
      'booking_id',   v_id,
      'quotation_id', q.id,
      'reference_no', q.reference_no,
      'vendor_id',    q.vendor_id,
      'client_id',    q.client_id,
      'event_date',   p_event_date)
  where v_owner is not null;

  return v_id;
end;$$;

-- ---------------------------------------------------------------------
-- BACKFILL — the bookings already standing at zero behind a priced quote.
--
-- One statement, not a loop: this is a set of rows in a known wrong state, and
-- the correct value for each is on the row it already points at.
--
-- Scoped as tightly as the live copy above. Only bookings whose quotation is
-- accepted and priced, only where the booking's own amount is missing or zero
-- (a booking with a real figure is not this bug and is not touched), only where
-- the client has not already consented to terms, and only where no live escrow
-- exists — money that has moved fixes the amount it moved against.
-- ---------------------------------------------------------------------
update public.bookings b
   set amount     = q.total,
       currency   = coalesce(q.currency, b.currency),
       updated_at = now()
  from public.quotations q
 where q.id = b.quotation_id
   and q.status = 'accepted'
   and coalesce(q.total, 0) > 0
   and coalesce(b.amount, 0) <= 0
   and b.deleted_at is null
   and b.advance_terms_accepted_at is null
   and not exists (
     select 1 from public.escrow_transactions e where e.booking_id = b.id);

-- ---------------------------------------------------------------------
-- Grants. Unchanged in audience — both functions check the caller themselves —
-- but `create or replace` on a dropped-and-recreated signature would lose them,
-- so they are restated rather than assumed.
-- ---------------------------------------------------------------------
grant execute on function public.respond_quotation(uuid, text, text) to authenticated;
grant execute on function
  public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text, time, time)
to authenticated;
grant execute on function
  public.create_booking_from_quotation(uuid, date, time, time, text)
to authenticated;
