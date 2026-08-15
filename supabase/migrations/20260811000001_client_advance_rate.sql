-- =====================================================================
-- Sinnapi — 0811.1 CLIENT-CHOSEN ADVANCE RATE
--
-- The advance was previously a term the vendor set alone: proposed on the
-- quotation, copied onto the booking, and consented to as a yes/no. A client
-- who was uncomfortable releasing 30% before the event had no move except to
-- abandon escrow entirely.
--
-- This lets the client choose their own advance at checkout, bounded above by
-- what the vendor proposed and by the platform ceiling. Only downward: a
-- client can never commit the vendor to *more* pre-event exposure than the
-- vendor asked for, so no vendor re-approval is needed and the quotation's
-- written terms are never exceeded.
--
-- The rate stays server-side. `escrow_price_booking` prices the preview and
-- `activate_escrow` prices the charge from the same function, so a chosen
-- rate cannot show one split and settle another.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The highest advance a client may agree to.
--
-- The vendor's proposal is the working ceiling; the platform maximum caps it
-- in case a quotation was drafted before an admin tightened the setting. A
-- booking with no proposal falls back to the admin default, which is what the
-- pricing function has always charged in that case.
-- ---------------------------------------------------------------------
create or replace function public.advance_rate_ceiling(p_proposed numeric)
returns numeric language sql stable security definer set search_path = public as $$
  select least(
    coalesce(p_proposed, (public.get_setting('advance_rate_default') #>> '{}')::numeric, 0),
    coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50));
$$;

comment on function public.advance_rate_ceiling(numeric) is
  'Ceiling a client may choose for their advance: the vendor''s proposed rate, capped by advance_rate_max.';

-- ---------------------------------------------------------------------
-- PRICE A BOOKING — now accepts a client-proposed advance rate.
--
-- Dropped rather than replaced: the return type gains `advance_rate_limit`,
-- and leaving the 3-argument overload in place would make every existing
-- 3-argument call ambiguous against the new defaulted signature.
--
-- Existing callers (activate_escrow) pass three arguments and resolve to this
-- function with p_advance_rate defaulting to null, which reproduces the old
-- behaviour exactly: price at whatever the booking carries.
-- ---------------------------------------------------------------------
drop function if exists public.escrow_price_booking(uuid, payment_provider, payment_method);

create or replace function public.escrow_price_booking(
  p_booking_id   uuid,
  p_provider     payment_provider default 'pesapal',
  p_method       payment_method   default 'mtn_momo',
  p_advance_rate numeric          default null)
returns table (
  agreed_amount     numeric,
  commission_rate   numeric,
  commission_amount numeric,
  psp_fee_rate      numeric,
  psp_fee_amount    numeric,
  gross_amount      numeric,
  advance_rate      numeric,
  advance_amount    numeric,
  balance_amount    numeric,
  currency          text,
  advance_release_days_before integer,
  advance_release_due_at      timestamptz,
  -- What the client's picker may not exceed. Returned with the price so the
  -- browser never has to read platform_settings to know its own bounds.
  advance_rate_limit numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  b        public.bookings;
  v_comm_r numeric;
  v_comm   numeric;
  v_fee_r  numeric;
  v_fee    numeric;
  v_adv_r  numeric;
  v_adv    numeric;
  v_days   integer;
  v_limit  numeric;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then raise exception 'not_found'; end if;

  -- Visible to the two parties to the booking and to Finance. Pricing leaks
  -- the vendor's agreed rate, so it is not public.
  if not (b.client_id = auth.uid()
          or public.is_vendor_owner(b.vendor_id)
          or public.has_permission('escrow.read')) then
    perform public._forbidden();
  end if;

  v_comm_r := public.get_commission_rate();
  v_comm   := round(b.amount * v_comm_r / 100, 2);

  -- Estimated at checkout from the configured rate for this rail; the actual
  -- fee is only known at settlement and is reconciled as a variance later.
  v_fee_r := coalesce(
    (public.get_setting('psp_fee_rates') #>> array[p_provider::text, p_method::text])::numeric,
    0);
  v_fee := round((b.amount + v_comm) * v_fee_r / 100, 2);

  v_limit := public.advance_rate_ceiling(b.advance_rate);

  if p_advance_rate is not null then
    -- The client picked one. Bounds are the platform's, not the form's: this
    -- function is reachable through PostgREST, so the ceiling holds here.
    if p_advance_rate < 0 or p_advance_rate > v_limit then
      raise exception 'advance_rate_out_of_range: must be between 0 and %', v_limit;
    end if;
    v_adv_r := p_advance_rate;
  else
    -- Unchanged path: whatever the booking carries, or the admin default.
    v_adv_r := coalesce(b.advance_rate,
                        (public.get_setting('advance_rate_default') #>> '{}')::numeric, 0);
  end if;

  v_adv := round(b.amount * v_adv_r / 100, 2);

  v_days := coalesce(b.advance_release_days_before,
                     (public.get_setting('advance_release_days_default') #>> '{}')::integer, 7);

  return query select
    b.amount,
    v_comm_r,
    v_comm,
    v_fee_r,
    v_fee,
    -- Sum of already-rounded components; never re-round the total, or the
    -- parts stop adding up to the whole. The advance rate does not appear
    -- here: commission and the processing fee are charged on the agreed
    -- amount, so choosing a different advance moves the split, not the total.
    b.amount + v_comm + v_fee,
    v_adv_r,
    v_adv,
    -- Subtraction, not a second rounding, so the tranches sum exactly.
    b.amount - v_adv,
    b.currency,
    v_days,
    (b.event_date - make_interval(days => v_days))::timestamptz,
    v_limit;
end;$$;

-- ---------------------------------------------------------------------
-- CLIENT ACCEPTS THE ADVANCE TERMS — now the act that fixes the rate.
--
-- Consent and the chosen rate are one write. Recording them separately would
-- leave a window where a booking is consented-to at a rate the client never
-- saw, and `activate_escrow` re-prices from this row.
--
-- Dropped for the same reason as above: a defaulted second argument would
-- make every existing single-argument call ambiguous.
-- ---------------------------------------------------------------------
drop function if exists public.accept_advance_terms(uuid);

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
  if b.status <> 'confirmed' then raise exception 'booking_not_confirmed'; end if;
  if b.advance_terms_accepted_at is not null then return; end if;  -- idempotent

  -- Re-validate against the live ceilings: the quotation may have been drafted
  -- before an admin tightened them.
  v_max      := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::integer, 30);
  v_limit    := public.advance_rate_ceiling(b.advance_rate);

  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_limit) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_limit;
  end if;

  -- Resolving the fallback here rather than leaving the column null means the
  -- booking ends up carrying the exact rate the client was shown, instead of
  -- deferring to a setting an admin could edit between consent and payment.
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

  -- The vendor proposed one schedule and is being paid on another. Downward
  -- only, so it needs no approval — but it is a change to an agreed term, so
  -- it leaves a trail rather than happening invisibly.
  if v_rate is distinct from b.advance_rate then
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, before, after)
    values (auth.uid(), 'advance_rate_chosen_by_client', 'bookings', p_booking_id,
            jsonb_build_object('advance_rate', b.advance_rate),
            jsonb_build_object('advance_rate', v_rate, 'ceiling', v_limit));
  end if;
end;$$;
