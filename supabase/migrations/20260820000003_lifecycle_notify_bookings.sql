-- =====================================================================
-- Sinnapi — 0820c Bookings: a notification for every stage
--
-- WHERE THIS FLOW ACTUALLY STOOD
-- Better than quotations, and still not covered. 0817a gave the payment-terms
-- half real notifications with real copy — a vendor hears about a request, a
-- client hears about a confirmation, a decline and a counter — and then the
-- lifecycle half has nothing at all:
--
--   start_booking            confirmed -> in_progress    silent
--   complete_booking         -> completed                silent
--   cancel_booking           -> cancelled                silent
--   admin_set_booking_status any of the above            silent
--
-- So the two moments a client most wants confirmation of — "we have started"
-- and "this is done" — were the two the product never mentioned, and an
-- operator moving someone's booking from the console told nobody they had.
--
-- THE SPLIT THIS FILE SETTLES
-- A booking notification is either about a *status transition* or about
-- something else. The something-else cases stay exactly where they are:
--
--   booking.terms_proposed        create_booking / set_event_payment_terms —
--                                 an INSERT, or a re-proposal that moves no
--                                 status
--   booking.from_quotation        create_booking_from_quotation, likewise an
--                                 INSERT
--   booking.terms_countered       respond_booking — the booking deliberately
--                                 stays `requested`; what moved is the money
--                                 question, not the state
--
-- Everything driven by the status moves to one trigger, and the four inline
-- inserts that used to do it are removed from `respond_booking` and
-- `respond_terms_counter` below. Two writers for one transition is how a user
-- ends up told twice, and it is also how `admin_set_booking_status` ended up
-- telling nobody: the notification lived in the RPCs the parties call, and the
-- console does not call those.
--
-- WHO HEARS ABOUT WHAT
-- Every status arm notifies both parties *except whoever caused it*. That one
-- rule replaces the per-RPC recipient lists and is the reason the console works
-- for free: when an admin confirms a booking, neither party is the actor, so
-- both are told — which is precisely what an operator acting on someone's
-- behalf should produce.
-- =====================================================================

-- ---------------------------------------------------------------------
-- respond_booking — body as 0817a, minus the two notifications the status
-- trigger now owns.
--
-- `booking.terms_countered` stays: a counter leaves the booking `requested`,
-- so no transition fires and the trigger will never see it.
-- ---------------------------------------------------------------------
create or replace function public.respond_booking(
  p_booking_id uuid,
  p_action     text,
  p_reason     text default null,
  -- The rail offered instead, on `p_action = 'counter'`.
  p_counter    payment_type default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
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

  else
    -- Counter. The booking stays `requested`: nothing is agreed, and the date
    -- is not held. What moves is the money question, back to the client — and
    -- because no status moves, this notification has no trigger to own it.
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
        'booking_id',   p_booking_id,
        'vendor_id',    b.vendor_id,
        'client_id',    b.client_id,
        'audience',     'client',
        'counter',      p_counter,
        'payment_type', p_counter,
        'reason',       v_reason,
        'note',         v_reason));
  end if;
end;$$;

comment on function public.respond_booking(uuid, text, text, payment_type) is
  'Vendor-only: answers a requested booking. accept confirms the date and the terms; decline ends '
  'it with a reason; counter offers the other payment rail back to the client. The accept and '
  'decline notifications are emitted by tg_booking_notify off the status transition.';

grant execute on function public.respond_booking(uuid, text, text, payment_type) to authenticated;

-- ---------------------------------------------------------------------
-- respond_terms_counter — body as 0817a, minus the two notifications the
-- status trigger now owns. Both of its arms move the status (`confirmed` on
-- accept, `declined` on decline), so both are covered there.
-- ---------------------------------------------------------------------
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
end;$$;

comment on function public.respond_terms_counter(uuid, text, numeric, text) is
  'Client-only: answers a vendor''s counter-proposed payment rail. Accepting adopts the rail and '
  'confirms the booking; declining ends it. The vendor is notified by tg_booking_notify off the '
  'status transition.';

