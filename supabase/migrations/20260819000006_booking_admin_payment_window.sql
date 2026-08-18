-- =====================================================================
-- Sinnapi — the booking payment window, step 6: the console's booking read.
--
-- `get_booking_admin` is the single call behind the admin booking page, and it
-- did not carry the payment clock — so the one screen an operator opens when a
-- vendor rings up about an unpaid booking could show them everything except
-- the deadline the call is about.
--
-- Re-declared in full because that is the only way to change a function body in
-- Postgres. Everything is byte-identical to the version in
-- 20260817000001_payment_terms.sql except the new `payment_window` block and
-- the extension author it resolves to a name.
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

    -- ---------------------------------------------------------------
    -- The payment clock.
    --
    -- Nested rather than spread across the top level because it is one
    -- coherent thing an operator reasons about together, and because it is
    -- absent on most bookings — an off-platform booking has no clock, and
    -- neither does one nobody has confirmed. A null object says that in one
    -- check; eight independently-null columns say it eight times.
    --
    -- `effective_due_at` is resolved here rather than left to the browser, for
    -- the same reason it is resolved in the queue: the precedence between the
    -- original deadline and an admin's extension is a rule, and a rule that
    -- lives in three clients is three rules.
    -- ---------------------------------------------------------------
    'payment_window', case when b.payment_window_opened_at is null then null else jsonb_build_object(
      'opened_at',        b.payment_window_opened_at,
      'due_at',           b.payment_due_at,
      'override_at',      b.payment_due_override_at,
      'override_reason',  b.payment_due_override_reason,
      'override_by',      ovr.full_name,
      'effective_due_at', public.booking_payment_deadline(b),
      'overdue_at',       b.payment_overdue_at,
      'settled_at',       b.payment_settled_at,
      'last_nudge_at',    b.last_payment_nudge_at,
      'nudge_count',      b.payment_nudge_count) end,

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
      'attempt_no',             esc.attempt_no,
      'failure_reason',         esc.failure_reason,
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
  left join public.profiles ovr  on ovr.id  = b.payment_due_override_by
  where b.id = p_booking_id and b.deleted_at is null;

  if v_doc is null then raise exception 'not_found'; end if;
  return v_doc;
end;$$;

grant execute on function public.get_booking_admin(uuid) to authenticated;
