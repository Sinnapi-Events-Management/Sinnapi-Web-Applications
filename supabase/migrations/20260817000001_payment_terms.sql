-- =====================================================================
-- Sinnapi — 0817a PAYMENT TERMS: the client chooses, the vendor answers
--
-- WHAT WAS MISSING
-- `bookings.payment_type` has existed since 0006 with exactly two values,
-- `direct` and `escrow`, and nothing has ever *asked* anyone which one applies.
-- It is written in one place — `activate_escrow`, which sets it to `escrow` as
-- a side effect of a successful charge — so every booking on the platform sits
-- at null until money moves, and a booking settled off-platform is
-- indistinguishable from one nobody has paid yet.
--
-- The consequence is not a missing column, it is a missing conversation. The
-- order of events today is: client requests a date, vendor accepts *without
-- being told how they will be paid*, and only then does the client discover, at
-- checkout, that escrow costs commission plus a processing fee on top of the
-- price they negotiated. Both parties commit before either knows the terms.
--
-- WHAT THIS CHANGES
-- The rail becomes a term of the deal, stated by the client when the booking is
-- created and answered by the vendor along with the date:
--
--   client proposes (escrow | off-platform)  →  vendor accepts
--                                            →  vendor declines
--                                            →  vendor counters with the other
--                                               rail  →  client accepts/declines
--
-- `payment_type` keeps its name and its values. `direct` is what the product
-- calls off-platform: the client pays the vendor directly, Sinnapi charges
-- nothing and holds nothing, and neither party has any protection. `escrow` is
-- the on-platform rail with commission and the processing fee shown on top.
--
-- EVENT-WIDE TERMS
-- A client who sets terms on an event binds every booking made under it —
-- that is the point of setting them there, and it is why a booking that
-- inherited them cannot be countered by the vendor. The vendor's move on such
-- a booking is accept or decline; changing the terms is the client's, on the
-- event, and doing so re-opens every booking still waiting on an answer.
--
-- WHAT IS DELIBERATELY NOT HERE
-- No vendor-level "I only take escrow" preference. Both rails are always
-- offered and the vendor's response is the only filter — one mechanism to
-- reason about rather than a preference that silently pre-filters a picker and
-- a response that can still contradict it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Where the terms have got to.
--
-- Separate from `booking_status` rather than folded into it, because the two
-- answer different questions and can disagree: a booking can be `requested`
-- with terms `countered` (the vendor answered the money and not the date), and
-- `confirmed` implies `accepted` but is reached by three different routes.
--
-- A brand-new type, so it is usable in the same transaction that declares it —
-- unlike a value added to an existing enum. See 0809a for why that matters.
-- ---------------------------------------------------------------------
do $$ begin
  create type payment_terms_status as enum ('proposed', 'accepted', 'declined', 'countered');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- BOOKINGS — the proposal, the answer, and where the proposal came from
-- ---------------------------------------------------------------------
alter table public.bookings
  add column if not exists payment_terms_status      payment_terms_status not null default 'proposed',
  -- The rail the vendor is offering instead. Null unless status = 'countered';
  -- accepting the counter is what moves it onto `payment_type`.
  add column if not exists payment_terms_counter     payment_type,
  -- The vendor's sentence about why. Carried on both a counter and a decline,
  -- because "no" without a reason is the thing clients write to support about.
  add column if not exists payment_terms_note        text,
  add column if not exists payment_terms_proposed_at timestamptz,
  add column if not exists payment_terms_responded_at timestamptz,
  -- Inherited from the event rather than chosen on this booking. Drives one
  -- rule only — the vendor may not counter — but it has to be a stored fact:
  -- the event's terms can change after the booking is made, and "did this
  -- booking inherit" must not be re-derived from a column that has moved.
  add column if not exists payment_terms_from_event  boolean not null default false;

-- A counter is only meaningful while one is outstanding, and it is never the
-- rail already proposed — "I counter with the thing you asked for" is an accept
-- written confusingly, and the RPC below refuses it. Enforced here too because
-- `bookings` is writable through RLS by both parties.
alter table public.bookings
  drop constraint if exists ck_bookings_terms_counter;
alter table public.bookings
  add constraint ck_bookings_terms_counter
  check (
    (payment_terms_status = 'countered' and payment_terms_counter is not null
       and payment_terms_counter is distinct from payment_type)
    or (payment_terms_status <> 'countered' and payment_terms_counter is null));

-- Vendors' work queues filter on "what am I being asked to answer".
create index if not exists ix_bookings_terms_status
  on public.bookings(vendor_id, payment_terms_status)
  where deleted_at is null;

