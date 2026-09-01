-- =====================================================================
-- Sinnapi — 0903f Where the event is
--
-- 0903a gave a quotation a DATE and an event type. It did not give it a place,
-- and the gap shows up the moment anyone uses the form: clients were typing the
-- venue into the free-text brief, because it is the obvious thing a vendor
-- needs and there was nowhere else to put it.
--
-- An address buried in prose is an address nothing can read. The vendor's
-- approval panel cannot show it, the booking cannot inherit it, and a vendor
-- deciding whether they can cover a date has to find it in a paragraph. So it
-- becomes a column, on both request paths.
--
-- REQUIRED, ON BOTH PATHS
-- On a package order because the vendor is being asked to commit their calendar
-- in one click and "where" is half of what they are agreeing to. On a bespoke
-- request because travel is a cost, and a vendor who has to ask "where is it?"
-- before they can price anything has been handed a brief that is not a brief.
--
-- Enforced in the RPCs rather than as a NOT NULL column: every quotation
-- written before today has no address and must keep working. A column-level
-- NOT NULL would need a backfill of invented data, which is worse than a
-- nullable column whose two writers both insist on it.
--
-- 160 CHARACTERS, AND THAT NUMBER IS NOT ARBITRARY
-- It is the cap `bookingFromQuotationSchema` already puts on
-- `bookings.location`, which is where this value ends up. A longer address here
-- would be one the booking form silently could not accept.
-- =====================================================================

alter table public.quotations
  add column if not exists event_address text;

comment on column public.quotations.event_address is
  'Where the event happens, as given at request time. Carried to bookings.location when the '
  'quote becomes a booking. Nullable for rows written before 0903f; both request RPCs require it.';

alter table public.quotations
  drop constraint if exists ck_quotations_event_address_len;
alter table public.quotations
  add constraint ck_quotations_event_address_len
  check (event_address is null or length(event_address) <= 160);

-- 0903a's constraint, widened. A package-origin row is the one shape where
-- every field is guaranteed present, because only one function writes it — so
-- the constraint is what stops a browser POSTing a package-origin row through
-- `quotations_insert` with the address left off.
alter table public.quotations
  drop constraint if exists ck_quotations_package_origin_locked;
alter table public.quotations
  add constraint ck_quotations_package_origin_locked
  check (quote_origin <> 'package'
         or (locked_subtotal is not null
             and locked_discount_floor is not null
             and template_id is not null
             and template_tier_id is not null
             and event_date is not null
             and event_address is not null));

-- =====================================================================
-- BOTH REQUEST RPCs, RE-ISSUED
--
-- Adding an argument means a new signature, and a new signature that coexists
-- with the old one is the PGRST203 trap `20260816000007`'s header warns about:
-- PostgREST refuses to choose between two overloads and every call fails. So
-- each old signature is dropped, and dropped by its EXACT argument list — a
-- near-miss there leaves the overload standing and the failure only shows up
-- from the browser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. THE BESPOKE PATH — 0902c's body verbatim, plus the address.
-- ---------------------------------------------------------------------
create or replace function public.request_quotation(
  p_vendor_id        uuid,
  p_details          text,
  p_event_address    text default null,
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
  v_address     text := nullif(btrim(coalesce(p_event_address, '')), '');
  v_discount_id uuid;
  v_reason      text;
begin
  if auth.uid() is null then perform public._forbidden(); end if;
  if not public.vendor_is_public(p_vendor_id) then raise exception 'vendor_unavailable'; end if;

  if v_address is null then raise exception 'event_address_required'; end if;
  if length(v_address) > 160 then raise exception 'event_address_too_long'; end if;

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
        template_id, template_tier_id, offer_discount_id, offer_discount_code, event_address)
      values (p_vendor_id, auth.uid(), p_event_id, p_requirement_id, 'requested', p_currency,
              p_details, p_template_id, p_template_tier_id, v_discount_id, v_code, v_address)
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'ux_quotations_ref' then raise; end if;
    end;
  end loop;

  raise exception 'reference_generation_failed: quotations' using errcode = '23505';
end;$$;

drop function if exists public.request_quotation(uuid, text, uuid, text, uuid, uuid, uuid, text);

grant execute on function
  public.request_quotation(uuid, text, text, uuid, text, uuid, uuid, uuid, text)
to authenticated;

