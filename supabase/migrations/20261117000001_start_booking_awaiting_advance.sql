-- =============================================================================
-- start_booking: a booking funded but still waiting on its advance is paid.
--
-- `awaiting_advance` (20260809000001) is "funded, advance not yet due". It was
-- missing from start_booking's funded check, so a vendor whose client had paid
-- in full was refused with `booking_not_funded`, and the vendor portal told
-- them "The booking has to be paid into escrow" while the Money tab said the
-- funds were secured. Starting moves no money, so widening this gate is safe.
--
-- The settlement chain (request_settlement, settlement_open_release,
-- client_confirm_release, auto_request_release) is deliberately NOT changed:
-- the advance must be released by the escrow-lifecycle job first. Decided
-- 2026-11-17.
--
-- Body is 20260812000001's verbatim except the status list. `create or
-- replace` keeps the existing grant (authenticated).
-- =============================================================================

create or replace function public.start_booking(
  p_booking_id uuid,
  p_reason     text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        public.bookings;
  e        public.escrow_transactions;
  v_admin  boolean;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;

  v_admin := public.has_permission('bookings.manage');
  if not (v_admin or b.client_id = auth.uid() or public.is_vendor_owner(b.vendor_id)) then
    perform public._forbidden();
  end if;

  -- Already there. Nothing to do, and nothing to complain about.
  if b.status = 'in_progress' then return; end if;
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;

  if not v_admin then
    -- Compared as dates, not instants: a booking is startable from the first
    -- moment of its event day, not from midnight UTC on it.
    if current_date < b.event_date then raise exception 'booking_not_yet_due'; end if;

    select * into e from public.escrow_transactions where booking_id = p_booking_id;
    -- 'held' is funded and waiting; 'awaiting_advance' is funded with the
    -- advance not yet due; 'advance_released' is funded with the advance
    -- already gone to the vendor. All three mean the money is in.
    if coalesce(e.status::text, '') not in ('held', 'awaiting_advance', 'advance_released') then
      raise exception 'booking_not_funded';
    end if;
  end if;

  perform set_config('sinnapi.status_reason', coalesce(p_reason, ''), true);
  update public.bookings
     set status = 'in_progress', started_at = now()
   where id = p_booking_id;
  perform set_config('sinnapi.status_reason', '', true);
end;$$;
