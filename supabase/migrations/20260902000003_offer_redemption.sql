-- =====================================================================
-- Sinnapi — 0902c Offers: putting one on a quote, and spending it
--
-- 0902a gave an offer a target and the ledger a lifecycle. 0902b priced one.
-- This file is the only place either becomes money.
--
-- THE THREE POINTS OF CONTACT, AND WHY THEY ARE THESE THREE
--
--   request_quotation   The client names the offer. This is the ONLY place a
--                       client's own choice of offer is recorded, and it is
--                       recorded as an id resolved from their code — never as
--                       a rate, never as an amount. A client stating a saving
--                       is a client stating a price.
--
--   send_quotation      The vendor commits. Everything is re-derived here from
--                       the offer row and the items as sent: the code is
--                       re-validated, the saving is recomputed, the use is
--                       RESERVED. Nothing that arrived from a browser
--                       contributes to `total`, because `total` flows into
--                       escrow.
--
--   a status trigger    The use is spent or returned. Not a fourth RPC: quotes
--                       reach their end state through `respond_quotation`,
--                       `void_quotation` AND the hourly `sinnapi_quote_expiry`
--                       cron, and a rule implemented in the two RPCs would
--                       leak a reservation every time a quote simply lapsed.
--                       One trigger on the column that actually changes covers
--                       all three by construction.
--
-- WHY THE VENDOR CANNOT BE BLOCKED BY THE CLIENT'S CODE
-- An offer that has expired between the request and the send is dropped from
-- the quote rather than raised on it. The vendor is answering a client; making
-- their send fail because of a campaign deadline they may not even own would
-- strand the conversation over something the vendor cannot fix from that
-- screen. The vendor portal shows the offer's state before they send, which is
-- where a person can act on it. An offer the vendor passes EXPLICITLY does
-- raise — that one is their own instruction, and silently ignoring an
-- instruction is worse than refusing it.
--
-- WHAT THIS FILE DOES NOT TOUCH
-- `respond_quotation`, `void_quotation` and `create_booking_from_quotation`
-- keep the bodies 0901e and 0820c left them with. Every one of them is long,
-- guarded and load-bearing, and re-issuing three of them to add a line each is
-- three chances to lose a guard. The trigger reaches all of them from outside.
-- =====================================================================

