-- =====================================================================
-- Sinnapi — 0903e The offer's date window, on the quote that carries it
--
-- 0903b put a trigger on `bookings.event_date` refusing any date outside the
-- window its offer was granted for. That guard is correct and it is currently
-- unannounced: the client picks a date in the booking dialog, submits, and
-- discovers the rule from a raised exception.
--
-- The dialog cannot bound its own calendar without knowing the window, and it
-- has no way to read one. `discounts_read` is `authenticated`-only AND scoped
-- to live rows, which is precisely the state an offer is not in by the time a
-- client gets around to booking — the same gap 0902c wrote `quotation_offer`
-- to close for the offer's name and amount. This adds the two dates to that
-- same function rather than inventing a second one, because every caller that
-- wants to describe a quote's offer wants these too.
--
-- RE-ISSUED WITH A DROP FIRST, WHICH IS NOT OPTIONAL. `create or replace`
-- cannot change a function's return type, and a `returns table` signature is
-- its return type — without the drop this migration fails with "cannot change
-- return type of existing function". Same trap 20260815000003 is still sitting
-- in, which is why it is called out here.
-- =====================================================================

drop function if exists public.quotation_offer(uuid);

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
  status       text,
  -- The days an event may fall on to qualify. Read through
  -- `discount_event_window` rather than off `starts_at`/`ends_at` directly, so
  -- that if the claim window and the event window are ever separated there is
  -- still exactly one definition of the second one.
  starts_on    date,
  ends_on      date)
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
         coalesce(r.status::text, 'reserved'),
         w.starts_on,
         w.ends_on
    from public.quotations q
    join public.discounts d on d.id = q.offer_discount_id
    left join public.promotions p on p.id = d.promotion_id
    left join public.discount_redemptions r
           on r.quotation_id = q.id and r.discount_id = d.id
          and r.status in ('reserved', 'redeemed')
    left join lateral public.discount_event_window(d.id) w on true
   where q.id = p_quotation_id
     and (q.client_id = auth.uid() or public.is_vendor_owner(q.vendor_id) or public.is_admin());
$$;

grant execute on function public.quotation_offer(uuid) to authenticated;
