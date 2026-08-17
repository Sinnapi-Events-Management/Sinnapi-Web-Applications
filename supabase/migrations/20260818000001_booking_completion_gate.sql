-- =====================================================================
-- Sinnapi — a booking cannot be completed before its event has ended.
--
-- `complete_booking` has never had a date gate. `start_booking` has three
-- (confirmed, on or after the event date, funded), but the button that says
-- the service was *delivered* would take a booking that starts in November and
-- mark it done today. That is not a cosmetic problem: completion fires
-- trg_escrow_release_window, which opens the auto-release clock, and from there
-- the client is asked to confirm a service nobody has performed and Finance is
-- queued to pay it out. A vendor who taps it early — by accident or otherwise —
-- misleads the client and the console at the same time.
--
-- The gate is the end of the event, not its start:
--
--   end_time set    → event_date + end_time
--   end_time null   → midnight following event_date (the whole day is theirs)
--
-- Evaluated in Africa/Kampala. Bookings carry a plain `date` and a plain
-- `time` with no zone of their own, and every event they describe happens in
-- Uganda; reading them in UTC would unlock the button three hours early for
-- everyone. EAT never observes DST, so the offset is a constant and the two
-- portals can compute the same instant client-side without a tz library.
--
-- Admins keep their override — `admin_set_booking_status` demands a reason and
-- is the documented support lever for the case where an event genuinely ended
-- early. This gate binds the vendor, who is the party with the incentive.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The instant a booking's event is over, as an absolute time.
--
-- Stable rather than immutable: it is pure, but `at time zone` on a named zone
-- depends on the tz database, so immutable would be a lie that indexes could
-- later be built on.
-- ---------------------------------------------------------------------
create or replace function public.booking_end_at(p_event_date date, p_end_time time)
returns timestamptz language sql stable set search_path = public as $$
  select case
    when p_event_date is null then null
    when p_end_time is null then
      -- No window given, so the vendor has the whole day: the event is over
      -- when the day is, not at 00:00 on the morning of it.
      ((p_event_date + 1)::timestamp) at time zone 'Africa/Kampala'
    else
      ((p_event_date + p_end_time)::timestamp) at time zone 'Africa/Kampala'
  end;
$$;

comment on function public.booking_end_at(date, time) is
  'When a booking''s event ends, in absolute time: event_date + end_time, or midnight after event_date when no end time was agreed. Read in Africa/Kampala.';

-- ---------------------------------------------------------------------
-- complete_booking — same intent, with the gate it never had.
--
-- Idempotency and the status guard are unchanged. What is new is the third
-- check, and that it is waived for `bookings.manage` holders exactly as
-- start_booking waives its own gates for them.
-- ---------------------------------------------------------------------
create or replace function public.complete_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b       public.bookings;
  v_admin boolean;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;

  v_admin := public.has_permission('bookings.manage');
  if not (public.is_vendor_owner(b.vendor_id) or v_admin) then
    perform public._forbidden();
  end if;

  if b.status = 'completed' then return; end if;   -- idempotent
  if b.status not in ('confirmed', 'in_progress') then
    raise exception 'booking_not_completable';
  end if;

  if not v_admin and now() < public.booking_end_at(b.event_date, b.end_time) then
    raise exception 'booking_not_ended';
  end if;

  update public.bookings set status = 'completed', completed_at = now() where id = p_booking_id;
end;$$;

grant execute on function public.booking_end_at(date, time) to authenticated;
