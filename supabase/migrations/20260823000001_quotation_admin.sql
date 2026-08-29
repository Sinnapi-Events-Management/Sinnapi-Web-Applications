-- =====================================================================
-- QUOTATION ADMIN — one quotation, whole, for the console's detail page.
--
-- Why this exists at all: the console could list quotations but never open
-- one. `quotations_read` grants `quotations.read` a select on the header, and
-- `q_hist_read` grants it the status trail — but `q_items_rw` does not. That
-- policy is `for all` and its `using` clause names only the client and the
-- vendor owner, so an operations admin reading a quotation saw a reference, a
-- status and a total with nothing behind them. The one existing path to line
-- items, `get_event_quotation`, is gated on `events.manage` and returns a
-- document shaped for the PDF export: no advance terms, no party ids, no
-- version. Neither the gate nor the payload fits a quotation oversight page.
--
-- SECURITY DEFINER with the permission checked in the body, rather than
-- widening `q_items_rw` to `quotations.read`. The difference matters: a policy
-- change would hand every operations admin an open-ended select on
-- `quotation_items`, joinable from anywhere, forever. This discloses one
-- quotation at a time, named by id, through a function whose whole payload is
-- reviewable in one place.
--
-- Read-only, and there is no companion write. `quotations_update` names only
-- the client and the vendor owner, and that is deliberate — a quote is an offer
-- between two parties and the console does not get to edit one. Anything the
-- console legitimately needs to do to a quotation goes through the lifecycle
-- RPCs, which do their own gating.
-- =====================================================================

create or replace function public.get_quotation_admin(p_quotation_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_doc jsonb;
begin
  if not public.has_permission('quotations.read') then perform public._forbidden(); end if;

  select jsonb_build_object(
    'id',                          q.id,
    'reference_no',                q.reference_no,
    'status',                      q.status,
    'currency',                    q.currency,
    'subtotal',                    q.subtotal,
    'discount_total',              q.discount_total,
    'tax_total',                   q.tax_total,
    'total',                       q.total,
    'valid_until',                 q.valid_until,
    'request_details',             q.request_details,
    'version_no',                  q.version_no,
    'sent_at',                     q.sent_at,
    'responded_at',                q.responded_at,
    'created_at',                  q.created_at,

    -- The terms the vendor proposed with this quote. Carried to the booking on
    -- acceptance, so an operator asked why an advance released when it did is
    -- reading the origin of that schedule here.
    'advance_rate',                q.advance_rate,
    'advance_release_days_before', q.advance_release_days_before,
    'advance_terms_note',          q.advance_terms_note,

    -- Contact details on both parties, matching `get_booking_admin`. An
    -- operator opening a quotation is working a support thread about it, and
    -- the reason they need the record is to reach whoever is on the other end
    -- of it.
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
      'id',         ev.id,
      'title',      ev.title,
      'event_date', ev.event_date) end,

    -- Same line shape as `get_event_quotation` and the `quotation` block of
    -- `get_booking_admin`, so `QuotationLineItems` renders all three unchanged.
    -- An operator arguing about a figure with a vendor should be looking at the
    -- screen the vendor is describing.
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'description', qi.description,
               'quantity',    qi.quantity,
               'unit_price',  qi.unit_price,
               'line_total',  qi.line_total)
             order by qi.sort_order)
      from public.quotation_items qi where qi.quotation_id = q.id), '[]'::jsonb)
  )
  into v_doc
  from public.quotations q
  join public.vendors  vend on vend.id = q.vendor_id
  join public.profiles vown on vown.id = vend.owner_id
  join public.profiles cli  on cli.id  = q.client_id
  left join public.events ev on ev.id = q.event_id
  where q.id = p_quotation_id
    and q.deleted_at is null;

  -- `null` rather than an exception: a deleted or unknown id is a page the
  -- console renders an empty state for, not a failure to surface as an error.
  return v_doc;
end $$;

grant execute on function public.get_quotation_admin(uuid) to authenticated;
