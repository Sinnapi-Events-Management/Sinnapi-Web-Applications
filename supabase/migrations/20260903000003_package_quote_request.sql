-- =====================================================================
-- Sinnapi — 0903c Package quotes: pricing one, and asking for it
--
-- THE FORMULA NOW EXISTS IN FOUR PLACES, AND THIS IS THE FOURTH
--
-- 0902c's header already warns that `resolve_discount_amount`, `offerPricing.ts`
-- and `packagePricing.ts` must agree. This adds `price_package_tier`, and the
-- addition is what stops there being a fifth: `request_package_quotation`
-- below does no arithmetic of its own, and neither does `respond_package_
-- quotation` in 0903d — both call this. So the count of places the money is
-- COMPUTED stays at two in SQL (`send_quotation` for the vendor's own quotes,
-- this for a published tier), and they follow the identical five lines:
--
--     base   = Σ (quantity × unit_price)        over the tier's included lines
--     disc   = round(base × tier.discount_rate/100)
--     after  = base − disc
--     offer  = resolve_discount_amount(offer, after)
--     net    = after − offer
--     exclusive:  tax = round(net × rate/100)     total = net + tax
--     inclusive:  tax = round(net − net/(1+rate/100))
--                                                 total = net
--
-- Included lines only — `is_optional` add-ons are quoted alongside a tier and
-- never inside its total, which is the rule `packagePricing.ts` states and the
-- reason the number on the card is the number for that tier. A package quote
-- carries no add-ons at all: the client bought what was published.
--
-- Discount from the TIER, tax from the PACKAGE. Also `packagePricing.ts`'s
-- rule, and it is how vendors actually price — VAT status is a fact about the
-- business, a discount is a lever pulled on the one tier being pushed.
-- =====================================================================

create or replace function public.price_package_tier(
  p_template_id uuid,
  p_tier_id     uuid,
  p_discount_id uuid default null)
returns table (
  currency       text,
  base           numeric,
  discount_rate  numeric,
  discount_total numeric,
  offer_total    numeric,
  net            numeric,
  tax_rate       numeric,
  tax_inclusive  boolean,
  tax_total      numeric,
  total          numeric,
  line_count     integer)
language plpgsql stable security definer set search_path = public as $$
declare
  t      public.quote_templates;
  ti     public.quote_template_tiers;
  v_base  numeric := 0;
  v_lines integer := 0;
  v_disc  numeric := 0;
  v_after numeric := 0;
  v_offer numeric := 0;
  v_net   numeric := 0;
  v_tax   numeric := 0;
begin
  select * into t  from public.quote_templates       where id = p_template_id;
  select * into ti from public.quote_template_tiers  where id = p_tier_id;
  if t.id is null or ti.id is null or ti.template_id <> t.id then
    raise exception 'tier_not_in_package';
  end if;

  select coalesce(sum(round(coalesce(i.quantity, 1) * coalesce(i.unit_price, 0), 2)), 0),
         count(*)
    into v_base, v_lines
    from public.quote_template_items i
   where i.tier_id = p_tier_id and not i.is_optional;

  v_disc  := round(v_base * coalesce(ti.discount_rate, 0) / 100, 2);
  v_after := v_base - v_disc;

  if p_discount_id is not null then
    v_offer := public.resolve_discount_amount(p_discount_id, v_after);
  end if;

  v_net := v_after - v_offer;

  if coalesce(t.tax_inclusive, false) then
    v_tax := round(v_net - (v_net / (1 + coalesce(t.tax_rate, 0) / 100)), 2);
  else
    v_tax := round(v_net * coalesce(t.tax_rate, 0) / 100, 2);
  end if;

  return query select
    coalesce(t.currency, 'UGX'),
    v_base,
    coalesce(ti.discount_rate, 0),
    v_disc,
    v_offer,
    v_net,
    coalesce(t.tax_rate, 0),
    coalesce(t.tax_inclusive, false),
    v_tax,
    case when coalesce(t.tax_inclusive, false) then v_net else v_net + v_tax end,
    v_lines;
end;$$;

comment on function public.price_package_tier(uuid, uuid, uuid) is
  'What a published tier costs with an offer on it, computed from the tier''s own lines. The '
  'server-side twin of packagePricing.ts + offerPricing.ts; the one arithmetic behind both '
  'request_package_quotation and respond_package_quotation.';

grant execute on function public.price_package_tier(uuid, uuid, uuid) to authenticated;

