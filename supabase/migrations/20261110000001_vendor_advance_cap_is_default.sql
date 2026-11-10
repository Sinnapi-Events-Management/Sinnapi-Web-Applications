-- ============================================================================
-- The vendor's advance cap is `advance_rate_default`, not `advance_rate_max`.
--
-- Two settings, two audiences:
--   advance_rate_default   the most a VENDOR may propose up front on a
--                          quotation or package (send_quotation,
--                          save_quote_package). The vendor portal's form
--                          enforces the same number before it gets here.
--   advance_rate_max       the most a CLIENT may choose to release before the
--                          event at checkout (advance_rate_ceiling,
--                          accept_advance_terms). Unchanged.
--
-- Both functions are re-created verbatim from their latest definitions
-- (send_quotation: 20260902000003, save_quote_package: 20260823000003); the
-- only line that differs is the one reading the cap. Grants survive
-- `create or replace` on the same signature.
--
-- Fallback 30 when the row is missing: the value the setting was seeded with
-- (0809a), and what the vendor portal falls back to.
-- ============================================================================

create or replace function public.vendor_advance_rate_max()
returns numeric language sql stable security definer set search_path = public as $$
  select least(
    coalesce((public.get_setting('advance_rate_default') #>> '{}')::numeric, 30),
    100);
$$;

comment on function public.vendor_advance_rate_max() is
  'The most a vendor may propose as an advance on a quotation or package: '
  'platform_settings.advance_rate_default. Clients are capped separately by '
  'advance_rate_ceiling (advance_rate_max).';

grant execute on function public.vendor_advance_rate_max() to authenticated;

create or replace function public.send_quotation(
  p_quotation_id     uuid,
  p_items            jsonb,
  p_valid_days       int     default null,
  p_advance_rate     numeric default null,
  p_advance_release_days_before int default null,
  p_advance_terms_note text  default null,
  p_template_id      uuid    default null,
  p_template_tier_id uuid    default null,
  p_discount_rate    numeric default null,
  p_tax_rate         numeric default null,
  p_tax_inclusive    boolean default null,
  p_offer_discount_id uuid   default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q          public.quotations;
  it         jsonb;
  v_base     numeric := 0;
  v_disc     numeric := 0;
  v_after    numeric := 0;
  v_offer    numeric := 0;
  v_net      numeric := 0;
  v_tax      numeric := 0;
  v_total    numeric := 0;
  v_days     int;
  v_max_rate numeric;
  v_max_days int;
  v_dr       numeric := coalesce(p_discount_rate, 0);
  v_tr       numeric := coalesce(p_tax_rate, 0);
  v_ti       boolean := coalesce(p_tax_inclusive, false);
  v_offer_id uuid;
  v_explicit boolean := p_offer_discount_id is not null;
  v_reason   text;
  v_tpl      uuid;
  v_tier     uuid;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(q.vendor_id) then perform public._forbidden(); end if;

  v_max_rate := public.vendor_advance_rate_max();
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::int, 30);

  if p_advance_rate is not null and (p_advance_rate < 0 or p_advance_rate > v_max_rate) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_max_rate;
  end if;
  if p_advance_release_days_before is not null
     and (p_advance_release_days_before < 0 or p_advance_release_days_before > v_max_days) then
    raise exception 'advance_release_days_out_of_range: must be between 0 and %', v_max_days;
  end if;
  if v_dr < 0 or v_dr > 100 then raise exception 'discount_rate_out_of_range'; end if;
  if v_tr < 0 or v_tr > 100 then raise exception 'tax_rate_out_of_range'; end if;

  if p_template_id is not null
     and not exists (select 1 from public.quote_templates t
                      where t.id = p_template_id and t.vendor_id = q.vendor_id and t.deleted_at is null) then
    raise exception 'package_not_found';
  end if;
  if p_template_tier_id is not null
     and not exists (select 1 from public.quote_template_tiers ti
                      where ti.id = p_template_tier_id and ti.template_id = p_template_id) then
    raise exception 'tier_not_in_package';
  end if;

  -- The package this quote is FOR, after this call: what was passed, else what
  -- the row already carries. The offer is validated against this pair, so a
  -- vendor switching the quote to a different package has the offer re-checked
  -- against the new one rather than against the client's original request.
  v_tpl  := coalesce(p_template_id,      q.template_id);
  v_tier := coalesce(p_template_tier_id, q.template_tier_id);

  delete from public.quotation_items where quotation_id = p_quotation_id;
  for it in select * from jsonb_array_elements(p_items) loop
    insert into public.quotation_items(quotation_id, description, quantity, unit_price, line_total)
    values (p_quotation_id, it->>'description',
            coalesce((it->>'quantity')::numeric,1), coalesce((it->>'unit_price')::numeric,0),
            coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0));
    v_base := v_base + coalesce((it->>'quantity')::numeric,1) * coalesce((it->>'unit_price')::numeric,0);
  end loop;

  v_disc  := round(v_base * v_dr / 100, 2);
  v_after := v_base - v_disc;

  -- ---- THE OFFER ----
  -- Explicit beats the client's choice beats an automatic one. A vendor
  -- passing an id is instructing; the client's code is a request the vendor is
  -- answering; an automatic offer is the platform keeping a promise it made on
  -- the package card, and it must not override either of the other two.
  v_offer_id := coalesce(p_offer_discount_id, q.offer_discount_id);
  if v_offer_id is null and v_tpl is not null then
    v_offer_id := public.best_automatic_discount(v_tpl, v_tier, v_after, v_base, q.client_id);
  end if;

  if v_offer_id is not null then
    -- Serialise every concurrent send that could spend this offer's last use.
    perform 1 from public.discounts where id = v_offer_id for update;

    v_reason := public.discount_block_reason(
      v_offer_id, q.vendor_id, v_tpl, v_tier, v_base, q.client_id);

    -- A use this quote already holds is not a use standing in its own way.
    if v_reason = 'exhausted'
       and exists (select 1 from public.discount_redemptions r
                    where r.quotation_id = p_quotation_id
                      and r.discount_id = v_offer_id
                      and r.status in ('reserved', 'redeemed')) then
      v_reason := null;
    end if;

    if v_reason is not null then
      if v_explicit then raise exception 'discount_unavailable: %', v_reason; end if;
      -- Inherited or automatic: drop it and price the quote without it. See
      -- the header — the vendor must not be stranded by a campaign deadline.
      v_offer_id := null;
    end if;
  end if;

  if v_offer_id is not null then
    v_offer := public.resolve_discount_amount(v_offer_id, v_after);
  end if;

  v_net := v_after - v_offer;
  if v_ti then
    v_tax   := round(v_net - (v_net / (1 + v_tr / 100)), 2);
    v_total := v_net;
  else
    v_tax   := round(v_net * v_tr / 100, 2);
    v_total := v_net + v_tax;
  end if;

  v_days := coalesce(p_valid_days, (public.get_setting('quote_expiry_days') #>> '{}')::int, 14);

  update public.quotations
     set status = 'sent',
         subtotal       = v_base,
         discount_total = v_disc,
         tax_total      = v_tax,
         total          = v_total,
         discount_rate  = v_dr,
         tax_rate       = v_tr,
         tax_inclusive  = v_ti,
         offer_discount_id    = v_offer_id,
         offer_discount_total = v_offer,
         template_id      = coalesce(p_template_id, template_id),
         template_tier_id = coalesce(p_template_tier_id, template_tier_id),
         sent_at = now(),
         valid_until = now() + make_interval(days => v_days),
         advance_rate = coalesce(p_advance_rate,
                                 (public.get_setting('advance_rate_default') #>> '{}')::numeric),
         advance_release_days_before = coalesce(p_advance_release_days_before,
                                 (public.get_setting('advance_release_days_default') #>> '{}')::int),
         advance_terms_note = p_advance_terms_note
   where id = p_quotation_id;

  -- After the update, so the reservation reads the package and tier this quote
  -- now carries rather than the ones it arrived with.
  perform public._reserve_quotation_offer(p_quotation_id, v_offer_id, v_offer);
end;$$;

create or replace function public.save_quote_package(
  p_vendor_id uuid,
  p_package   jsonb,
  p_tiers     jsonb,
  p_add_ons   jsonb default '[]'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id          uuid := nullif(p_package->>'id', '')::uuid;
  v_tier        jsonb;
  v_tier_id     uuid;
  v_keep        uuid[] := '{}';
  v_recommended uuid;
  v_max_rate    numeric;
  v_max_days    int;
  v_tax_rate    numeric := coalesce((p_package->>'tax_rate')::numeric, 0);
  v_adv_rate    numeric := nullif(p_package->>'advance_rate', '')::numeric;
  v_adv_days    int     := nullif(p_package->>'advance_release_days_before', '')::int;
  v_service_id  uuid    := nullif(p_package->>'vendor_service_id', '')::uuid;
  v_model       public.pricing_model
                        := nullif(p_package->>'pricing_model', '')::public.pricing_model;
  v_offered     public.pricing_model[];
  v_idx         int := 0;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.is_vendor_owner(p_vendor_id) then perform public._forbidden(); end if;

  if nullif(btrim(coalesce(p_package->>'name', '')), '') is null then
    raise exception 'package_name_required';
  end if;
  if jsonb_typeof(p_tiers) is distinct from 'array' or jsonb_array_length(p_tiers) = 0 then
    raise exception 'package_needs_a_tier';
  end if;
  if v_tax_rate < 0 or v_tax_rate > 100 then
    raise exception 'tax_rate_out_of_range: must be between 0 and 100';
  end if;
  if v_model is null then
    raise exception 'package_pricing_model_required';
  end if;

  -- The linked service must be this vendor's own. Without the check a vendor
  -- could hang their package off a competitor's service id and inherit its
  -- category on the public profile.
  if v_service_id is not null then
    select s.pricing_models
      into v_offered
      from public.vendor_services s
     where s.id = v_service_id
       and s.vendor_id = p_vendor_id
       and s.deleted_at is null;
    if not found then
      raise exception 'service_not_found';
    end if;
    if cardinality(v_offered) > 0 and not (v_model = any(v_offered)) then
      raise exception 'pricing_model_not_offered: %', v_model;
    end if;
  end if;

  -- The advance ceilings are the platform's, checked here for the same reason
  -- `send_quotation` checks them: a package pre-fills the builder, and a
  -- package holding an illegal rate would put one in front of the vendor.
  v_max_rate := public.vendor_advance_rate_max();
  v_max_days := coalesce((public.get_setting('advance_release_days_max') #>> '{}')::int, 30);
  if v_adv_rate is not null and (v_adv_rate < 0 or v_adv_rate > v_max_rate) then
    raise exception 'advance_rate_out_of_range: must be between 0 and %', v_max_rate;
  end if;
  if v_adv_days is not null and (v_adv_days < 0 or v_adv_days > v_max_days) then
    raise exception 'advance_release_days_out_of_range: must be between 0 and %', v_max_days;
  end if;

  -- ---- header ----
  if v_id is null then
    insert into public.quote_templates(
      vendor_id, name, summary, notes, currency, cover_image_url, vendor_service_id, category_id,
      pricing_model, inclusions, exclusions, lead_time_days, tax_rate, tax_inclusive, valid_days,
      advance_rate, advance_release_days_before, advance_terms_note, is_active, sort_order)
    values (
      p_vendor_id,
      btrim(p_package->>'name'),
      nullif(btrim(coalesce(p_package->>'summary', '')), ''),
      nullif(btrim(coalesce(p_package->>'notes', '')), ''),
      coalesce(nullif(p_package->>'currency', ''), 'UGX'),
      nullif(btrim(coalesce(p_package->>'cover_image_url', '')), ''),
      v_service_id,
      nullif(p_package->>'category_id', '')::uuid,
      v_model,
      coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'inclusions', '[]'::jsonb))), '{}'::text[]),
      coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'exclusions', '[]'::jsonb))), '{}'::text[]),
      nullif(p_package->>'lead_time_days', '')::int,
      v_tax_rate,
      coalesce((p_package->>'tax_inclusive')::boolean, false),
      nullif(p_package->>'valid_days', '')::int,
      v_adv_rate, v_adv_days,
      nullif(btrim(coalesce(p_package->>'advance_terms_note', '')), ''),
      coalesce((p_package->>'is_active')::boolean, true),
      coalesce((p_package->>'sort_order')::int, 0))
    returning id into v_id;
  else
    update public.quote_templates set
      name              = btrim(p_package->>'name'),
      summary           = nullif(btrim(coalesce(p_package->>'summary', '')), ''),
      notes             = nullif(btrim(coalesce(p_package->>'notes', '')), ''),
      currency          = coalesce(nullif(p_package->>'currency', ''), currency),
      cover_image_url   = nullif(btrim(coalesce(p_package->>'cover_image_url', '')), ''),
      vendor_service_id = v_service_id,
      category_id       = nullif(p_package->>'category_id', '')::uuid,
      pricing_model     = v_model,
      inclusions        = coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'inclusions', '[]'::jsonb))), '{}'::text[]),
      exclusions        = coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(p_package->'exclusions', '[]'::jsonb))), '{}'::text[]),
      lead_time_days    = nullif(p_package->>'lead_time_days', '')::int,
      tax_rate          = v_tax_rate,
      tax_inclusive     = coalesce((p_package->>'tax_inclusive')::boolean, false),
      valid_days        = nullif(p_package->>'valid_days', '')::int,
      advance_rate      = v_adv_rate,
      advance_release_days_before = v_adv_days,
      advance_terms_note = nullif(btrim(coalesce(p_package->>'advance_terms_note', '')), ''),
      is_active         = coalesce((p_package->>'is_active')::boolean, is_active),
      sort_order        = coalesce((p_package->>'sort_order')::int, sort_order)
    where id = v_id and vendor_id = p_vendor_id and deleted_at is null;
    if not found then raise exception 'not_found'; end if;
  end if;

  -- Cleared up front so the partial unique index cannot trip while the tiers
  -- are half-written; the winner is set once at the end.
  update public.quote_template_tiers set is_recommended = false where template_id = v_id;

  -- ---- tiers ----
  for v_tier in select * from jsonb_array_elements(p_tiers) loop
    if nullif(btrim(coalesce(v_tier->>'name', '')), '') is null then
      raise exception 'tier_name_required';
    end if;

    v_tier_id := nullif(v_tier->>'id', '')::uuid;

    if v_tier_id is null then
      insert into public.quote_template_tiers(template_id, name, description, discount_rate, sort_order)
      values (v_id, btrim(v_tier->>'name'),
              nullif(btrim(coalesce(v_tier->>'description', '')), ''),
              coalesce((v_tier->>'discount_rate')::numeric, 0),
              v_idx)
      returning id into v_tier_id;
    else
      update public.quote_template_tiers set
        name          = btrim(v_tier->>'name'),
        description   = nullif(btrim(coalesce(v_tier->>'description', '')), ''),
        discount_rate = coalesce((v_tier->>'discount_rate')::numeric, 0),
        sort_order    = v_idx
      where id = v_tier_id and template_id = v_id;
      if not found then raise exception 'tier_not_found'; end if;
    end if;

    v_keep := v_keep || v_tier_id;
    if coalesce((v_tier->>'is_recommended')::boolean, false) then v_recommended := v_tier_id; end if;

    delete from public.quote_template_items where tier_id = v_tier_id;

    insert into public.quote_template_items(
      template_id, tier_id, description, quantity, unit_price, unit_label, notes, is_optional, sort_order)
    select v_id, v_tier_id,
           btrim(item->>'description'),
           coalesce((item->>'quantity')::numeric, 1),
           coalesce((item->>'unit_price')::numeric, 0),
           nullif(btrim(coalesce(item->>'unit_label', '')), ''),
           nullif(btrim(coalesce(item->>'notes', '')), ''),
           coalesce((item->>'is_optional')::boolean, false),
           (ord - 1)::int
      from jsonb_array_elements(coalesce(v_tier->'items', '[]'::jsonb)) with ordinality as t(item, ord)
     where nullif(btrim(coalesce(item->>'description', '')), '') is not null;

    if not exists (select 1 from public.quote_template_items
                    where tier_id = v_tier_id and not is_optional) then
      raise exception 'tier_needs_a_line: %', v_tier->>'name';
    end if;

    v_idx := v_idx + 1;
  end loop;

  -- Tiers the vendor removed in this edit. Their lines go with them by
  -- cascade; quotes that were built from them keep their own copied items and
  -- lose only the back-reference, which is what `on delete set null` is for.
  delete from public.quote_template_tiers
   where template_id = v_id and not (id = any(v_keep));

  if v_recommended is not null then
    update public.quote_template_tiers set is_recommended = true where id = v_recommended;
  end if;

  -- ---- shared add-ons (tier_id null) ----
  delete from public.quote_template_items where template_id = v_id and tier_id is null;

  insert into public.quote_template_items(
    template_id, tier_id, description, quantity, unit_price, unit_label, notes, is_optional, sort_order)
  select v_id, null::uuid,
         btrim(item->>'description'),
         coalesce((item->>'quantity')::numeric, 1),
         coalesce((item->>'unit_price')::numeric, 0),
         nullif(btrim(coalesce(item->>'unit_label', '')), ''),
         nullif(btrim(coalesce(item->>'notes', '')), ''),
         true,
         (ord - 1)::int
    from jsonb_array_elements(coalesce(p_add_ons, '[]'::jsonb)) with ordinality as t(item, ord)
   where nullif(btrim(coalesce(item->>'description', '')), '') is not null;

  return v_id;
end;$$;

update public.platform_settings
   set description = 'The most a vendor may ask for up front, as a percentage of the booking. '
                  || 'Vendors cannot enter a higher advance on a quotation or package. '
                  || 'New quotations still start at 30%.'
 where key = 'advance_rate_default';

update public.platform_settings
   set description = 'The most a client may choose to release before the event, as a percentage, '
                  || 'at checkout. Vendors are capped separately by advance_rate_default.'
 where key = 'advance_rate_max';
