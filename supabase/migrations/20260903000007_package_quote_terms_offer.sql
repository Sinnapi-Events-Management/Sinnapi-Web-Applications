-- =====================================================================
-- Sinnapi — 0903g The approval panel needs the offer's own terms
--
-- WHY
-- `package_quote_terms` (0903d) tells the vendor what the order is locked to,
-- and the approval dialog lets them deepen the discount. It could not tell them
-- what deepening it would DO, because a new tier rate does not move the total by
-- a predictable amount:
--
--   * a PERCENTAGE offer sits on the post-tier-discount net, so raising the tier
--     rate shrinks the offer underneath it,
--   * a FIXED offer does not move at all until it caps out against the net,
--   * `max_discount_amount` can be the thing deciding either of them,
--   * and tax is recomputed on whatever is left.
--
-- So the dialog previewed the vendor's own discount LINE instead, which was
-- honest but useless — a vendor deciding whether to give 5% more wants to know
-- what the client ends up paying, not what one intermediate row reads.
--
-- WHAT THIS ADDS, AND WHY IN THE BROWSER RATHER THAN A PREVIEW RPC
-- The offer's type, value and cap, plus the package's tax. With those, the
-- vendor portal can price a candidate rate using `offerSaving` from
-- `@sinnapi/ui/offers` — which mirrors `resolve_discount_amount` clause for
-- clause and exists precisely so a browser can price an offer without a round
-- trip per keystroke. That is already how the CLIENT's order dialog shows the
-- price before ordering; the vendor's approval dialog now uses the same
-- arithmetic on the same inputs, so the two sides of one deal cannot show two
-- different numbers.
--
-- A `preview_package_quote_total(id, rate)` RPC was the alternative. Rejected:
-- it is a round trip on every keystroke of a field most vendors will never
-- open, to re-derive something three existing implementations already agree on.
--
-- Dropped and recreated because a `returns table` signature IS the return type
-- and `create or replace` cannot change one.
-- =====================================================================

drop function if exists public.package_quote_terms(uuid);

create or replace function public.package_quote_terms(p_quotation_id uuid)
returns table (
  currency              text,
  locked_subtotal       numeric,
  locked_discount_floor numeric,
  current_discount      numeric,
  current_total         numeric,
  discount_rate         numeric,
  min_discount_rate     numeric,
  offer_discount_id     uuid,
  offer_total           numeric,
  -- The offer's own terms, so a candidate rate can be priced without asking.
  -- Null throughout when the order carries no offer, which is the case where
  -- the arithmetic is simply base − tier discount + tax.
  offer_type            text,
  offer_value           numeric,
  offer_max_discount_amount numeric,
  -- The package's tax, as stored on the quotation rather than re-read from the
  -- template: a vendor who changes their VAT rate must not change the
  -- arithmetic on an order a client already placed. Same rule 0823b applies.
  tax_rate              numeric,
  tax_inclusive         boolean,
  event_date            date,
  event_address         text,
  offer_starts_on       date,
  offer_ends_on         date,
  package_changed       boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  q public.quotations;
  d public.discounts;
  m record;
  w record;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.id is null then return; end if;
  if not (q.client_id = auth.uid() or public.is_vendor_owner(q.vendor_id) or public.is_admin())
    then perform public._forbidden(); end if;
  if q.quote_origin is distinct from 'package' then return; end if;

  select * into m from public.price_package_tier(
    q.template_id, q.template_tier_id, q.offer_discount_id);
  select * into w from public.discount_event_window(q.offer_discount_id);

  -- Read directly rather than through `quotation_offer`: that one is shaped for
  -- describing an offer to a reader and omits the cap, which is exactly the
  -- term that makes a browser-side projection wrong when it bites.
  if q.offer_discount_id is not null then
    select * into d from public.discounts where id = q.offer_discount_id;
  end if;

  return query select
    coalesce(q.currency, 'UGX'),
    q.locked_subtotal,
    q.locked_discount_floor,
    round(coalesce(q.discount_total, 0) + coalesce(q.offer_discount_total, 0), 2),
    coalesce(q.total, 0),
    coalesce(q.discount_rate, 0),
    -- The floor as a percentage the vendor's field can take as its `min`, and
    -- it is simply the rate the client was quoted. See 0903d for the algebra.
    coalesce(q.discount_rate, 0),
    q.offer_discount_id,
    coalesce(q.offer_discount_total, 0),
    d.type::text,
    d.value,
    d.max_discount_amount,
    coalesce(q.tax_rate, 0),
    coalesce(q.tax_inclusive, false),
    q.event_date,
    q.event_address,
    w.starts_on,
    w.ends_on,
    round(coalesce(m.base, 0), 2) <> round(coalesce(q.locked_subtotal, 0), 2);
end;$$;

grant execute on function public.package_quote_terms(uuid) to authenticated;
