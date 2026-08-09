-- =====================================================================
-- Booking requests carry a time window.
--
-- `bookings.start_time` / `bookings.end_time` have existed since the calendar
-- migration but nothing ever wrote them: `create_booking` had no parameters for
-- them, so every request arrived as a bare date and the vendor had to ask what
-- time in a follow-up message. The client portal now collects an optional start
-- and end alongside the event date, so the RPC has to accept them.
--
-- The parameters are optional and default to null, which is exactly the state
-- every existing booking is already in — no backfill, and a caller that passes
-- neither behaves as it did before.
-- =====================================================================

-- The old signature is dropped rather than replaced: `create or replace` with a
-- different argument list would *overload* the function instead of superseding
-- it, and a call that omitted the new arguments would then be ambiguous between
-- the two and fail with 42725.
drop function if exists public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text);
-- ...and the new one too, so a `db reset` that replays this file over a database
-- that already has it re-creates rather than failing on the duplicate.
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

  for i in 1 .. 8 loop
    begin
      insert into public.bookings(vendor_id, client_id, vendor_service_id, quotation_id, event_id,
          status, event_date, start_time, end_time, location, currency, amount)
      values (p_vendor_id, auth.uid(), p_service_id, p_quotation_id, p_event_id,
          'requested', p_event_date, p_start_time, p_end_time, p_location, p_currency, p_amount)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_bookings_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: bookings' using errcode = '23505';
end;$$;

-- The blanket `grant execute on all functions` in the original RPC migration
-- only covered the functions that existed when it ran, so a re-created function
-- needs its grant restated. `create_booking` self-checks the caller, which is
-- why `authenticated` is the right audience.
grant execute on function
  public.create_booking(uuid, date, numeric, text, uuid, uuid, uuid, text, time, time)
to authenticated;
