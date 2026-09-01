-- =====================================================================
-- Sinnapi — 0903d Package quotes: the vendor's answer
--
-- On a 'vendor'-origin quotation the vendor makes an offer and the client
-- accepts it. On a 'package'-origin one that is already done: the client
-- accepted a published price when they clicked, and what is outstanding is the
-- vendor's consent to do the work on that date.
--
-- So this is the mirror of `respond_quotation`. Same three verbs' worth of
-- consequence, opposite subject:
--
--   respond_quotation          client answers a vendor's price   sent → accepted
--   respond_package_quotation  vendor answers a client's order   requested → accepted
--
-- `respond_quotation` is left untouched. It opens with
-- `if q.client_id <> auth.uid() then _forbidden()`, and widening that to admit
-- vendors would put both directions of a two-party negotiation through one
-- door — the exact shape of mistake that ends with a vendor accepting on a
-- client's behalf. Two RPCs, two actor checks, no branch.
--
-- WHY APPROVING GOES STRAIGHT TO `accepted`
-- Because it is safe to, and only because of the discount floor. The vendor
-- cannot raise the total (0903b), so approval binds the client to the number
-- they clicked or to a better one. Without that guarantee this would have to
-- route back through the client for a second confirmation, and the whole point
-- of buying a published price would be gone.
--
-- WHAT `accepted` SETS OFF, WHICH THIS FILE DOES NOT DO ITSELF
-- `tg_quotation_offer_lifecycle` (0902c) flips the reservation this quote has
-- held since it was requested from `reserved` to `redeemed`, which is what
-- spends the campaign use and moves `used_count`. Declining releases it. Both
-- are the trigger's, not this function's — see 0902c on why that rule lives on
-- the column and not in the RPCs that happen to write it.
-- =====================================================================