-- ---------------------------------------------------------------------
-- 2. THE PACKAGE PATH — 0903c's body verbatim, plus the address.
-- ---------------------------------------------------------------------
create or replace function public.request_package_quotation(
  p_vendor_id     uuid,
  p_template_id   uuid,
  p_tier_id       uuid,
  p_event_date    date,
  p_event_type_id uuid,
  p_details       text,
  p_event_address text,
  p_discount_code text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id         uuid;
  v_constraint text;
  v_code       text := nullif(btrim(coalesce(p_discount_code, '')), '');
  v_discount   uuid;
  v_reason     text;
  v_details    text := nullif(btrim(coalesce(p_details, '')), '');
  v_address    text := nullif(btrim(coalesce(p_event_address, '')), '');
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
  -- All required, and the length mirrors `packageOrderSchema`. A vendor is
  -- being asked to commit their calendar to this in one click; "hi" with no
  -- address is not a thing anyone can approve.
  if p_event_type_id is null
     or not exists (select 1 from public.event_types et
                     where et.id = p_event_type_id and et.is_active) then
    raise exception 'event_type_required';
  end if;

  if v_details is null or length(v_details) < 20 then raise exception 'details_required'; end if;
  if length(v_details) > 2000 then raise exception 'details_too_long'; end if;

  if v_address is null then raise exception 'event_address_required'; end if;
  if length(v_address) > 160 then raise exception 'event_address_too_long'; end if;

  if p_event_date is null then raise exception 'event_date_required'; end if;
  if p_event_date < current_date then raise exception 'event_date_in_past'; end if;

  -- No `p_event_id`. A package quote is bought from a vendor's profile, where
  -- there is no event context, and attaching one would put a priced commitment
  -- inside a budget without ever running `assert_event_budget` against it.
  -- Sourcing a package into a planned event keeps going through
  -- `request_quotation`, which is guarded for it.

  -- ---- THE OFFER ----
  if v_code is not null then
    select d.id into v_discount
      from public.discounts d
     where upper(d.code) = upper(v_code) and d.deleted_at is null
     order by d.created_at desc
     limit 1;
    if v_discount is null then raise exception 'discount_not_found'; end if;
  end if;

  select * into m from public.price_package_tier(p_template_id, p_tier_id, null);
  if m.line_count = 0 then raise exception 'package_unavailable'; end if;

  if v_discount is null then
    v_discount := public.best_automatic_discount(
      p_template_id, p_tier_id, m.net, m.base, auth.uid());
  end if;

  if v_discount is not null then
    perform 1 from public.discounts where id = v_discount for update;

    v_reason := public.discount_block_reason(
      v_discount, p_vendor_id, p_template_id, p_tier_id, m.base, auth.uid());

    if v_reason is null then
      v_reason := public.discount_date_block_reason(v_discount, p_event_date);
    end if;

    if v_reason is not null then
      if v_reason in ('event_before_window', 'event_after_window') then
        select * into w from public.discount_event_window(v_discount);
        raise exception 'offer_date_unavailable: % (% to %)', v_reason, w.starts_on, w.ends_on;
      end if;
      raise exception 'discount_unavailable: %', v_reason;
    end if;

    select * into m from public.price_package_tier(p_template_id, p_tier_id, v_discount);
  end if;

  -- ---- THE ROW ----
  for i in 1 .. 8 loop
    begin
      insert into public.quotations(
        vendor_id, client_id, status, currency, request_details,
        template_id, template_tier_id, event_date, event_type_id, event_address,
        quote_origin, subtotal, discount_total, offer_discount_total,
        tax_total, total, discount_rate, tax_rate, tax_inclusive,
        offer_discount_id, offer_discount_code,
        locked_subtotal, locked_discount_floor)
      values (p_vendor_id, auth.uid(), 'requested', m.currency, v_details,
              p_template_id, p_tier_id, p_event_date, p_event_type_id, v_address,
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

drop function if exists public.request_package_quotation(uuid, uuid, uuid, date, uuid, text, text);

grant execute on function
  public.request_package_quotation(uuid, uuid, uuid, date, uuid, text, text, text)
to authenticated;

-- ---------------------------------------------------------------------
-- 3. THE APPROVAL PANEL'S READ — 0903d's, plus the address.
--
-- Dropped and recreated for the same reason as above: a `returns table`
-- signature is a return type, and `create or replace` cannot change one.
-- ---------------------------------------------------------------------
drop function if exists public.package_quote_terms(uuid);

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
  event_address         text,
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
    -- it is simply the rate the client was quoted. See 0903d for the algebra.
    coalesce(q.discount_rate, 0),
    q.offer_discount_id,
    coalesce(q.offer_discount_total, 0),
    q.event_date,
    q.event_address,
    w.starts_on,
    w.ends_on,
    round(coalesce(m.base, 0), 2) <> round(coalesce(q.locked_subtotal, 0), 2);
end;$$;

grant execute on function public.package_quote_terms(uuid) to authenticated;