-- ---------------------------------------------------------------------
-- Backfill.
--
-- Every booking that predates this file was made with no terms conversation at
-- all, and re-opening one would put a decision in front of two people about a
-- deal that is already running.
--
-- THE RAIL: escrow, for everything.
-- It is tempting to read "confirmed but never funded" as "they settled it
-- between themselves" and write `direct`. That guess is both unfounded and
-- actively harmful. Unfounded, because off-platform settlement was never a
-- state this product recorded — it happened, but nothing distinguishes a
-- booking paid in cash from one the client is about to pay for this afternoon.
-- Harmful, because `direct` is now a hard gate: `activate_escrow` and
-- `accept_advance_terms` both refuse on it, so guessing wrong would strand
-- every confirmed, unfunded booking on the platform with no way to pay for it
-- and no way to change the answer.
--
-- `escrow` is the safe direction. It is what every one of these bookings was
-- already eligible for, so it preserves exactly the capability they have today
-- and takes nothing away.
--
-- THE STATUS: whatever actually happened to the booking.
--   confirmed / in progress / completed → accepted. The vendor said yes; under
--     the old model that yes did not cover the rail, but there was only one.
--   declined / cancelled → declined. Nobody is going to answer these.
--   still requested → left as `proposed`. A vendor genuinely has not answered
--     yet, and now their accept covers the terms too. Nothing is lost.
--
-- `payment_terms_responded_at` is deliberately left null on all of them: no
-- vendor ever answered a question about payment terms, and stamping a time
-- would put a fact in the audit trail that never happened.
-- ---------------------------------------------------------------------
update public.bookings
   set payment_type = coalesce(payment_type, 'escrow')
 where payment_type is null;

update public.bookings
   set payment_terms_status = 'accepted'
 where payment_terms_status = 'proposed'
   and status in ('confirmed', 'in_progress', 'completed');

update public.bookings
   set payment_terms_status = 'declined'
 where payment_terms_status = 'proposed'
   and status in ('declined', 'cancelled');

-- ---------------------------------------------------------------------
-- EVENTS — terms set once, binding every booking made under the event
-- ---------------------------------------------------------------------
alter table public.events
  add column if not exists payment_type       payment_type,
  add column if not exists payment_terms_note text;

comment on column public.events.payment_type is
  'Terms binding every booking made under this event. Null means each booking chooses its own.';

-- =====================================================================
-- PREVIEW — what each rail costs, before anything exists to price
--
-- `escrow_price_booking` needs a booking row, which is exactly what the client
-- does not have while they are deciding whether to make one. This prices an
-- arbitrary amount instead, so the picker can put commission and the processing
-- fee in front of the client at the moment they choose rather than at checkout.
--
-- The processing fee is returned as a *range*. It varies by rail (MTN, Airtel,
-- card, PayPal) and the rail is not chosen until checkout, so a single figure
-- here would be a number the client is later charged something else for. A
-- range is the true answer to the question being asked.
--
-- Reads platform settings and does arithmetic on an amount the caller supplied.
-- It touches no row belonging to anyone, so `authenticated` is the right
-- audience — there is nothing here to leak.
-- =====================================================================
create or replace function public.payment_terms_preview(
  p_amount        numeric,
  p_currency      text    default 'UGX',
  -- What the client has chosen, if they have moved the slider.
  p_advance_rate  numeric default null,
  -- What the vendor proposed on the quotation. The ceiling for the above, and
  -- the fallback when the client has not chosen — passed in rather than looked
  -- up because the quote this is previewing may not be a booking yet.
  p_proposed_rate numeric default null)