create or replace function public.respond_package_quotation(
  p_quotation_id  uuid,
  p_action        text,
  -- The tier discount the vendor wants to apply, as a percentage. Null keeps
  -- the one the client was quoted. Anything that would reduce the client's
  -- combined saving is refused — by the trigger, not by an `if` here, so a
  -- vendor reaching the same column through PostgREST meets the same rule.
  p_discount_rate numeric default null,
  p_reason        text    default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  q        public.quotations;
  m        record;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_rate   numeric;
begin
  if p_action not in ('approve', 'decline') then raise exception 'invalid_action'; end if;
  if length(coalesce(v_reason, '')) > 500 then raise exception 'reason_too_long'; end if;

  select * into q from public.quotations
   where id = p_quotation_id and deleted_at is null
   for update;
  if q.id is null then raise exception 'not_found'; end if;
  if not public.is_vendor_owner(q.vendor_id) then perform public._forbidden(); end if;

  if q.quote_origin is distinct from 'package' then raise exception 'not_a_package_quote'; end if;
  if q.status <> 'requested' then raise exception 'quotation_not_answerable'; end if;

  -- ---- DECLINE ----
  -- A reason is required. The client is holding an agreement they believe they
  -- have made and a campaign use that is about to be returned to the pool; a
  -- bare refusal on that is the worst message this platform can send.
  if p_action = 'decline' then
    if v_reason is null then raise exception 'reason_required'; end if;
    perform set_config('sinnapi.status_reason', v_reason, true);
    update public.quotations
       set status = 'declined'::quotation_status, responded_at = now()
     where id = p_quotation_id;
    perform set_config('sinnapi.status_reason', '', true);
    return;
  end if;

  -- ---- APPROVE ----
  -- An event that has already happened cannot be agreed to. Checked on the
  -- date rather than on `valid_until`, which a package quote deliberately
  -- leaves null (see 0903c): the deadline on this one is the event itself.
  if q.event_date < current_date then raise exception 'event_date_in_past'; end if;

  -- The offer is NOT re-validated against its window here, and that is
  -- deliberate. The client claimed it while it was live and has held the
  -- reservation ever since; a campaign that lapsed during the days the vendor
  -- took to answer is the platform's delay, not the client's, and charging
  -- them the full price for it would be indefensible. Eligibility that IS
  -- still checked is the event date, above — that was true when they clicked
  -- and has to still be true now.

  v_rate := coalesce(p_discount_rate, q.discount_rate, 0);
  if v_rate < 0 or v_rate > 100 then raise exception 'discount_rate_out_of_range'; end if;

  -- Re-derived from the tier, never from the row's own totals, so the arithmetic
  -- is the same one the client was shown. `locked_subtotal` is what the trigger
  -- will check `subtotal` against; if the vendor has edited the package since,
  -- the base has moved and the sale cannot be honoured as published.
  select * into m from public.price_package_tier(
    q.template_id, q.template_tier_id, q.offer_discount_id);

  if round(m.base, 2) <> round(q.locked_subtotal, 2) then
    raise exception 'package_changed_since_request'
      using hint = 'This package has been edited since the client ordered it. Decline this '
                   'request and send them a fresh quote.';
  end if;

  -- The vendor's rate replaces the tier's, and everything downstream of it is
  -- recomputed rather than scaled: a percentage offer sits on the post-tier-
  -- discount net, so a bigger tier discount moves the offer too, and tax moves
  -- with both.
  declare
    v_disc  numeric := round(m.base * v_rate / 100, 2);
    v_after numeric := m.base - round(m.base * v_rate / 100, 2);
    v_offer numeric := 0;
    v_net   numeric;
    v_tax   numeric;
  begin
    if q.offer_discount_id is not null then
      v_offer := public.resolve_discount_amount(q.offer_discount_id, v_after);
    end if;
    v_net := v_after - v_offer;
    v_tax := case when m.tax_inclusive
                  then round(v_net - (v_net / (1 + m.tax_rate / 100)), 2)
                  else round(v_net * m.tax_rate / 100, 2) end;

    -- BEFORE the status write, and the ordering is load-bearing.
    --
    -- `_reserve_quotation_offer` writes `status = 'reserved'` on the ledger row.
    -- `tg_quotation_offer_lifecycle` writes `status = 'redeemed'` when the
    -- quotation reaches `accepted`. Run in the other order — accept first, then
    -- correct the amount — and this call quietly un-redeems the use the trigger
    -- had just spent, leaving a ledger that says `reserved` on a closed sale.
    -- `vendor_offer_performance` counts revenue on `redeemed` only, so the
    -- symptom is a campaign report that never counts anything.
    --
    -- Correcting the amount first and letting the trigger have the last word
    -- keeps 0902c's rule intact: the ledger's lifecycle belongs to the column
    -- that actually changes, and nothing else may write that column after it.
    if q.offer_discount_id is not null then
      perform public._reserve_quotation_offer(p_quotation_id, q.offer_discount_id, v_offer);
    end if;

    perform set_config('sinnapi.status_reason', coalesce(v_reason, ''), true);
    -- The ::quotation_status annotation is load-bearing. See 0816f.
    update public.quotations
       set status               = 'accepted'::quotation_status,
           responded_at         = now(),
           sent_at              = coalesce(sent_at, now()),
           subtotal             = m.base,
           discount_rate        = v_rate,
           discount_total       = v_disc,
           offer_discount_total = v_offer,
           tax_total            = v_tax,
           total                = case when m.tax_inclusive then v_net else v_net + v_tax end
     where id = p_quotation_id;
    perform set_config('sinnapi.status_reason', '', true);
  end;
end;$$;

comment on function public.respond_package_quotation(uuid, text, numeric, text) is
  'A vendor approving or declining a package order. Approval binds it at accepted — safe only '
  'because 0903b stops the total from ever rising. The vendor may deepen the discount here and '
  'may not touch the scope or the base.';

grant execute on function public.respond_package_quotation(uuid, text, numeric, text) to authenticated;

-- ---------------------------------------------------------------------
-- WHAT THE VENDOR IS LOOKING AT WHEN THEY DECIDE
--
-- The approval screen needs three things the quotation row cannot answer on
-- its own: the floor they must not go below, the tier discount as a percentage
-- the field can be seeded with, and whether the package still matches what was
-- ordered. Returned together so the screen is one round trip, and readable by
-- the client too — a client is entitled to see the floor that protects them.
-- ---------------------------------------------------------------------
create or replace function public.package_quote_terms(p_quotation_id uuid)
returns table (
  locked_subtotal       numeric,
  locked_discount_floor numeric,
  current_discount      numeric,
  discount_rate         numeric,
  min_discount_rate     numeric,
  offer_discount_id     uuid,
  offer_total           numeric,
  event_date            date,
  offer_starts_on       date,
  offer_ends_on         date,
  package_changed       boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  q public.quotations;
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

  return query select
    q.locked_subtotal,
    q.locked_discount_floor,
    round(coalesce(q.discount_total, 0) + coalesce(q.offer_discount_total, 0), 2),
    coalesce(q.discount_rate, 0),
    -- The floor as a percentage the vendor's field can take as its `min`, and
    -- it is simply the rate the client was quoted.
    --
    -- Worth showing the algebra, because "raise the tier rate and the offer
    -- shrinks under you" is the obvious objection. With the base fixed and a
    -- percentage offer p sitting on the post-discount net:
    --
    --     combined(r) = base·r/100 + p·(base − base·r/100)
    --                 = base·r/100·(1 − p) + p·base
    --
    -- and p ≤ 1, so the coefficient is never negative: combined only rises with
    -- r. A fixed-amount offer flattens at `base` once it caps out against the
    -- net, which is still no worse. So any rate at or above the quoted one
    -- satisfies the floor, and no rate below it can.
    coalesce(q.discount_rate, 0),
    q.offer_discount_id,
    coalesce(q.offer_discount_total, 0),
    q.event_date,
    w.starts_on,
    w.ends_on,
    round(coalesce(m.base, 0), 2) <> round(coalesce(q.locked_subtotal, 0), 2);
end;$$;

grant execute on function public.package_quote_terms(uuid) to authenticated;
