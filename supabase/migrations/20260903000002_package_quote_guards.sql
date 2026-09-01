-- =====================================================================
-- Sinnapi — 0903b Package quotes: the guards, as triggers
--
-- WHY TRIGGERS AND NOT CHECKS INSIDE THE RPCs
--
-- `quotations` and `quotation_items` are both writable through PostgREST by
-- either party to the quote. From 0011:
--
--   quotations_update  ... using (client_id = auth.uid() or is_vendor_owner(vendor_id))
--   q_items_rw         ... for all, same predicate
--
-- So a vendor who wants to halve the discount on a package quote does not need
-- `send_quotation` at all — they need one PATCH. A rule written inside an RPC
-- guards the door of a room with no walls.
--
-- It is also the pattern this schema already reaches for when a rule has to
-- hold across paths nobody enumerated: `tg_quotation_offer_lifecycle` (0902c)
-- is a trigger precisely because quotes also reach `expired` through an hourly
-- cron that no RPC ever sees. The same reasoning applies here with more force,
-- because the thing being protected is a price a client is bound to.
--
-- THE THREE INVARIANTS
--
--   1. A package quote's contents cannot change.   (items trigger)
--   2. A package quote's base cannot change, and its combined discount can
--      only grow.                                  (quotations trigger)
--   3. A booking's date stays inside the window its offer was granted for.
--                                                  (bookings trigger)
--
-- Every one of them is a no-op on a 'vendor'-origin quotation, which is every
-- quotation that existed before 0903a. Nothing about the original flow moves.
-- =====================================================================

-- ---------------------------------------------------------------------
-- THE WINDOW AN OFFER'S EVENT MUST FALL IN
--
-- `discounts.starts_at` / `ends_at` — the same two timestamps
-- `discount_is_live` tests against `now()`. So the window in which an offer
-- may be CLAIMED is also the window in which the event may HAPPEN.
--
-- That is a deliberate product decision and it is worth being explicit about
-- what it costs: an early-bird offer running through September cannot be used
-- for a December wedding, because December is outside the window. A vendor who
-- wants that has to run the campaign across the period they are selling INTO,
-- not the period they are selling IN. If that turns out to be too blunt, the
-- fix is two more columns on `discounts` (an event window distinct from the
-- claim window) and a change to this one function — every caller reads the
-- window through here for exactly that reason.
--
-- Cast to `date` at the boundary, not compared as timestamps. `event_date` is
-- a date, and a client whose event is on the 30th must not be refused because
-- the offer ends at 09:00 that morning: the offer is good for that day.
-- ---------------------------------------------------------------------
create or replace function public.discount_event_window(p_discount_id uuid)
returns table (starts_on date, ends_on date)
language sql stable security definer set search_path = public as $$
  select d.starts_at::date, d.ends_at::date
    from public.discounts d
   where d.id = p_discount_id;
$$;

comment on function public.discount_event_window(uuid) is
  'The dates an event may fall on to qualify for this offer. Today the offer''s own claim '
  'window; the single place to change if event and claim windows are ever separated.';

grant execute on function public.discount_event_window(uuid) to anon, authenticated;

-- Null when the date qualifies, otherwise the reason it does not.
--
-- A reason rather than a boolean, for the same reason `discount_block_reason`
-- returns one: "this offer starts on 1 December" and "this offer ended on
-- 30 November" send a client to two different next actions, and `false` sends
-- them to neither.
create or replace function public.discount_date_block_reason(
  p_discount_id uuid,
  p_event_date  date)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  w record;
begin
  if p_discount_id is null then return null; end if;
  -- No date to test is not a failure here. The paths that REQUIRE one say so
  -- themselves; this answers only the question it was asked.
  if p_event_date is null then return null; end if;

  select * into w from public.discount_event_window(p_discount_id);
  if w.starts_on is null then return 'not_found'; end if;

  if p_event_date < w.starts_on then return 'event_before_window'; end if;
  if p_event_date > w.ends_on   then return 'event_after_window';  end if;
  return null;
end;$$;

