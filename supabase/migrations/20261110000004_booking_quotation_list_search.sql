-- =====================================================================
-- SEARCH + FILTERS FOR THE BOOKINGS AND QUOTATIONS LISTS
-- (vendor portal and client portal)
--
-- Four functions, one pair per list:
--
--   search_bookings(...)        → the rows, filtered and scoped to the caller
--   booking_list_facets(...)    → per-option counts for the filter dropdowns
--   search_quotations(...)      → the rows, filtered and scoped to the caller
--   quotation_list_facets(...)  → per-option counts for the status dropdown
--
-- The search functions only scope and filter. Ordering, the page range and the
-- exact count stay with PostgREST (`.order()`, `.range()`, `count: 'exact'`),
-- so both portals keep calling the same shared `paginate()` helper they used
-- against the plain tables. No second copy of the pagination contract.
--
-- WHY SECURITY DEFINER
-- Three things the lists need are hidden from the caller by RLS:
--   1. A vendor searching by client name — `profiles` is not readable across
--      accounts (the same reason the list resolves names through
--      `get_profile_directory`).
--   2. A vendor seeing the date and title of the private event a client
--      attached to a request. `events_public_read` only exposes published
--      public events, so most custom quotes looked dateless to the vendor.
--      Decision (2026-11-10): the vendor the request was addressed to may see
--      that event's DATE and TITLE — nothing else from the event row.
--   3. A bespoke quotation keeps its date only on the linked event; package
--      orders carry `quotations.event_date`. The list resolves one "event date"
--      with the same precedence as the booking form's `defaultBookingDate`:
--      the quote's own date first, the event's second.
--
-- Because RLS is bypassed, the scope is restated explicitly and exactly:
--   * p_vendor_id given → the caller must own that vendor (`is_vendor_owner`),
--     else 42501. Rows are that vendor's.
--   * p_vendor_id null  → rows where the caller is the client.
-- Staff (`bookings.read` / `quotations.read`) are not served here; the admin
-- portal has its own lists.
--
-- SOFT-DELETED ROWS ARE HIDDEN (decision 2026-11-10). The plain-table lists
-- these replace showed them, because neither the queries nor the policies
-- filtered on `deleted_at`.
--
-- SEARCH TERM
-- One case-insensitive substring match across: reference number, the other
-- party's name (client full name for a vendor, business name for a client),
-- the linked event's title, and the booking's location / the quote's event
-- address. `%`, `_` and `\` are escaped so a term is always literal. The legacy
-- import reference (`legacy_reference_no`) is deliberately NOT matched.
-- =====================================================================

-- Booking references got trigram coverage in 0903j; quotation references never
-- did, and both lists ILIKE them.
create index if not exists ix_quotations_reference_trgm
  on public.quotations using gin (reference_no gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Shared: turn a raw search box value into an ILIKE pattern, or NULL.
-- Immutable SQL so it inlines; not security definer, holds no data.
-- ---------------------------------------------------------------------
create or replace function public._list_search_pattern(p_search text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when nullif(btrim(coalesce(p_search, '')), '') is null then null
    else '%' || replace(replace(replace(
           left(btrim(p_search), 100),
           '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end;
$$;

revoke all on function public._list_search_pattern(text) from public, anon;
grant execute on function public._list_search_pattern(text) to authenticated;

-- =====================================================================
-- BOOKINGS
-- =====================================================================
drop function if exists public.search_bookings(uuid, text, text, text, text, date, date);

create or replace function public.search_bookings(
  p_vendor_id    uuid default null,
  p_search       text default null,
  p_status       text default null,
  p_payment_type text default null,
  p_terms_status text default null,
  p_date_from    date default null,
  p_date_to      date default null
)
returns table (
  id                          uuid,
  reference_no                text,
  status                      booking_status,
  event_date                  date,
  amount                      numeric,
  currency                    text,
  client_id                   uuid,
  vendor_id                   uuid,
  payment_type                payment_type,
  payment_terms_status        payment_terms_status,
  payment_window_opened_at    timestamptz,
  payment_due_at              timestamptz,
  payment_due_override_at     timestamptz,
  payment_due_override_reason text,
  payment_overdue_at          timestamptz,
  payment_settled_at          timestamptz,
  last_payment_nudge_at       timestamptz,
  payment_nudge_count         integer,
  location                    text,
  created_at                  timestamptz,
  vendors                     jsonb,
  events                      jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me  uuid := auth.uid();
  v_pat text := public._list_search_pattern(p_search);
begin
  if v_me is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_vendor_id is not null and not public.is_vendor_owner(p_vendor_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    b.id, b.reference_no, b.status, b.event_date, b.amount, b.currency,
    b.client_id, b.vendor_id, b.payment_type, b.payment_terms_status,
    b.payment_window_opened_at, b.payment_due_at, b.payment_due_override_at,
    b.payment_due_override_reason, b.payment_overdue_at, b.payment_settled_at,
    b.last_payment_nudge_at, b.payment_nudge_count,
    b.location, b.created_at,
    jsonb_build_object(
      'business_name',     v.business_name,
      'slug',              v.slug,
      'primary_image_url', v.primary_image_url
    ),
    case when e.id is null then null
         else jsonb_build_object('title', e.title, 'event_date', e.event_date) end
  from public.bookings b
  join public.vendors v on v.id = b.vendor_id
  left join public.events e on e.id = b.event_id and e.deleted_at is null
  left join public.profiles p on p.id = b.client_id
  where b.deleted_at is null
    and (case when p_vendor_id is not null then b.vendor_id = p_vendor_id
              else b.client_id = v_me end)
    -- Compared as text so a hand-edited URL value matches nothing instead of
    -- raising an enum cast error.
    and (p_status       is null or b.status::text               = p_status)
    and (p_payment_type is null or b.payment_type::text         = p_payment_type)
    and (p_terms_status is null or b.payment_terms_status::text = p_terms_status)
    and (p_date_from    is null or b.event_date >= p_date_from)
    and (p_date_to      is null or b.event_date <= p_date_to)
    and (v_pat is null
         or b.reference_no ilike v_pat
         or b.location     ilike v_pat
         or e.title        ilike v_pat
         -- The OTHER party's name: a vendor searches clients, a client vendors.
         or (p_vendor_id is not null and p.full_name     ilike v_pat)
         or (p_vendor_id is null     and v.business_name ilike v_pat));
end;
$$;

revoke all on function public.search_bookings(uuid, text, text, text, text, date, date) from public, anon;
grant execute on function public.search_bookings(uuid, text, text, text, text, date, date) to authenticated;

comment on function public.search_bookings(uuid, text, text, text, text, date, date) is
  'Bookings list for the vendor (p_vendor_id = an owned vendor) or the client (p_vendor_id null), '
  'searched and filtered. Order/range/count are applied by PostgREST on top. See 20261110000004.';

-- Per-option counts. Each facet is counted under every OTHER active filter but
-- not its own, so a dropdown shows what picking each option would return
-- (FacetSelect disables the zero ones). Scoping and auth come from
-- search_bookings, so this stays invoker.
drop function if exists public.booking_list_facets(uuid, text, text, text, text, date, date);

create or replace function public.booking_list_facets(
  p_vendor_id    uuid default null,
  p_search       text default null,
  p_status       text default null,
  p_payment_type text default null,
  p_terms_status text default null,
  p_date_from    date default null,
  p_date_to      date default null
)
returns table (facet text, value text, n bigint)
language sql
stable
set search_path = public
as $$
  select 'status'::text, s.status::text, count(*)
    from public.search_bookings(p_vendor_id, p_search, null, p_payment_type, p_terms_status,
                                p_date_from, p_date_to) s
   group by s.status
  union all
  select 'payment_type', s.payment_type::text, count(*)
    from public.search_bookings(p_vendor_id, p_search, p_status, null, p_terms_status,
                                p_date_from, p_date_to) s
   where s.payment_type is not null
   group by s.payment_type
  union all
  select 'terms_status', s.payment_terms_status::text, count(*)
    from public.search_bookings(p_vendor_id, p_search, p_status, p_payment_type, null,
                                p_date_from, p_date_to) s
   group by s.payment_terms_status;
$$;

revoke all on function public.booking_list_facets(uuid, text, text, text, text, date, date) from public, anon;
grant execute on function public.booking_list_facets(uuid, text, text, text, text, date, date) to authenticated;

-- =====================================================================
-- QUOTATIONS
-- =====================================================================
drop function if exists public.search_quotations(uuid, text, text, date, date);

create or replace function public.search_quotations(
  p_vendor_id uuid default null,
  p_search    text default null,
  p_status    text default null,
  p_date_from date default null,
  p_date_to   date default null
)
returns table (
  id              uuid,
  reference_no    text,
  status          quotation_status,
  total           numeric,
  currency        text,
  valid_until     timestamptz,
  request_details text,
  created_at      timestamptz,
  client_id       uuid,
  vendor_id       uuid,
  quote_origin    text,
  -- The one "event date" the list shows, sorts and filters by.
  event_on        date,
  vendors         jsonb,
  events          jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_me  uuid := auth.uid();
  v_pat text := public._list_search_pattern(p_search);
begin
  if v_me is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if p_vendor_id is not null and not public.is_vendor_owner(p_vendor_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    r.id, r.reference_no, r.status, r.total, r.currency, r.valid_until,
    r.request_details, r.created_at, r.client_id, r.vendor_id, r.quote_origin,
    r.event_on, r.vendors, r.events
  from (
    select
      q.id, q.reference_no, q.status, q.total, q.currency, q.valid_until,
      q.request_details, q.created_at, q.client_id, q.vendor_id, q.quote_origin,
      -- Same precedence as the booking form's defaultBookingDate().
      coalesce(q.event_date, e.event_date) as event_on,
      jsonb_build_object('business_name', v.business_name, 'slug', v.slug) as vendors,
      case when e.id is null then null
           else jsonb_build_object('title', e.title, 'event_date', e.event_date) end as events,
      q.event_address, e.title as event_title,
      p.full_name as client_name, v.business_name
    from public.quotations q
    join public.vendors v on v.id = q.vendor_id
    left join public.events e on e.id = q.event_id and e.deleted_at is null
    left join public.profiles p on p.id = q.client_id
    where q.deleted_at is null
      and (case when p_vendor_id is not null then q.vendor_id = p_vendor_id
                else q.client_id = v_me end)
  ) r
  where (p_status    is null or r.status::text = p_status)
    -- A quote with no event date has nothing to compare, so a date filter
    -- excludes it (decision 2026-11-10).
    and (p_date_from is null or r.event_on >= p_date_from)
    and (p_date_to   is null or r.event_on <= p_date_to)
    and (v_pat is null
         or r.reference_no  ilike v_pat
         or r.event_address ilike v_pat
         or r.event_title   ilike v_pat
         or (p_vendor_id is not null and r.client_name   ilike v_pat)
         or (p_vendor_id is null     and r.business_name ilike v_pat));
end;
$$;

revoke all on function public.search_quotations(uuid, text, text, date, date) from public, anon;
grant execute on function public.search_quotations(uuid, text, text, date, date) to authenticated;

comment on function public.search_quotations(uuid, text, text, date, date) is
  'Quotations list for the vendor (p_vendor_id = an owned vendor) or the client (p_vendor_id null), '
  'searched and filtered; event_on = coalesce(quote date, linked event date). See 20261110000004.';

drop function if exists public.quotation_list_facets(uuid, text, text, date, date);

create or replace function public.quotation_list_facets(
  p_vendor_id uuid default null,
  p_search    text default null,
  p_status    text default null,
  p_date_from date default null,
  p_date_to   date default null
)
returns table (facet text, value text, n bigint)
language sql
stable
set search_path = public
as $$
  -- `p_status` is accepted for a signature that mirrors search_quotations, and
  -- ignored: status is the only facet, and it is counted without its own filter.
  select 'status'::text, s.status::text, count(*)
    from public.search_quotations(p_vendor_id, p_search, null, p_date_from, p_date_to) s
   group by s.status;
$$;

revoke all on function public.quotation_list_facets(uuid, text, text, date, date) from public, anon;
grant execute on function public.quotation_list_facets(uuid, text, text, date, date) to authenticated;