grant execute on function public.respond_terms_counter(uuid, text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- The payload every booking notification renders from.
--
-- `payment_terms_line` is a whole sentence rather than a fact, which is
-- unusual for a payload and deliberate here: whether a confirmed booking is on
-- escrow or paid direct changes what the client needs to be *warned* about,
-- not just a noun in the sentence. `notification_templates` keys on
-- trigger + audience + locale and has no way to select on a column, so the
-- conditional half of the copy is composed here and the template places it.
-- The copy is the same wording 0817a shipped inline.
-- ---------------------------------------------------------------------
create or replace function public.booking_notify_payload(b public.bookings)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'booking_id',    b.id,
    'reference_no',  b.reference_no,
    'booking_ref',   b.reference_no,
    'quotation_id',  b.quotation_id,
    'vendor_id',     b.vendor_id,
    'client_id',     b.client_id,
    'currency',      b.currency,
    'amount',        b.amount,
    'event_date',    b.event_date,
    'payment_type',  b.payment_type,
    -- Same fallback tg_booking_history uses: the GUC when a caller set one,
    -- the column when the transition is a cancellation that wrote its reason
    -- there instead.
    'reason',        coalesce(nullif(current_setting('sinnapi.status_reason', true), ''),
                              b.cancellation_reason),
    'payment_terms_line', case
      when b.payment_type = 'escrow'
        then 'The vendor has agreed to payment through Sinnapi escrow. You can fund it now.'
      else 'The vendor has agreed to be paid directly, outside Sinnapi. Sinnapi is not holding '
           || 'this money and cannot mediate it.'
    end);
$$;

-- ---------------------------------------------------------------------
-- tg_booking_notify — one notification per transition, to everyone but the
-- person who caused it.
-- ---------------------------------------------------------------------
create or replace function public.tg_booking_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_payload jsonb;
  v_trigger text;
begin
  -- INSERT is not a transition. A new booking is announced by whichever RPC
  -- built it (`booking.terms_proposed`, `booking.from_quotation`), because only
  -- those know which of the two it was and what the client proposed.
  if tg_op <> 'UPDATE' or old.status is not distinct from new.status then
    return new;
  end if;

  v_trigger := case new.status
    when 'confirmed'   then 'booking.confirmed'
    when 'declined'    then 'booking.declined'
    when 'in_progress' then 'booking.started'
    when 'completed'   then 'booking.completed'
    when 'cancelled'   then 'booking.cancelled'
    else null
  end;
  -- `requested` is not reachable as a transition target: nothing moves a
  -- booking back to it. If something ever does, silence beats a wrong sentence.
  if v_trigger is null then return new; end if;

  select owner_id into v_owner from public.vendors where id = new.vendor_id;
  v_payload := public.booking_notify_payload(new);

  -- Both parties, minus whoever pressed the button. When an operator does it
  -- from the console neither party is the actor, so both hear — which is the
  -- point: an admin acting on a booking is exactly the case the per-RPC
  -- notifications could never cover.
  if new.client_id is distinct from auth.uid() then
    perform public.notify_party(
      v_trigger, new.client_id, 'client', 'bookings', new.id, v_payload);
  end if;

  if v_owner is distinct from auth.uid() then
    perform public.notify_party(
      v_trigger, v_owner, 'vendor', 'bookings', new.id, v_payload);
  end if;

  -- Exceptions reach the desk. A booking that ends badly — declined by either
  -- side, or cancelled after it was agreed — is the shape Support gets called
  -- about, and the console has no other signal that it happened.
  if new.status in ('declined', 'cancelled') then
    perform public.notify_admins(
      v_trigger, 'bookings.read', 'bookings', new.id, v_payload);
  end if;

  return new;
end;$$;

drop trigger if exists trg_booking_notify on public.bookings;
create trigger trg_booking_notify
  after update of status on public.bookings
  for each row execute function public.tg_booking_notify();

comment on function public.tg_booking_notify() is
  'Fans a booking status transition out to both parties except whoever caused it, and to the '
  'admin desk on declined and cancelled.';