returns table (
  agreed_amount     numeric,
  currency          text,
  commission_rate   numeric,
  commission_amount numeric,
  -- Bounds across every configured provider/method pair.
  psp_fee_rate_min  numeric,
  psp_fee_rate_max  numeric,
  psp_fee_min       numeric,
  psp_fee_max       numeric,
  -- What the client pays on the escrow rail, at each end of the fee range.
  escrow_total_min  numeric,
  escrow_total_max  numeric,
  -- What the client pays off-platform. Always the agreed amount: Sinnapi
  -- charges nothing on this rail. Returned rather than assumed so the UI never
  -- has to encode "and this one is free" as a literal.
  direct_total      numeric,
  advance_rate      numeric,
  advance_amount    numeric,
  balance_amount    numeric,
  -- The most the client may choose. Returned with the price so the browser
  -- never has to read platform_settings to know its own bounds — same contract
  -- as `escrow_price_booking`.
  advance_rate_limit numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  v_amount   numeric := greatest(coalesce(p_amount, 0), 0);
  v_comm_r   numeric;
  v_comm     numeric;
  v_fee_r_lo numeric;
  v_fee_r_hi numeric;
  v_adv_r    numeric;
  v_adv      numeric;
  v_limit    numeric;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  v_comm_r := public.get_commission_rate();
  v_comm   := round(v_amount * v_comm_r / 100, 2);

  select min((m.value)::numeric), max((m.value)::numeric)
    into v_fee_r_lo, v_fee_r_hi
    from jsonb_each(public.get_setting('psp_fee_rates')) p,
         jsonb_each_text(p.value) m;

  v_fee_r_lo := coalesce(v_fee_r_lo, 0);
  v_fee_r_hi := coalesce(v_fee_r_hi, 0);

  -- The advance is a share of the agreed amount, never of the total: fees are
  -- not the vendor's money and are not part of what is split in time. Same rule
  -- as `escrow_price_booking`, and it has to stay the same rule — a preview
  -- that splits differently from the charge is worse than no preview.
  --
  -- Clamped rather than rejected: this function prices, it does not authorise.
  -- The RPC that actually writes the rate raises on an out-of-range value, and
  -- a preview that errored instead of showing the ceiling would leave the
  -- picker with nothing on screen at the moment the client most needs a number.
  v_limit := public.advance_rate_ceiling(p_proposed_rate);
  v_adv_r := least(
    greatest(coalesce(p_advance_rate, p_proposed_rate,
                      (public.get_setting('advance_rate_default') #>> '{}')::numeric, 0), 0),
    v_limit);
  v_adv := round(v_amount * v_adv_r / 100, 2);

  return query select
    v_amount,
    coalesce(p_currency, 'UGX'),
    v_comm_r,
    v_comm,
    v_fee_r_lo,
    v_fee_r_hi,
    round((v_amount + v_comm) * v_fee_r_lo / 100, 2),
    round((v_amount + v_comm) * v_fee_r_hi / 100, 2),
    -- Sums of already-rounded parts. Never re-round a total, or the lines stop
    -- adding up to it on screen.
    v_amount + v_comm + round((v_amount + v_comm) * v_fee_r_lo / 100, 2),
    v_amount + v_comm + round((v_amount + v_comm) * v_fee_r_hi / 100, 2),
    v_amount,
    v_adv_r,
    v_adv,
    v_amount - v_adv,
    v_limit;
end;$$;

comment on function public.payment_terms_preview(numeric, text, numeric, numeric) is
  'Prices both payment rails for an arbitrary amount, so a client can compare them before a '
  'booking exists. The processing fee is a range because the rail is not chosen until checkout.';

grant execute on function public.payment_terms_preview(numeric, text, numeric, numeric)
to authenticated;

-- =====================================================================
-- HELPER — the terms a new booking must carry
--
-- One function, called by both creation paths, so "the event wins" is written
-- once. Returns the resolved rail and whether it was inherited.
-- =====================================================================
create or replace function public.resolve_booking_payment_terms(
  p_event_id     uuid,
  p_requested    payment_type,
  out o_type     payment_type,
  out o_from_event boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_event_type payment_type;
begin
  select e.payment_type into v_event_type
    from public.events e where e.id = p_event_id and e.deleted_at is null;

  if v_event_type is not null then
    -- The event's terms are not a default the booking may override. A client
    -- who wants different terms for one vendor changes them on the event, or
    -- books that vendor outside it.
    o_type := v_event_type;
    o_from_event := true;
  else
    -- No event terms: the client's choice stands. Falling back to `escrow`
    -- rather than `direct` when nothing was sent is deliberate — an omitted
    -- parameter should land on the protected rail, not the unprotected one.
    o_type := coalesce(p_requested, 'escrow');
    o_from_event := false;
  end if;
end;$$;

-- =====================================================================
-- CREATION — both paths now carry terms
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_booking — direct request against a vendor's profile.
--
-- Body is 0816g's, plus the terms and the client's advance consent. Every
-- pre-existing guard is unchanged.
-- ---------------------------------------------------------------------
drop function if exists
  public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text, time, time);

create function public.create_booking(
  p_vendor_id uuid, p_event_date date, p_amount numeric, p_currency text default 'UGX',
  p_service_id uuid default null, p_quotation_id uuid default null,
  p_event_id uuid default null, p_location text default null,
  p_start_time time default null, p_end_time time default null,
  p_payment_type payment_type default null,
  p_advance_rate numeric default null)
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

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note,
          -- Consent is only meaningful on the rail that has a schedule to
          -- consent to. Off-platform money never passes through Sinnapi, so
          -- there is nothing here for the client to agree to hold back.
          advance_terms_accepted_at, advance_terms_accepted_by,
          payment_type, payment_terms_status, payment_terms_from_event, payment_terms_proposed_at)
      values (p_vendor_id, auth.uid(), p_service_id, q.id, p_event_id,
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

-- ---------------------------------------------------------------------
-- create_booking_from_quotation — scheduling an accepted price.
--
-- Body is 0816g's with the same two additions. The commercial terms still come
-- off the quotation and are still not parameters; the rail is the one thing on
-- this screen the quotation never settled, which is why it is a parameter and
-- the amount is not.
--
-- DROPPED, not replaced. `create or replace` with a longer argument list does
-- not supersede a function — it overloads it, which is precisely the fault
-- 0816g was written to clean up after (see its header on the two `create_booking`
-- definitions that coexisted for a month). Leaving 0816g's 5-argument version in
-- place would mean a 5-argument call is ambiguous and fails with PGRST203, and —
-- worse — that there is still a reachable entry point which creates bookings with
-- no payment terms on them at all.
-- ---------------------------------------------------------------------
drop function if exists public.create_booking_from_quotation(uuid, date, time, time, text);

create or replace function public.create_booking_from_quotation(
  p_quotation_id uuid,
  p_event_date   date,
  p_start_time   time default null,
  p_end_time     time default null,
  p_location     text default null,
  p_payment_type payment_type default null,
  p_advance_rate numeric default null)
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

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(
          vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, start_time, end_time, location, currency, amount,
          advance_rate, advance_release_days_before, advance_terms_note,
          advance_terms_accepted_at, advance_terms_accepted_by,
          payment_type, payment_terms_status, payment_terms_from_event, payment_terms_proposed_at)
      values (
          q.vendor_id, q.client_id, null, q.id, q.event_id,
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

comment on function public.create_booking_from_quotation(uuid, date, time, time, text, payment_type, numeric) is
  'Client-only: turns a quotation they have accepted into a `requested` booking, carrying the '
  'agreed vendor, amount, currency, event and advance terms, plus the payment rail the client '
  'proposes. One booking per quotation.';

-- =====================================================================
-- THE VENDOR'S ANSWER
--
-- `respond_booking` has been the vendor's accept/decline since 0014, and it has
-- never checked anything: no status guard, no reason on a decline, no history
-- reason, and an unrecognised `p_action` silently updates nothing and reports
-- success. It is replaced here rather than added to, because the terms make it
-- a three-way answer and a function about money should not also be the one with
-- the missing guards.
--
-- Dropped first, for the reason given above `create_booking_from_quotation`: the
-- new signature takes a fourth argument, so `create or replace` alone would
-- overload rather than supersede — and the definition left behind would be the
-- unguarded one, still granted to `authenticated` and still able to confirm a
-- booking without touching its payment terms.
-- =====================================================================
drop function if exists public.respond_booking(uuid, text, text);

create or replace function public.respond_booking(
  p_booking_id uuid,
  p_action     text,
  p_reason     text default null,
  -- The rail offered instead, on `p_action = 'counter'`.
  p_counter    payment_type default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into b from public.bookings where id = p_booking_id and deleted_at is null for update;
  if b.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(b.vendor_id) then perform public._forbidden(); end if;

  if p_action not in ('accept', 'decline', 'counter') then
    raise exception 'unsupported_action: %', p_action;
  end if;

  -- Answering twice is the tab someone left open yesterday. The first answer
  -- stands; the second is told what happened rather than silently applied.
  if b.status <> 'requested' then raise exception 'booking_not_pending'; end if;

  if v_reason is not null and length(v_reason) > 500 then raise exception 'reason_too_long'; end if;

  if p_action = 'accept' then
    -- Accepting is also how a vendor withdraws a counter they have thought
    -- better of: the counter and the reason they gave for it both go, because
    -- what stands afterwards is the client's original proposal and a note
    -- explaining why the vendor wanted something else would be attributed, on
    -- the client's screen, to an arrangement nobody ended up in.
    update public.bookings
       set status                     = 'confirmed',
           payment_terms_status       = 'accepted',
           payment_terms_counter      = null,
           payment_terms_note         = v_reason,
           payment_terms_responded_at = now()
     where id = p_booking_id;

    insert into public.notifications(recipient_id, trigger_key, title, body, data)
    values (b.client_id, 'booking.terms_accepted',
      'Your booking is confirmed',
      case when b.payment_type = 'escrow'
        then 'The vendor has confirmed the date and agreed to payment through Sinnapi escrow. '
             || 'You can fund it now.'
        else 'The vendor has confirmed the date and agreed to be paid directly, outside Sinnapi. '
             || 'Sinnapi is not holding this money and cannot mediate it.' end,
      jsonb_build_object('booking_id', p_booking_id, 'payment_type', b.payment_type));

  elsif p_action = 'decline' then
    -- A decline ends the booking, so it has to say why. The old function let a
    -- vendor kill a client's request with no explanation at all.
    if v_reason is null then raise exception 'reason_required'; end if;

    update public.bookings
       set status                     = 'declined',
           payment_terms_status       = 'declined',
           payment_terms_counter      = null,
           payment_terms_note         = v_reason,
           payment_terms_responded_at = now(),
           cancellation_reason        = v_reason
     where id = p_booking_id;

    insert into public.notifications(recipient_id, trigger_key, title, body, data)
    values (b.client_id, 'booking.declined',
      'Your booking request was declined',
      v_reason,
      jsonb_build_object('booking_id', p_booking_id));

  else
    -- Counter. The booking stays `requested`: nothing is agreed, and the date
    -- is not held. What moves is the money question, back to the client.
    if b.payment_terms_from_event then
      raise exception 'terms_set_by_event';
    end if;
    if p_counter is null then raise exception 'counter_required'; end if;
    if p_counter = b.payment_type then raise exception 'counter_same_as_proposed'; end if;
    if b.payment_terms_status = 'countered' then raise exception 'terms_already_countered'; end if;
    if v_reason is null then raise exception 'reason_required'; end if;

    update public.bookings
       set payment_terms_status       = 'countered',
           payment_terms_counter      = p_counter,
           payment_terms_note         = v_reason,
           payment_terms_responded_at = now()
     where id = p_booking_id;

    insert into public.notifications(recipient_id, trigger_key, title, body, data)
    values (b.client_id, 'booking.terms_countered',
      'Your vendor proposed different payment terms',
      case when p_counter = 'escrow'
        then 'The vendor would rather be paid through Sinnapi escrow. Review what that costs and '
             || 'accept or decline.'
        else 'The vendor would rather be paid directly, outside Sinnapi. Sinnapi would hold '
             || 'nothing and could not mediate. Review it and accept or decline.' end,
      jsonb_build_object(
        'booking_id', p_booking_id,
        'counter',    p_counter,
        'note',       v_reason));
  end if;
end;$$;

comment on function public.respond_booking(uuid, text, text, payment_type) is
  'Vendor-only: answers a requested booking. accept confirms the date and the terms; decline ends '
  'it with a reason; counter offers the other payment rail back to the client.';

grant execute on function public.respond_booking(uuid, text, text, payment_type) to authenticated;

-- =====================================================================
-- THE CLIENT'S ANSWER TO A COUNTER
--
-- Accepting is what moves the vendor's counter onto `payment_type`, and it
-- confirms the booking in the same statement — the vendor already said yes to
-- the date on these terms, so a second vendor step would be asking them to
-- agree to their own proposal.
-- =====================================================================
create or replace function public.respond_terms_counter(
  p_booking_id   uuid,
  p_action       text,
  -- Consent to the advance split, when the counter is *to* escrow and so
  -- introduces a schedule the client has not yet agreed to.
  p_advance_rate numeric default null,
  p_reason       text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_limit  numeric;
  v_rate   numeric;
begin
  select * into b from public.bookings where id = p_booking_id and deleted_at is null for update;
  if b.id is null then raise exception 'not_found'; end if;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;

  if p_action not in ('accept', 'decline') then
    raise exception 'unsupported_action: %', p_action;
  end if;
  if b.payment_terms_status <> 'countered' then raise exception 'no_counter_pending'; end if;
  if b.status <> 'requested' then raise exception 'booking_not_pending'; end if;
  if v_reason is not null and length(v_reason) > 500 then raise exception 'reason_too_long'; end if;

  if p_action = 'decline' then
    update public.bookings
       set status                     = 'declined',
           payment_terms_status       = 'declined',
           payment_terms_counter      = null,
           payment_terms_responded_at = now(),
           cancellation_reason        = coalesce(v_reason, 'Client declined the vendor''s payment terms')
     where id = p_booking_id;

    insert into public.notifications(recipient_id, trigger_key, title, body, data)
    select v.owner_id, 'booking.terms_counter_declined',
      'Your payment terms were declined',
      coalesce(v_reason, 'The client did not accept the payment terms you proposed, and the '
                      || 'booking has ended.'),
      jsonb_build_object('booking_id', p_booking_id)
      from public.vendors v where v.id = b.vendor_id and v.owner_id is not null;
    return;
  end if;

  -- Accept. The counter becomes the terms, and the date is held.
  v_limit := public.advance_rate_ceiling(b.advance_rate);
  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_limit) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_limit;
  end if;

  -- Moving *to* escrow introduces a payout schedule the client has never seen,
  -- so consent is required in the same act. Moving to direct discards one, and
  -- with it any consent that was recorded: there is no longer anything held to
  -- release, and leaving the stamp would let a later switch back to escrow
  -- inherit consent given for a different arrangement.
  if b.payment_terms_counter = 'escrow' then
    if p_advance_rate is null and b.advance_terms_accepted_at is null then
      raise exception 'advance_terms_not_accepted';
    end if;
    v_rate := coalesce(p_advance_rate, b.advance_rate,
                       (public.get_setting('advance_rate_default') #>> '{}')::numeric);

    update public.bookings
       set payment_type               = b.payment_terms_counter,
           status                     = 'confirmed',
           payment_terms_status       = 'accepted',
           payment_terms_counter      = null,
           payment_terms_responded_at = now(),
           advance_rate               = v_rate,
           advance_terms_accepted_at  = coalesce(advance_terms_accepted_at, now()),
           advance_terms_accepted_by  = coalesce(advance_terms_accepted_by, auth.uid())
     where id = p_booking_id;
  else
    update public.bookings
       set payment_type               = b.payment_terms_counter,
           status                     = 'confirmed',
           payment_terms_status       = 'accepted',
           payment_terms_counter      = null,
           payment_terms_responded_at = now(),
           advance_terms_accepted_at  = null,
           advance_terms_accepted_by  = null
     where id = p_booking_id;
  end if;

  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select v.owner_id, 'booking.terms_counter_accepted',
    'Your payment terms were accepted',
    'The client agreed to your payment terms and the booking is confirmed.',
    jsonb_build_object('booking_id', p_booking_id, 'payment_type', b.payment_terms_counter)
    from public.vendors v where v.id = b.vendor_id and v.owner_id is not null;
end;$$;

comment on function public.respond_terms_counter(uuid, text, numeric, text) is
  'Client-only: answers a vendor''s counter-proposed payment rail. Accepting adopts the rail and '
  'confirms the booking; declining ends it.';

grant execute on function public.respond_terms_counter(uuid, text, numeric, text) to authenticated;

-- =====================================================================
-- EVENT-WIDE TERMS
--
-- Setting them re-opens every booking under the event that is still waiting on
-- an answer. Not the confirmed ones: those are agreements two people have
-- already made, and an event setting is not a way to rewrite them afterwards.
-- =====================================================================
create or replace function public.set_event_payment_terms(
  p_event_id     uuid,
  p_payment_type payment_type,
  p_note         text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  e        public.events;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  -- The bookings whose *rail* actually moves. Collected before the update,
  -- because that is the only point at which the old value still exists — and
  -- because it is a narrower set than the one being rewritten: a booking
  -- already on the right rail still needs its `from_event` flag set, but its
  -- vendor does not need to be told the client changed their mind when they
  -- did not.
  v_moved  uuid[];
begin
  select * into e from public.events where id = p_event_id and deleted_at is null for update;
  if e.id is null then raise exception 'not_found'; end if;
  if e.posted_by <> auth.uid() then perform public._forbidden(); end if;
  if v_note is not null and length(v_note) > 500 then raise exception 'note_too_long'; end if;

  update public.events
     set payment_type = p_payment_type, payment_terms_note = v_note, updated_by = auth.uid()
   where id = p_event_id;

  select coalesce(array_agg(b.id), '{}')
    into v_moved
    from public.bookings b
   where b.event_id = p_event_id
     and b.deleted_at is null
     and b.status = 'requested'
     and b.payment_type is distinct from p_payment_type;

  -- Bookings still awaiting a vendor answer are re-proposed on the new terms.
  -- A vendor part-way through a counter has that counter withdrawn — they were
  -- negotiating a rail this event no longer permits.
  --
  -- Two reasons to rewrite a pending booking, and the second is easy to miss:
  -- the rail changed, *or* it already matched but the booking was never marked
  -- as inheriting it. The second is a booking whose vendor could still counter
  -- on terms the client has since made event-wide, which is the loophole the
  -- flag exists to close.
  update public.bookings
     set payment_type               = p_payment_type,
         payment_terms_status       = 'proposed',
         payment_terms_from_event   = true,
         payment_terms_counter      = null,
         payment_terms_note         = null,
         payment_terms_proposed_at  = now(),
         payment_terms_responded_at = null,
         -- Consent belongs to a rail. Off-platform has no schedule to consent
         -- to, so any stamp carried over would be consent to something that no
         -- longer exists.
         advance_terms_accepted_at  = case when p_payment_type = 'escrow'
                                           then advance_terms_accepted_at end,
         advance_terms_accepted_by  = case when p_payment_type = 'escrow'
                                           then advance_terms_accepted_by end
   where event_id = p_event_id
     and deleted_at is null
     and status = 'requested'
     and (payment_type is distinct from p_payment_type
          or payment_terms_from_event is distinct from true);

  -- Only the vendors whose rail actually moved. Telling the rest that "the
  -- client now wants X" when X is what they were already looking at is a
  -- notification that misdescribes its own subject.
  insert into public.notifications(recipient_id, trigger_key, title, body, data)
  select v.owner_id, 'booking.terms_proposed',
    'Payment terms changed on a booking request',
    case when p_payment_type = 'escrow'
      then 'The client now wants to pay through Sinnapi escrow. Review the request again.'
      else 'The client now wants to pay you directly, outside Sinnapi. Review the request again.'
    end,
    jsonb_build_object('booking_id', b.id, 'payment_type', p_payment_type)
    from public.bookings b
    join public.vendors v on v.id = b.vendor_id
   where b.id = any(v_moved)
     and v.owner_id is not null;

end;$$;

comment on function public.set_event_payment_terms(uuid, payment_type, text) is
  'Client-only: sets the payment rail binding every booking made under one of their events, and '
  're-proposes it on any booking still waiting for a vendor answer.';

grant execute on function public.set_event_payment_terms(uuid, payment_type, text) to authenticated;

-- =====================================================================
-- ESCROW GUARDS
--
-- Escrow is now a term rather than a checkout choice, so funding one that was
-- never agreed has to be refused. Without this, `activate_escrow`'s own
-- `update bookings set payment_type = 'escrow'` would rewrite an agreed
-- off-platform booking into an escrow one at the moment of charge — the exact
-- silent overwrite this migration exists to end.
-- =====================================================================
create or replace function public.activate_escrow(
  p_booking_id uuid,
  p_provider   payment_provider,
  p_method     payment_method)
returns table (payment_id uuid, escrow_id uuid, amount numeric, currency text)
language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  q        record;
  e        public.escrow_transactions;
  v_escrow uuid;
  v_payment uuid;
  v_idem   text;
  v_fx     uuid;
  v_base   numeric;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;

  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;

  -- The two new gates. Both parties agreed a rail; this is not the screen that
  -- changes it.
  if b.payment_type is distinct from 'escrow' then raise exception 'not_an_escrow_booking'; end if;
  if b.payment_terms_status <> 'accepted' then raise exception 'payment_terms_not_agreed'; end if;

  if b.advance_terms_accepted_at is null then raise exception 'advance_terms_not_accepted'; end if;
  if coalesce(b.amount, 0) <= 0 then raise exception 'booking_amount_not_set'; end if;
  if p_provider = 'paypal' and p_method <> 'card' then raise exception 'paypal_requires_card'; end if;

  select * into q from public.escrow_price_booking(p_booking_id, p_provider, p_method);

  select * into e from public.escrow_transactions
   where booking_id = p_booking_id for update;

  if e.id is not null and e.status not in ('initiated', 'failed') then
    raise exception 'escrow_already_active: %', e.status;
  end if;

  if q.currency <> 'UGX' then
    v_fx   := public.latest_fx_rate_id(q.currency, 'UGX');
    v_base := q.gross_amount * coalesce((select rate from public.exchange_rates where id = v_fx), 1);
  else
    v_base := q.gross_amount;
  end if;

  v_idem := 'PM-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payments (payer_id, purpose, booking_id, provider, provider_method,
      idempotency_key, amount, currency, fx_rate_id, base_amount, base_currency, status, created_by)
  values (auth.uid(), 'escrow_funding', p_booking_id, p_provider, p_method,
      v_idem, q.gross_amount, q.currency, v_fx, v_base, 'UGX', 'pending', auth.uid())
  returning id into v_payment;

  if e.id is null then
    insert into public.escrow_transactions (
      booking_id, client_id, vendor_id, funding_payment_id, currency,
      agreed_amount, commission_rate, commission_amount, psp_fee_rate, psp_fee_amount,
      gross_amount, advance_rate, advance_amount, balance_amount, net_payout_amount,
      advance_release_due_at, status, fx_rate_id, created_by)
    values (
      p_booking_id, auth.uid(), b.vendor_id, v_payment, q.currency,
      q.agreed_amount, q.commission_rate, q.commission_amount, q.psp_fee_rate, q.psp_fee_amount,
      q.gross_amount, q.advance_rate, q.advance_amount, q.balance_amount, q.agreed_amount,
      q.advance_release_due_at, 'initiated', v_fx, auth.uid())
    returning id into v_escrow;
  else
    update public.escrow_transactions
       set funding_payment_id = v_payment,
           currency           = q.currency,
           agreed_amount      = q.agreed_amount,
           commission_rate    = q.commission_rate,
           commission_amount  = q.commission_amount,
           psp_fee_rate       = q.psp_fee_rate,
           psp_fee_amount     = q.psp_fee_amount,
           gross_amount       = q.gross_amount,
           advance_rate       = q.advance_rate,
           advance_amount     = q.advance_amount,
           balance_amount     = q.balance_amount,
           net_payout_amount  = q.agreed_amount,
           advance_release_due_at = q.advance_release_due_at,
           status             = 'initiated',
           fx_rate_id         = v_fx,
           failure_reason     = null,
           attempt_no         = e.attempt_no + 1
     where id = e.id
    returning id into v_escrow;
  end if;

  update public.payments set escrow_id = v_escrow where id = v_payment;

  perform public.escrow_notify(
    v_escrow, 'initiated', 'escrow.awaiting_payment',
    true, true, false, q.gross_amount,
    jsonb_build_object('provider', p_provider, 'method', p_method));

  return query select v_payment, v_escrow, q.gross_amount, q.currency;
end;$$;

-- ---------------------------------------------------------------------
-- accept_advance_terms — now reachable before the vendor has answered.
--
-- Consent moved to booking creation, so the `confirmed` guard would refuse the
-- ordinary case. What replaces it is the rail: consenting to an advance
-- schedule on an off-platform booking is consent to something that does not
-- exist. The rest of the body is 0811.1's, unchanged.
-- ---------------------------------------------------------------------
create or replace function public.accept_advance_terms(
  p_booking_id   uuid,
  p_advance_rate numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b          public.bookings;
  v_max      numeric;
  v_max_days integer;
  v_limit    numeric;
  v_rate     numeric;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;
  if b.client_id <> auth.uid() then perform public._forbidden(); end if;
  if b.status not in ('requested', 'confirmed') then raise exception 'booking_not_pending'; end if;
  if b.payment_type is distinct from 'escrow' then raise exception 'not_an_escrow_booking'; end if;
  if b.advance_terms_accepted_at is not null then return; end if;  -- idempotent

  v_max      := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::integer, 30);
  v_limit    := public.advance_rate_ceiling(b.advance_rate);

  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_limit) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_limit;
  end if;

  v_rate := coalesce(p_advance_rate, b.advance_rate,
                     (public.get_setting('advance_rate_default') #>> '{}')::numeric, 0);

  if v_rate > v_max then
    raise exception 'advance_rate_above_platform_max: % > %', v_rate, v_max;
  end if;
  if coalesce(b.advance_release_days_before, 0) > v_max_days then
    raise exception 'advance_release_days_above_platform_max: % > %',
      b.advance_release_days_before, v_max_days;
  end if;

  update public.bookings
     set advance_rate              = v_rate,
         advance_terms_accepted_at = now(),
         advance_terms_accepted_by = auth.uid()
   where id = p_booking_id;

  if v_rate is distinct from b.advance_rate then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'advance_rate_chosen_by_client', 'bookings', p_booking_id,
            jsonb_build_object('advance_rate', b.advance_rate),
            jsonb_build_object('advance_rate', v_rate));
  end if;
end;$$;

-- =====================================================================
-- ADMIN VISIBILITY
--
-- The console adjudicates disputes, and "which rail was agreed, and did the
-- vendor ever actually agree to it" is the first question on an off-platform
-- complaint. Added to the existing document rather than a second read.
-- =====================================================================
create or replace function public.get_booking_admin(p_booking_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_doc jsonb;
begin
  if not public.has_permission('bookings.read') then perform public._forbidden(); end if;

  select jsonb_build_object(
    'id',                          b.id,
    'reference_no',                b.reference_no,
    'status',                      b.status,
    'event_date',                  b.event_date,
    'start_time',                  b.start_time,
    'end_time',                    b.end_time,
    'location',                    b.location,
    'currency',                    b.currency,
    'amount',                      b.amount,
    'payment_type',                b.payment_type,
    -- The terms conversation, as five facts: what was agreed, how far it got,
    -- what is still on the table, what either side said about it, and whether
    -- the client could have chosen at all.
    'payment_terms_status',        b.payment_terms_status,
    'payment_terms_counter',       b.payment_terms_counter,
    'payment_terms_note',          b.payment_terms_note,
    'payment_terms_from_event',    b.payment_terms_from_event,
    'payment_terms_responded_at',  b.payment_terms_responded_at,
    'advance_rate',                b.advance_rate,
    'advance_release_days_before', b.advance_release_days_before,
    'advance_terms_note',          b.advance_terms_note,
    'advance_terms_accepted_at',   b.advance_terms_accepted_at,
    'advance_terms_accepted_by',   acc.full_name,
    'cancellation_reason',         b.cancellation_reason,
    'cancelled_by',                canc.full_name,
    'started_at',                  b.started_at,
    'completed_at',                b.completed_at,
    'created_at',                  b.created_at,

    'vendor', jsonb_build_object(
      'id',    vend.id,
      'name',  vend.business_name,
      'slug',  vend.slug,
      'email', vown.email,
      'phone', vown.phone),

    'client', jsonb_build_object(
      'id',    cli.id,
      'name',  cli.full_name,
      'email', cli.email,
      'phone', cli.phone),

    'event', case when ev.id is null then null else jsonb_build_object(
      'id',           ev.id,
      'title',        ev.title,
      -- Terms set here outrank the booking's own, so an operator looking at a
      -- booking that could not be countered needs to see where that came from.
      'payment_type', ev.payment_type) end,

    'escrow', case when esc.id is null then null else jsonb_build_object(
      'id',                     esc.id,
      'status',                 esc.status,
      'currency',               esc.currency,
      'gross_amount',           esc.gross_amount,
      'agreed_amount',          esc.agreed_amount,
      'commission_amount',      esc.commission_amount,
      'psp_fee_amount',         esc.psp_fee_amount,
      'advance_rate',           esc.advance_rate,
      'advance_amount',         esc.advance_amount,
      'balance_amount',         esc.balance_amount,
      'advance_release_due_at', esc.advance_release_due_at,
      'advance_released_at',    esc.advance_released_at,
      'balance_released_at',    esc.balance_released_at,
      'timers_frozen_at',       esc.timers_frozen_at) end,

    -- Same shape as get_event_quotation, so one PDF renderer serves both.
    'quotation', case when q.id is null then null else jsonb_build_object(
      'id',              q.id,
      'reference_no',    q.reference_no,
      'status',          q.status,
      'currency',        q.currency,
      'subtotal',        q.subtotal,
      'discount_total',  q.discount_total,
      'tax_total',       q.tax_total,
      'total',           q.total,
      'valid_until',     q.valid_until,
      'request_details', q.request_details,
      'sent_at',         q.sent_at,
      'created_at',      q.created_at,
      'vendor_name',     vend.business_name,
      'client_name',     cli.full_name,
      'event_title',     ev.title,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'description', qi.description,
                 'quantity',    qi.quantity,
                 'unit_price',  qi.unit_price,
                 'line_total',  qi.line_total)
               order by qi.sort_order)
        from public.quotation_items qi where qi.quotation_id = q.id), '[]'::jsonb)) end
  )
  into v_doc
  from public.bookings b
  join public.vendors  vend on vend.id = b.vendor_id
  join public.profiles vown on vown.id = vend.owner_id
  join public.profiles cli  on cli.id  = b.client_id
  left join public.events     ev   on ev.id  = b.event_id
  left join public.quotations q    on q.id   = b.quotation_id and q.deleted_at is null
  left join public.escrow_transactions esc on esc.booking_id = b.id
  left join public.profiles acc  on acc.id  = b.advance_terms_accepted_by
  left join public.profiles canc on canc.id = b.cancelled_by
  where b.id = p_booking_id and b.deleted_at is null;

  if v_doc is null then raise exception 'not_found'; end if;
  return v_doc;
end;$$;

grant execute on function public.create_booking(
  uuid, date, numeric, text, uuid, uuid, uuid, text, time, time, payment_type, numeric)
to authenticated;

grant execute on function public.create_booking_from_quotation(
  uuid, date, time, time, text, payment_type, numeric)
to authenticated;