-- =====================================================================
-- REQUESTING A PUBLISHED TIER AT ITS PUBLISHED PRICE
--
-- The difference from `request_quotation` in one sentence: that one records a
-- question, this one records an ORDER. The row it writes is fully priced, its
-- items are the tier's items, its offer's use is already reserved, and its
-- locks are set — so from the moment it exists, the only thing anyone can do
-- to the money is take more off it.
--
-- WHY THE PRICE IS COMPUTED HERE AND NEVER ACCEPTED FROM THE CALLER
-- There is no `p_total` and there will not be one. The browser has the same
-- figure on screen — `PackageShowcase` computed it through `packagePricing.ts`
-- before the client clicked — and sending it would be sending a total a
-- browser can edit into a column that flows into escrow. It is recomputed from
-- the tier rows instead, which is the same rule `send_quotation` follows and
-- for the same reason.
--
-- If the two disagree the client sees the server's number on the quotation
-- page, which is the correct outcome: the published tier is the offer, and a
-- stale card is a stale card.
--
-- WHY THE EVENT DATE IS MANDATORY HERE AND NOWHERE ELSE
-- The offer's eligibility depends on it (0903b), and a reservation is being
-- taken against a campaign in this very call. A request that reserved a use
-- without knowing whether the event even falls inside the campaign would be
-- spending the vendor's inventory on a booking that cannot legally use it.
--
-- THE OFFER IS RESERVED IMMEDIATELY, NOT AT APPROVAL
-- 0902c reserves at `send_quotation` because that is where the vendor commits.
-- Here the CLIENT is the one committing, so the reservation moves to match: a
-- client who has agreed to a price is holding the last use of a campaign, and
-- releasing it back to the pool while the vendor decides would let a second
-- client take it out from under an agreement already made. Every existing
-- release path still applies unchanged — declined, voided and the expiry cron
-- all reach `tg_quotation_offer_lifecycle`, which returns it.
-- =====================================================================
create or replace function public.request_package_quotation(
  p_vendor_id     uuid,
  p_template_id   uuid,
  p_tier_id       uuid,
  p_event_date    date,
  p_event_type_id uuid,
  p_details       text,
  p_discount_code text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
  v_code       text := nullif(btrim(coalesce(p_discount_code, '')), '');
  v_discount   uuid;
  v_reason     text;
  v_details    text := nullif(btrim(coalesce(p_details, '')), '');
  m            record;
  w            record;
begin
  if auth.uid() is null then perform public._forbidden(); end if;

  -- ---- WHO AND WHAT ----
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  if not public.quote_package_is_public(p_template_id)
     or not exists (select 1 from public.quote_templates t
                     where t.id = p_template_id and t.vendor_id = p_vendor_id) then
    raise exception 'package_unavailable';
  end if;

  if not exists (select 1 from public.quote_template_tiers ti
                  where ti.id = p_tier_id and ti.template_id = p_template_id) then
    raise exception 'tier_not_in_package';
  end if;

  -- ---- THE BRIEF ----
  -- Both required, and the length mirrors `quoteRequestSchema`. A vendor is
  -- being asked to commit their calendar to this in one click; "hi" is not a
  -- thing anyone can approve.
  if p_event_type_id is null
     or not exists (select 1 from public.event_types et
                     where et.id = p_event_type_id and et.is_active) then
    raise exception 'event_type_required';
  end if;

  if v_details is null or length(v_details) < 20 then raise exception 'details_required'; end if;
  if length(v_details) > 2000 then raise exception 'details_too_long'; end if;

  if p_event_date is null then raise exception 'event_date_required'; end if;
  if p_event_date < current_date then raise exception 'event_date_in_past'; end if;

  -- No `p_event_id`. A package quote is bought from a vendor's profile, where
  -- there is no event context, and attaching one would put a priced commitment
  -- inside a budget without ever running `assert_event_budget` against it.
  -- Sourcing a package into a planned event keeps going through
  -- `request_quotation`, which is guarded for it.

  -- ---- THE OFFER ----
  -- Resolved to an id, exactly as `request_quotation` does and for the reason
  -- stated there: storing the string would re-resolve it later against a table
  -- the vendor may have edited underneath.
  if v_code is not null then
    select d.id into v_discount
      from public.discounts d
     where upper(d.code) = upper(v_code) and d.deleted_at is null
     order by d.created_at desc
     limit 1;
    if v_discount is null then raise exception 'discount_not_found'; end if;
  end if;

  -- The base has to exist before the offer can be judged against it, because
  -- `min_amount` is a question about the subtotal. Priced once with no offer,
  -- then again with the one that survived validation.
  select * into m from public.price_package_tier(p_template_id, p_tier_id, null);
  if m.line_count = 0 then raise exception 'package_unavailable'; end if;

  if v_discount is null then
    v_discount := public.best_automatic_discount(
      p_template_id, p_tier_id, m.net, m.base, auth.uid());
  end if;

  if v_discount is not null then
    -- Serialises against every other send or request that could spend this
    -- offer's last use. 0902c takes the same lock at the same point, after the
    -- cheap validations, so the common path holds it for one insert.
    perform 1 from public.discounts where id = v_discount for update;

    v_reason := public.discount_block_reason(
      v_discount, p_vendor_id, p_template_id, p_tier_id, m.base, auth.uid());

    if v_reason is null then
      v_reason := public.discount_date_block_reason(v_discount, p_event_date);
    end if;

    if v_reason is not null then
      -- Raised, never dropped. `send_quotation` drops an inherited offer
      -- rather than stranding a vendor who cannot fix someone else's campaign
      -- deadline — but here the CLIENT is standing at the button that
      -- advertised the saving, and quietly charging them the undiscounted
      -- price is the one outcome nobody would defend.
      if v_reason in ('event_before_window', 'event_after_window') then
        select * into w from public.discount_event_window(v_discount);
        raise exception 'offer_date_unavailable: % (% to %)', v_reason, w.starts_on, w.ends_on;
      end if;
      raise exception 'discount_unavailable: %', v_reason;
    end if;

    -- Re-priced WITH the offer now that it is known to apply.
    select * into m from public.price_package_tier(p_template_id, p_tier_id, v_discount);
  end if;

  -- ---- THE ROW ----
  -- `valid_until` is left null on purpose. The expiry cron reads it, and this
  -- quote is not an offer with a shelf life — it is the client's standing
  -- agreement, waiting on the vendor. It ends when the vendor answers, when
  -- the client voids it, or when the event date passes.
  for i in 1 .. 8 loop
    begin
      insert into public.quotations(
        vendor_id, client_id, status, currency, request_details,
        template_id, template_tier_id, event_date, event_type_id,
        quote_origin, subtotal, discount_total, offer_discount_total,
        tax_total, total, discount_rate, tax_rate, tax_inclusive,
        offer_discount_id, offer_discount_code,
        locked_subtotal, locked_discount_floor)
      values (p_vendor_id, auth.uid(), 'requested', m.currency, v_details,
              p_template_id, p_tier_id, p_event_date, p_event_type_id,
              'package', m.base, m.discount_total, m.offer_total,
              m.tax_total, m.total, m.discount_rate, m.tax_rate, m.tax_inclusive,
              v_discount, v_code,
              m.base, m.discount_total + m.offer_total)
      returning id into v_id;
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  if v_id is null then
    raise exception 'reference_generation_failed: quotations' using errcode = '23505';
  end if;

  -- ---- THE LINES ----
  -- Copied, not referenced. A quotation is a record of an offer as it stood
  -- (0823b's reasoning for storing the rates beside the totals), and a vendor
  -- who edits the package next month must not change what this client bought.
  -- The flag is what gets past `tg_package_quote_items_locked`; transaction-
  -- scoped, and cleared immediately so nothing later in this call inherits it.
  perform set_config('sinnapi.package_quote_write', 'on', true);

  insert into public.quotation_items(
    quotation_id, description, quantity, unit_price, line_total, sort_order)
  select v_id,
         i.description,
         coalesce(i.quantity, 1),
         coalesce(i.unit_price, 0),
         round(coalesce(i.quantity, 1) * coalesce(i.unit_price, 0), 2),
         i.sort_order
    from public.quote_template_items i
   where i.tier_id = p_tier_id and not i.is_optional
   order by i.sort_order;

  perform set_config('sinnapi.package_quote_write', 'off', true);

  -- ---- THE RESERVATION ----
  if v_discount is not null then
    perform public._reserve_quotation_offer(v_id, v_discount, m.offer_total);
  end if;

  return v_id;
end;$$;

comment on function public.request_package_quotation(uuid, uuid, uuid, date, uuid, text, text) is
  'Buys a published tier at its published price. Writes a fully priced quotation the vendor '
  'approves or declines — the reverse of request_quotation, where the vendor prices and the '
  'client accepts. The total is computed here and never accepted from the caller.';

grant execute on function
  public.request_package_quotation(uuid, uuid, uuid, date, uuid, text, text)
to authenticated;