-- ---------------------------------------------------------------------
-- RESERVE / RELEASE, as one internal entry point
--
-- Both directions in one function because they are one invariant: a quotation
-- has at most one live claim, and moving it is a delete-then-insert that must
-- not be able to half-happen. `ux_redemption_live_per_quotation` enforces the
-- invariant; this is what respects it.
--
-- Not granted to anybody. It is called by `send_quotation` and by the trigger,
-- both of which have already decided who is allowed to be here.
-- ---------------------------------------------------------------------
create or replace function public._reserve_quotation_offer(
  p_quotation_id uuid,
  p_discount_id  uuid,
  p_amount       numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  q public.quotations;
begin
  select * into q from public.quotations where id = p_quotation_id;
  if q.id is null then raise exception 'not_found'; end if;

  -- Any live claim this quote holds on a DIFFERENT offer is returned to the
  -- pool first. A vendor re-pricing a quote onto another campaign must not
  -- leave the first campaign short a use forever.
  update public.discount_redemptions
     set status = 'released', released_at = now(), release_reason = 'requote'
   where quotation_id = p_quotation_id
     and status in ('reserved', 'redeemed')
     and (p_discount_id is null or discount_id <> p_discount_id);

  if p_discount_id is null then return; end if;

  -- The live row for this offer, if the quote already holds one. Updated
  -- rather than re-inserted so a re-send moves the amount without spending a
  -- second use.
  update public.discount_redemptions
     set amount_applied = coalesce(p_amount, 0),
         template_id    = q.template_id,
         tier_id        = q.template_tier_id,
         status         = 'reserved',
         reserved_at    = now(),
         released_at    = null,
         release_reason = null
   where quotation_id = p_quotation_id
     and discount_id  = p_discount_id
     and status in ('reserved', 'redeemed');

  if found then return; end if;

  insert into public.discount_redemptions(
    discount_id, quotation_id, redeemed_by, amount_applied,
    vendor_id, template_id, tier_id, status, reserved_at)
  values (p_discount_id, p_quotation_id, q.client_id, coalesce(p_amount, 0),
          q.vendor_id, q.template_id, q.template_tier_id, 'reserved', now());
end;$$;

revoke execute on function public._reserve_quotation_offer(uuid, uuid, numeric)
from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- THE LIFECYCLE TRIGGER
--
-- Fires on the one column that decides whether a reservation was spent.
--
-- `accepted` is the only status that spends it. `expired`, `declined`,
-- `voided` and `revised` all return it: a revision in particular, because the
-- vendor is about to send a new price and `_reserve_quotation_offer` will
-- claim it again — leaving the old reservation standing would have one quote
-- holding two uses.
--
-- Every other transition is ignored, including `sent`, which is where the
-- reservation is MADE and where a trigger touching it would fight the RPC.
-- ---------------------------------------------------------------------
create or replace function public.tg_quotation_offer_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is not distinct from old.status then return null; end if;

  if new.status = 'accepted' then
    update public.discount_redemptions
       set status = 'redeemed', redeemed_at = now()
     where quotation_id = new.id and status = 'reserved';

  elsif new.status::text in ('declined', 'expired', 'voided', 'revised') then
    update public.discount_redemptions
       set status = 'released',
           released_at = now(),
           release_reason = new.status::text
     where quotation_id = new.id and status = 'reserved';
  end if;

  return null;
end;$$;

drop trigger if exists trg_quotation_offer_lifecycle on public.quotations;
create trigger trg_quotation_offer_lifecycle
  after update of status on public.quotations
  for each row execute function public.tg_quotation_offer_lifecycle();

-- ---------------------------------------------------------------------
-- THE BOOKING BACK-REFERENCE
--
-- `discount_redemptions.booking_id` and its `unique (discount_id, booking_id)`
-- have been in the schema since 0008 with nothing to fill them. A redemption
-- is made against a quotation — that is where the price is — and the booking
-- appears afterwards, so the link is written when the booking arrives rather
-- than by widening `create_booking_from_quotation`.
--
-- Worth having: a vendor's settlement and a client's receipt are both about a
-- BOOKING, and without this the saving on either can only be found by walking
-- back to the quote.
-- ---------------------------------------------------------------------
create or replace function public.tg_booking_link_redemption()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.quotation_id is null then return null; end if;

  update public.discount_redemptions
     set booking_id = new.id
   where quotation_id = new.quotation_id
     and booking_id is null
     and status in ('reserved', 'redeemed');

  return null;
end;$$;

drop trigger if exists trg_booking_link_redemption on public.bookings;
create trigger trg_booking_link_redemption
  after insert on public.bookings
  for each row execute function public.tg_booking_link_redemption();

-- =====================================================================
-- 1. REQUESTING A QUOTE WITH AN OFFER IN HAND
--
-- Body is 0901e's verbatim — the event-ownership check, the requirement check,
-- the package/tier checks and the reference-generation retry loop — plus the
-- offer.
--
-- The code is resolved to an id HERE and the id is what is stored. Storing the
-- string would mean re-resolving it at send time against a table where a
-- vendor may have edited or replaced the code in between, and the client would
-- be quoted against an offer they never saw.
--
-- An invalid code raises rather than being dropped. The client is at a form
-- with the field in front of them, and a request that silently proceeds
-- without the discount they typed is a client who finds out at the quote.
-- =====================================================================
create or replace function public.request_quotation(
  p_vendor_id        uuid,
  p_details          text,
  p_event_id         uuid default null,
  p_currency         text default 'UGX',
  p_template_id      uuid default null,
  p_template_tier_id uuid default null,
  p_requirement_id   uuid default null,
  p_discount_code    text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id          uuid;
  v_constraint  text;
  v_code        text := nullif(btrim(coalesce(p_discount_code, '')), '');
  v_discount_id uuid;
  v_reason      text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  if p_event_id is not null
     and not exists (select 1 from public.events e
                      where e.id = p_event_id
                        and e.posted_by = auth.uid()
                        and e.deleted_at is null) then
    raise exception 'event_not_found';
  end if;

  if p_requirement_id is not null then
    if p_event_id is null then raise exception 'requirement_without_event'; end if;
    if not exists (select 1 from public.event_requirements r
                    where r.id = p_requirement_id and r.event_id = p_event_id
                      and r.deleted_at is null and r.cancelled_at is null) then
      raise exception 'requirement_not_found';
    end if;
  end if;

  if p_template_id is not null then
    if not public.quote_package_is_public(p_template_id)
       or not exists (select 1 from public.quote_templates t
                       where t.id = p_template_id and t.vendor_id = p_vendor_id) then
      raise exception 'package_unavailable';
    end if;
    if p_template_tier_id is not null
       and not exists (select 1 from public.quote_template_tiers ti
                        where ti.id = p_template_tier_id and ti.template_id = p_template_id) then
      raise exception 'tier_not_in_package';
    end if;
  end if;

  -- THE OFFER. Case-insensitive for the same reason `preview_discount` is:
  -- codes are read off posters and typed from memory.
  if v_code is not null then
    select d.id into v_discount_id
      from public.discounts d
     where upper(d.code) = upper(v_code) and d.deleted_at is null
     order by d.created_at desc
     limit 1;

    if v_discount_id is null then raise exception 'discount_not_found'; end if;

    -- No `p_base`: nothing is priced yet, so `min_amount` cannot be tested and
    -- must not be guessed at. `send_quotation` tests it against the real
    -- subtotal, which is the only figure it was ever about.
    v_reason := public.discount_block_reason(
      v_discount_id, p_vendor_id, p_template_id, p_template_tier_id, null, auth.uid());
    if v_reason is not null then
      raise exception 'discount_unavailable: %', v_reason;
    end if;
  end if;

  for i in 1 .. 8 loop
    begin
      insert into public.quotations(
        vendor_id, client_id, event_id, requirement_id, status, currency, request_details,
        template_id, template_tier_id, offer_discount_id, offer_discount_code)
      values (p_vendor_id, auth.uid(), p_event_id, p_requirement_id, 'requested', p_currency,
              p_details, p_template_id, p_template_tier_id, v_discount_id, v_code)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: quotations' using errcode = '23505';
end;$$;

drop function if exists public.request_quotation(uuid, text, uuid, text, uuid, uuid, uuid);

-- =====================================================================
-- 2. SENDING THE PRICE
--
-- Body is 0823b's — the advance bounds, the package-ownership check, the item
-- rewrite and the tier/tax arithmetic — with the offer folded into the money.
--
-- THE FORMULA, EXTENDED. 0823b's four lines, plus one:
--
--     base   = Σ (quantity × unit_price)
--     disc   = round(base × discount_rate/100)          -- the TIER's own
--     after  = base − disc
--     offer  = resolve_discount_amount(offer, after)    -- the CAMPAIGN's
--     net    = after − offer
--     exclusive:  tax = round(net × rate/100)   total = net + tax
--     inclusive:  tax = round(net − net/(1+rate/100))   total = net
--
-- The offer lands on `after`, not on `base`. That is the same rule
-- `packagePricing.ts` and `resolve_discount_amount` follow, and it is what
-- makes "20% off" mean twenty percent off the number printed on the package
-- card rather than twenty percent off a gross the client never saw.
--
-- `discount_total` stays the tier's reduction and `offer_discount_total`
-- carries the campaign's. Two columns because a client is entitled to see
-- which of the two came from the package and which came from their code, and
-- one summed column can never tell them.
--
-- THE ROW LOCK
-- `select ... from discounts for update` before the cap is tested. Two vendors
-- sending the last use of a platform-wide code in the same millisecond would
-- otherwise both read "1 remaining" and both reserve it. The lock is taken
-- after every cheaper validation, so the common path holds it for the length
-- of one insert.
-- =====================================================================
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

  v_max_rate := coalesce((public.get_setting('advance_rate_max') #>> '{}')::numeric, 50);
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

-- 0823b's 11-argument overload would still resolve for an 11-argument call and
-- would silently price the quote with no offer at all, leaving a reservation
-- standing against a total that no longer reflects it. Dropped for exactly the
-- reason 0823b dropped the 6-argument one before it.
drop function if exists public.send_quotation(
  uuid, jsonb, int, numeric, int, text, uuid, uuid, numeric, numeric, boolean);

comment on function public.send_quotation(
  uuid, jsonb, int, numeric, int, text, uuid, uuid, numeric, numeric, boolean, uuid) is
  'Prices and sends a quotation. The tier discount, the campaign offer and the tax are all '
  'computed here from the items as sent; the offer''s use is reserved, not yet spent.';

-- ---------------------------------------------------------------------
-- WHAT A CLIENT SEES ON A QUOTE THEY WERE OFFERED A DISCOUNT ON
--
-- A quotation row carries `offer_discount_id` and `offer_discount_total`, and
-- `discounts_read` lets a client read a live discount — but not a paused or
-- expired one, which is exactly the state an offer is in by the time a client
-- opens an old quote. Without this the saving on a past quote renders as an
-- amount with no name.
--
-- Scoped to quotes the caller is a party to, so it discloses nothing a client
-- was not already sent.
-- ---------------------------------------------------------------------
create or replace function public.quotation_offer(p_quotation_id uuid)
returns table (
  discount_id  uuid,
  title        text,
  description  text,
  terms        text,
  code         text,
  type         text,
  value        numeric,
  amount       numeric,
  promotion_title text,
  status       text)
language sql stable security definer set search_path = public as $$
  select d.id,
         coalesce(d.title, d.code, p.title, 'Special offer'),
         coalesce(d.description, p.description),
         coalesce(d.terms, p.terms),
         d.code,
         d.type::text,
         d.value,
         q.offer_discount_total,
         p.title,
         coalesce(r.status::text, 'reserved')
    from public.quotations q
    join public.discounts d on d.id = q.offer_discount_id
    left join public.promotions p on p.id = d.promotion_id
    left join public.discount_redemptions r
           on r.quotation_id = q.id and r.discount_id = d.id
          and r.status in ('reserved', 'redeemed')
   where q.id = p_quotation_id
     and (q.client_id = auth.uid() or public.is_vendor_owner(q.vendor_id) or public.is_admin());
$$;

-- ---------------------------------------------------------------------
-- A VENDOR'S CAMPAIGN PERFORMANCE
--
-- The Promotions and Discounts screens have had a "redemptions" line since
-- they shipped and it has always read zero, because nothing wrote the ledger.
-- Now that something does, this is the read behind it — one row per discount,
-- so the grid is one query rather than one per card.
--
-- `revenue` counts REDEEMED rows only. Reserved money is money a client has
-- not yet agreed to, and a campaign report that counts it is a report that
-- goes down when a quote is declined.
-- ---------------------------------------------------------------------
create or replace function public.vendor_offer_performance(p_vendor_id uuid)
returns table (
  discount_id     uuid,
  reserved_count  integer,
  redeemed_count  integer,
  released_count  integer,
  discounted_value numeric,
  booked_value    numeric)
language sql stable security definer set search_path = public as $$
  select d.id,
         count(*) filter (where r.status = 'reserved')::int,
         count(*) filter (where r.status = 'redeemed')::int,
         count(*) filter (where r.status = 'released')::int,
         coalesce(sum(r.amount_applied) filter (where r.status = 'redeemed'), 0),
         coalesce(sum(q.total)          filter (where r.status = 'redeemed'), 0)
    from public.discounts d
    left join public.discount_redemptions r on r.discount_id = d.id
    left join public.quotations q on q.id = r.quotation_id
   where d.vendor_id = p_vendor_id
     and public.is_vendor_owner(p_vendor_id)
   group by d.id;
$$;

-- ---------------------------------------------------------------------
-- GRANTS. Every signature changed, so every one needs its own — a grant
-- follows an argument list, not a name.
-- ---------------------------------------------------------------------
grant execute on function
  public.request_quotation(uuid, text, uuid, text, uuid, uuid, uuid, text),
  public.send_quotation(uuid, jsonb, int, numeric, int, text, uuid, uuid,
                        numeric, numeric, boolean, uuid),
  public.quotation_offer(uuid),
  public.vendor_offer_performance(uuid)
to authenticated;