grant execute on function public.discount_date_block_reason(uuid, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- INVARIANT 1 — THE PACKAGE'S CONTENTS
--
-- The client bought an itemised tier. Every line, quantity and unit price on a
-- published package is public (0823b made that an explicit product call), so
-- the client read them before clicking. A vendor who can edit those lines
-- afterwards is selling one thing and delivering another.
--
-- The escape hatch is a transaction-local setting rather than a role check,
-- because the ONE writer that is allowed here — `request_package_quotation` in
-- 0903c — runs as `security definer` and so arrives wearing the same face as
-- everybody else. `set_config(..., true)` scopes it to the transaction, so it
-- cannot leak into the next statement on a pooled connection.
--
-- Note it does not exempt `send_quotation`. That RPC opens by deleting every
-- item on the quote, which is precisely the thing being prevented; a vendor
-- who wants to price this quote themselves has to decline it and quote afresh.
-- ---------------------------------------------------------------------
create or replace function public.tg_package_quote_items_locked()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_quotation uuid := coalesce(new.quotation_id, old.quotation_id);
  v_origin    text;
begin
  if coalesce(nullif(current_setting('sinnapi.package_quote_write', true), ''), 'off') = 'on' then
    return coalesce(new, old);
  end if;

  select q.quote_origin into v_origin
    from public.quotations q where q.id = v_quotation;

  if v_origin = 'package' then
    raise exception 'package_quote_items_locked'
      using hint = 'The client bought this package as published. Decline it and send your own '
                   'quote if the scope has to change.';
  end if;

  return coalesce(new, old);
end;$$;

drop trigger if exists trg_package_quote_items_locked on public.quotation_items;
create trigger trg_package_quote_items_locked
  before insert or update or delete on public.quotation_items
  for each row execute function public.tg_package_quote_items_locked();

-- ---------------------------------------------------------------------
-- INVARIANT 2 — THE MONEY
--
-- Reads OLD's locks, never NEW's. An update that rewrites `locked_subtotal` in
-- the same statement that breaches it must be measured against the lock as it
-- stood, or the lock is decorative — so the locks are pinned first and
-- everything else is tested against the pinned values.
--
-- Only while the quote is still live. Once it is `accepted`, `declined`,
-- `voided` or `expired` the numbers are a record of what happened, and
-- `respond_quotation` already copies a price onto a linked booking on accept —
-- a guard that kept firing afterwards would break writes that are not about
-- re-pricing at all.
--
-- Rounded to 2dp before comparison. Both sides are `numeric(14,2)` columns, but
-- one of them arrives from `resolve_discount_amount`, and a floor that fails on
-- a half-cent would be a floor nobody could satisfy on purpose.
-- ---------------------------------------------------------------------
create or replace function public.tg_package_quote_money_locked()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_was numeric;
  v_now numeric;
begin
  if old.quote_origin is distinct from 'package' then return new; end if;

  -- The locks themselves. Not the vendor's to move, and not the client's
  -- either — the whole point is that neither party can restate the deal.
  new.locked_subtotal       := old.locked_subtotal;
  new.locked_discount_floor := old.locked_discount_floor;
  new.quote_origin          := old.quote_origin;

  if old.status not in ('requested', 'sent', 'revised') then return new; end if;

  -- `send_quotation` is refused outright rather than allowed through on the
  -- arithmetic. It would arrive having already deleted the items (invariant 1
  -- stops it there), and `sent` is a state this flow has no meaning in: it
  -- would hand the client an Accept button for a quote they already committed
  -- to and leave the vendor's approval unrecorded.
  if new.status = 'sent' and old.status <> 'sent' then
    raise exception 'package_quote_not_sendable'
      using hint = 'Approve or decline this request instead of re-sending it.';
  end if;

  if round(coalesce(new.subtotal, 0), 2) <> round(coalesce(old.locked_subtotal, 0), 2) then
    raise exception 'package_quote_amount_locked'
      using hint = 'The client bought this tier at its published price.';
  end if;

  v_was := round(coalesce(old.locked_discount_floor, 0), 2);
  v_now := round(coalesce(new.discount_total, 0) + coalesce(new.offer_discount_total, 0), 2);

  -- A FLOOR, not a fixed value: beating it is always allowed.
  if v_now < v_was then
    raise exception 'package_quote_discount_locked'
      using hint = 'You can increase the saving on this quote, but not reduce the one the '
                   'client was shown.';
  end if;

  return new;
end;$$;

drop trigger if exists trg_package_quote_money_locked on public.quotations;
create trigger trg_package_quote_money_locked
  before update on public.quotations
  for each row execute function public.tg_package_quote_money_locked();

-- ---------------------------------------------------------------------
-- INVARIANT 3 — THE BOOKING'S DATE
--
-- The client picks the booking date at `create_booking_from_quotation`, and
-- until now it could be any future date. On a discounted quote it cannot: the
-- offer was granted for an event inside a window, and a client who books the
-- discounted price for a date outside it has taken the saving for something
-- the campaign never covered.
--
-- On the booking rather than only in the RPC because `bookings.event_date` is
-- reachable by both parties through RLS, and rescheduling is a normal thing to
-- do to a booking — a reschedule out of the window is the same breach arriving
-- one screen later.
--
-- Only bookings that came from a quotation carrying an offer. A direct booking
-- has no campaign to fall outside of.
-- ---------------------------------------------------------------------
create or replace function public.tg_booking_offer_date_window()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_discount uuid;
  v_reason   text;
  w          record;
begin
  if new.quotation_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.event_date is not distinct from old.event_date then
    return new;
  end if;

  select q.offer_discount_id into v_discount
    from public.quotations q where q.id = new.quotation_id;
  if v_discount is null then return new; end if;

  v_reason := public.discount_date_block_reason(v_discount, new.event_date);
  if v_reason is null then return new; end if;

  select * into w from public.discount_event_window(v_discount);
  raise exception 'booking_date_outside_offer_window: % to %', w.starts_on, w.ends_on
    using hint = 'This date is not covered by the offer on the quote. Pick a date inside the '
                 'window, or book without the saving from a fresh quote.';
end;$$;

drop trigger if exists trg_booking_offer_date_window on public.bookings;
create trigger trg_booking_offer_date_window
  before insert or update of event_date on public.bookings
  for each row execute function public.tg_booking_offer_date_window();
