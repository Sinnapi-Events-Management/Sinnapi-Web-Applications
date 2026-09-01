-- =====================================================================
-- Sinnapi — 0901j EVENT PLANNING: filling the gaps
--
-- The last piece of the sourcing loop. `list_event_vendors` (0901i) shows who
-- is already in the running; this answers the question a client asks when the
-- answer is "nobody" — who COULD do this?
--
-- WHY A RANKING PLUS FILTERS, RATHER THAN ONE BLENDED SCORE
-- It is tempting to fold availability, budget fit and region into the score and
-- return one ordered list. That is the version a client cannot argue with: a
-- vendor they know is perfect sits eighth and there is no way to find out why.
--
-- So the three situational tests are FILTERS the client toggles, and each is
-- also returned as a boolean on every row. A vendor who is busy on the date is
-- excluded when the client asks for available vendors and is otherwise shown
-- WITH `is_available = false`, which the card can say out loud. The ranking
-- itself only ever expresses what the platform actually knows about quality:
-- category fit, paid placement, and the vendor's record.
--
-- WHAT THE RANKING IS
--   category match       required — not scored. A photographer is not a
--                        cheaper caterer, and letting a strong vendor from the
--                        wrong category outrank a weak one from the right
--                        category is how a recommendation becomes noise.
--   is_featured   × 40   paid placement, and the largest single term. Stated
--                        plainly rather than hidden: `is_featured` is a
--                        commercial product (`homepage_featured` on the elite
--                        plan, 0012) and the card labels these vendors so the
--                        client can see the placement for what it is.
--   search_weight × 1    the operator's thumb, already used by public search.
--   avg_rating    × 8    a full star is worth a fifth of a featured slot.
--   ln(1+reviews) × 3    logarithmic: the gap between 0 and 10 reviews says far
--                        more than the gap between 200 and 210.
--
-- WHO IS NEVER RECOMMENDED
--   * vendors who are not publicly listed
--   * vendors already engaged on the same line — they are on the board already
--   * vendors the client has passed on, ever, on this event. Re-suggesting
--     someone a client explicitly declined is the single fastest way to make a
--     recommendation panel feel like advertising.
-- =====================================================================

-- ---------------------------------------------------------------------
-- quote_tier_total — what one package tier costs, in SQL.
--
-- The same arithmetic as `packagePricing` in @sinnapi/ui and as
-- `send_quotation`, and it has to be: a "from UGX 2,500,000" on a
-- recommendation card that disagrees with the package page one tap away is the
-- platform quoting two prices for the same thing.
--
--     base     = Σ (quantity × unit_price)   over the tier's INCLUDED lines
--     net      = base − round(base × tier.discount_rate / 100)
--     total    = net                          when the package is tax-inclusive
--              = net + round(net × tax_rate/100)  otherwise
--
-- Optional lines are excluded, exactly as they are everywhere else: an add-on
-- is quoted alongside a tier, never inside its total.
-- ---------------------------------------------------------------------
create or replace function public.quote_tier_total(p_tier_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  with tier as (
    select ti.id, ti.discount_rate, t.tax_rate, t.tax_inclusive
      from public.quote_template_tiers ti
      join public.quote_templates t on t.id = ti.template_id
     where ti.id = p_tier_id
  ),
  base as (
    select coalesce(sum(i.quantity * i.unit_price), 0) as amount
      from public.quote_template_items i
     where i.tier_id = p_tier_id
       and not coalesce(i.is_optional, false)
  ),
  net as (
    select base.amount - round(base.amount * tier.discount_rate / 100, 2) as amount,
           tier.tax_rate, tier.tax_inclusive
      from base, tier
  )
  select case
           when net.tax_inclusive then net.amount
           else net.amount + round(net.amount * net.tax_rate / 100, 2)
         end
    from net;
$$;

comment on function public.quote_tier_total(uuid) is
  'What one package tier costs, by the same formula as packagePricing (UI) and send_quotation (SQL). '
  'Optional lines excluded — an add-on is never inside a tier total.';

-- ---------------------------------------------------------------------
-- vendor_from_price — the "from" figure on a vendor card.
--
-- The cheapest tier of any package the vendor has actually published, narrowed
-- to a category when one is asked for. Falls back to `vendors.starting_price`,
-- which 0823c stopped writing but which older rows still carry — a stale figure
-- is worth more than no figure to a client filtering on affordability, and the
-- card labels it as a starting price either way.
--
-- NULL means "we do not know what this vendor charges", which is a real answer
-- and is why the budget filter treats it as passing rather than failing: a
-- vendor with no published price is not evidence of an expensive vendor, and
-- silently hiding everyone who has not built a package yet would empty the
-- panel for a category where nobody has.
-- ---------------------------------------------------------------------
create or replace function public.vendor_from_price(
  p_vendor_id   uuid,
  p_category_id uuid default null,
  out o_amount   numeric,
  out o_currency text)
language plpgsql stable security definer set search_path = public as $$
begin
  select public.quote_tier_total(ti.id), coalesce(t.currency, 'UGX')
    into o_amount, o_currency
    from public.quote_templates t
    join public.quote_template_tiers ti on ti.template_id = t.id
   where t.vendor_id = p_vendor_id
     and public.quote_package_is_public(t.id)
     and (p_category_id is null or t.category_id = p_category_id)
     and public.quote_tier_total(ti.id) > 0
   order by public.quote_tier_total(ti.id) asc
   limit 1;

  if o_amount is null then
    select v.starting_price, coalesce(v.starting_price_currency, 'UGX')
      into o_amount, o_currency
      from public.vendors v
     where v.id = p_vendor_id and coalesce(v.starting_price, 0) > 0;
  end if;
end;
$$;

comment on function public.vendor_from_price(uuid, uuid) is
  'The cheapest published package tier for a vendor (optionally within one category), falling back '
  'to the legacy starting_price. NULL means unknown — never "expensive".';

-- ---------------------------------------------------------------------
-- recommend_vendors_for_event
-- ---------------------------------------------------------------------
create or replace function public.recommend_vendors_for_event(
  p_event_id       uuid,
  p_requirement_id uuid    default null,
  p_only_available boolean default false,
  p_within_budget  boolean default false,
  p_match_region   boolean default false,
  p_limit          integer default null,
  p_offset         integer default 0)
returns table (
  vendor_id          uuid,
  business_name      text,
  slug               text,
  primary_image_url  text,
  base_city          text,
  biography          text,
  avg_rating         numeric,
  review_count       integer,
  is_featured        boolean,
  category_name      text,

  from_amount        numeric,
  from_currency      text,
  from_amount_in_event_currency numeric,

  is_available       boolean,
  covers_region      boolean,
  fits_budget        boolean,

  score              numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  e            public.events;
  r            public.event_requirements;
  v_cur        text;
  v_category   uuid;
  v_headroom   numeric;
  v_limit      integer;
begin
  select * into e from public.events ev where ev.id = p_event_id and ev.deleted_at is null;
  if e.id is null then raise exception 'not_found'; end if;

  -- Owner or admin. The budget headroom below is derived from figures a vendor
  -- must never read, so this cannot be a public browse endpoint.
  if e.posted_by <> auth.uid() and not public.has_permission('events.manage') then
    perform public._forbidden();
  end if;

  v_cur   := coalesce(e.currency, 'UGX');
  v_limit := coalesce(p_limit,
                      (public.get_setting('event_recommendation_limit') #>> '{}')::integer, 12);

  if p_requirement_id is not null then
    select * into r from public.event_requirements
     where id = p_requirement_id and event_id = p_event_id and deleted_at is null;
    if r.id is null then raise exception 'requirement_not_found'; end if;
    v_category := r.category_id;
  end if;

  -- What the client can still spend on this. The line's own remaining
  -- allocation when a line is named — that is the figure they are shopping
  -- against — otherwise what is left of the whole budget.
  if p_requirement_id is not null and r.allocated_amount is not null then
    select r.allocated_amount - s.spoken_for
      into v_headroom
      from (select coalesce(sum(l.amount), 0) as spoken_for
              from public.event_money_lines(p_event_id) l
             where l.requirement_id = p_requirement_id) s;
  else
    select b.remaining_amount into v_headroom
      from public.event_budget_summary(p_event_id) b;
  end if;

  return query
  with candidate as (
    select
      v.id, v.business_name, v.slug, v.primary_image_url, v.base_city, v.biography,
      v.avg_rating, v.review_count, v.is_featured, v.search_weight,
      c.name as category_name
    from public.vendors v
    left join public.service_categories c on c.id = v.primary_category_id
    where public.vendor_is_public(v.id)
      -- The category gate. Either the vendor was approved under it, or they
      -- offer an active service in it.
      and (v_category is null
           or v.primary_category_id = v_category
           or exists (select 1 from public.vendor_services vs
                       where vs.vendor_id = v.id
                         and vs.category_id = v_category
                         and vs.is_active
                         and vs.deleted_at is null))
      -- Never re-suggest someone the client has passed on, on any line.
      and not exists (select 1 from public.event_interests ei
                       where ei.event_id = p_event_id
                         and ei.vendor_id = v.id
                         and ei.status in ('declined', 'withdrawn'))
      -- Already in the running for this line (or, unscoped, for the event).
      and not exists (select 1 from public.quotations q
                       where q.event_id = p_event_id
                         and q.vendor_id = v.id
                         and q.deleted_at is null
                         and (p_requirement_id is null
                              or q.requirement_id is not distinct from p_requirement_id))
      and not exists (select 1 from public.event_interests ei
                       where ei.event_id = p_event_id
                         and ei.vendor_id = v.id
                         and p_requirement_id is null)
  ),
  priced as (
    select
      cd.*,
      fp.o_amount   as from_amount,
      fp.o_currency as from_currency,
      public.fx_convert(fp.o_amount, fp.o_currency, v_cur) as from_in_event_cur,
      -- Free on the day. `vendor_blocked_dates` is the same table
      -- `create_booking` refuses against, so a vendor this says is available is
      -- one the booking RPC will actually accept.
      (e.event_date is null
       or not exists (select 1 from public.vendor_blocked_dates bd
                       where bd.vendor_id = cd.id and bd.blocked_date = e.event_date))
        as is_available,
      -- Region, as a heuristic and openly so: the event's location is free text
      -- a client typed, and this matches it against the vendor's declared
      -- service regions and their home city. It is a filter the client turns
      -- on, never a reason a vendor is silently buried.
      (e.location is null
       or cd.base_city is not null and e.location ilike '%' || cd.base_city || '%'
       or exists (select 1 from public.vendor_service_regions vsr
                    join public.service_regions sr on sr.id = vsr.region_id
                   where vsr.vendor_id = cd.id
                     and (e.location ilike '%' || sr.name || '%' or sr.scope = 'national')))
        as covers_region
    from candidate cd
    cross join lateral public.vendor_from_price(cd.id, v_category) fp
  ),
  scored as (
    select
      p.*,
      -- An unknown price PASSES the budget filter. See `vendor_from_price`.
      (v_headroom is null
       or p.from_in_event_cur is null
       or p.from_in_event_cur <= v_headroom) as fits_budget,
      -- The cast is load-bearing: `ln()` returns double precision, which makes
      -- the whole sum a float, and there is no `round(double precision, int)`
      -- in Postgres — only `round(numeric, int)`. Without it this fails at run
      -- time, not at creation, because a plpgsql body is not resolved until it
      -- is first executed.
      round(
        (
          (case when p.is_featured then 40 else 0 end)
          + coalesce(p.search_weight, 0)
          + coalesce(p.avg_rating, 0) * 8
          + ln(1 + coalesce(p.review_count, 0)) * 3
        )::numeric
      , 2) as score
    from priced p
  )
  select
    s.id, s.business_name, s.slug, s.primary_image_url, s.base_city, s.biography,
    s.avg_rating, s.review_count, s.is_featured, s.category_name,
    s.from_amount, s.from_currency, s.from_in_event_cur,
    s.is_available, s.covers_region, s.fits_budget,
    s.score
  from scored s
  where (not p_only_available or s.is_available)
    and (not p_within_budget  or s.fits_budget)
    and (not p_match_region   or s.covers_region)
  order by s.score desc, s.avg_rating desc nulls last, s.business_name
  limit v_limit offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

comment on function public.recommend_vendors_for_event(uuid, uuid, boolean, boolean, boolean, integer, integer) is
  'Client-or-admin: vendors who could fill one budget line, ranked on category fit, paid placement '
  'and record. Availability, budget fit and region are returned on every row AND offered as '
  'filters, so a vendor is never silently buried — the client sees why one does not fit.';

grant execute on function
  public.quote_tier_total(uuid),
  public.vendor_from_price(uuid, uuid),
  public.recommend_vendors_for_event(uuid, uuid, boolean, boolean, boolean, integer, integer)
to authenticated;
