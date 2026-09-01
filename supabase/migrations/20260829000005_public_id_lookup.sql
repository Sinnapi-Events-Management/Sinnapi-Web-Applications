-- =====================================================================
-- Sinnapi — 0829e Public identifiers: admin lookup
--
-- One RPC that answers "what is SV285K7BV9, and where do I go to see it?"
-- so a support agent can paste an identifier a caller reads out and land
-- on the record, instead of guessing which of sixteen list pages to
-- search and by what field.
--
-- WHY IT RESOLVES THROUGH THE REGISTRY
-- The registry (20260829000001) already holds every identifier ever
-- minted, keyed by the identifier itself. So the lookup is one index
-- probe followed by one fetch from the table it names — not sixteen
-- `where public_id = $1` scans, and not a rule that the prefix decides
-- the table. Trusting the prefix would be the obvious shortcut and a bad
-- one: it would put a caller's typo in charge of which table is queried,
-- and it would break the moment a prefix is ever reassigned.
--
-- IT ALSO ANSWERS FOR RECORDS THAT NO LONGER EXIST
-- Registry rows outlive their subjects deliberately, so a deleted
-- record's identifier resolves to `found = true, row_id is null`. "That
-- booking was deleted in March" is a useful answer to a caller; "no such
-- reference" when the reference was real is a wrong one, and would send
-- the agent looking for a typo that is not there.
--
-- LEGACY REFERENCES STILL RESOLVE
-- Quotations and bookings carry `legacy_reference_no` (20260829000004),
-- so a client reading `Q-7657H8YH` off a PDF issued before the migration
-- is found and the agent is told which format matched. Without this the
-- rewrite would have quietly invalidated every reference already in
-- client hands.
--
-- AUTHORISATION
-- Staff only, and stated at the top of the body rather than left to RLS.
-- The function is SECURITY DEFINER because it reads across sixteen tables
-- whose policies are each scoped to a participant, so it necessarily
-- bypasses them — which means the `is_admin()` gate is the only thing
-- standing between a caller and every record on the platform, and it runs
-- before a single row is touched.
--
-- What it returns is deliberately thin: an identifier, a one-line label,
-- and a route. It is a signpost, not a data export — the page it points
-- at applies that page's own permission check (`vendor.manage`,
-- `bookings.read` and so on), so this cannot be used to read a record the
-- agent is not entitled to open.
-- =====================================================================

-- ---------------------------------------------------------------------
-- `profile_is_staff` exists so the entity CASE in the lookup below can
-- choose between the Users page and the Clients page without repeating
-- the `is_admin` join inline. Distinct from `is_admin()`, which asks
-- about the *caller*; this asks about a named profile.
-- ---------------------------------------------------------------------
create or replace function public.profile_is_staff(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = p_profile_id and r.is_admin
  );
$$;

revoke execute on function public.profile_is_staff(uuid) from public, anon, authenticated;

create or replace function public.admin_lookup_public_id(p_query text)
returns table (
  found      boolean,
  entity     text,      -- table name without the schema, e.g. 'vendors'
  label      text,      -- one line naming the record, for the result row
  public_id  text,      -- the canonical identifier, whatever was searched
  row_id     uuid,      -- null when the record has since been deleted
  route      text,      -- admin-portal path, or null where none exists
  matched_on text       -- 'current' | 'legacy'
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query    text;
  v_relation text;
  v_row_id   uuid;
  v_matched  text := 'current';
  v_entity   text;
  v_label    text;
  v_route    text;
  v_exists   boolean := false;
begin
  if not public.is_admin() then perform public._forbidden(); end if;

  -- Callers paste identifiers out of emails and chat, so they arrive with
  -- stray whitespace and in whatever case the sender typed. Hyphens are
  -- left alone: they are not decorative here, they are what distinguishes
  -- a legacy `Q-7657H8YH` from a current `SQ7657H8YH`.
  v_query := upper(btrim(coalesce(p_query, '')));
  if v_query = '' then return; end if;

  -- 1. The registry: every current identifier, including the two
  --    `reference_no` columns.
  select r.relation, r.row_id into v_relation, v_row_id
  from public.public_id_registry r
  where r.public_id = v_query;

  -- 2. Failing that, a reference issued before 20260829000004. Reaching
  --    this point is itself what makes the match a legacy one — the
  --    registry holds every current identifier without exception, so a
  --    miss there and a hit here can only be an old reference.
  if v_relation is null then
    v_matched := 'legacy';

    select 'public.quotations', q.id into v_relation, v_row_id
    from public.quotations q where upper(q.legacy_reference_no) = v_query limit 1;

    if v_relation is null then
      select 'public.bookings', b.id into v_relation, v_row_id
      from public.bookings b where upper(b.legacy_reference_no) = v_query limit 1;
    end if;
  end if;

  if v_relation is null then
    return query select false, null::text, null::text, v_query, null::uuid, null::text, null::text;
    return;
  end if;

  v_entity := split_part(v_relation, '.', 2);

  -- The label and route for each entity. Only the one branch matching
  -- `v_entity` is evaluated, so this is a single-row fetch however long
  -- the CASE gets.
  --
  -- Entities whose admin route is a list page rather than a detail page
  -- (escrow, payouts, refunds, disputes, payments, subscriptions) point at
  -- the list; `promotions` has no admin page at all and correctly points
  -- nowhere rather than at a route that would 404.
  case v_entity
    when 'vendors' then
      select v.business_name, '/vendors/' || v.id into v_label, v_route
      from public.vendors v where v.id = v_row_id;
    when 'vendor_application_intake' then
      select a.business_name, '/applications/' || a.id into v_label, v_route
      from public.vendor_application_intake a where a.id = v_row_id;
    when 'profiles' then
      select p.full_name || ' — ' || p.email,
             case when public.profile_is_staff(p.id) then '/users' else '/clients/' || p.id end
        into v_label, v_route
      from public.profiles p where p.id = v_row_id;
    when 'quotations' then
      select 'Quotation — ' || coalesce(q.currency, '') || ' ' || coalesce(q.total, 0)::text,
             '/quotations/' || q.id into v_label, v_route
      from public.quotations q where q.id = v_row_id;
    when 'bookings' then
      select 'Booking — ' || coalesce(bk.event_date::text, 'no date'),
             '/bookings/' || bk.id into v_label, v_route
      from public.bookings bk where bk.id = v_row_id;
    when 'events' then
      select e.title, '/events/' || e.id into v_label, v_route
      from public.events e where e.id = v_row_id;
    when 'newsletter_campaigns' then
      select n.title, '/newsletters/' || n.id into v_label, v_route
      from public.newsletter_campaigns n where n.id = v_row_id;
    when 'payments' then
      select 'Payment — ' || pm.currency || ' ' || pm.amount::text, '/payments'
        into v_label, v_route
      from public.payments pm where pm.id = v_row_id;
    when 'payouts' then
      select 'Payout — ' || po.currency || ' ' || po.amount::text, '/payouts'
        into v_label, v_route
      from public.payouts po where po.id = v_row_id;
    when 'refunds' then
      select 'Refund — ' || rf.currency || ' ' || rf.amount::text, '/refunds'
        into v_label, v_route
      from public.refunds rf where rf.id = v_row_id;
    when 'escrow_transactions' then
      select 'Escrow — ' || ex.currency || ' ' || ex.gross_amount::text, '/escrow'
        into v_label, v_route
      from public.escrow_transactions ex where ex.id = v_row_id;
    when 'settlement_requests' then
      select 'Settlement — ' || sr.currency || ' ' || sr.requested_amount::text, '/escrow'
        into v_label, v_route
      from public.settlement_requests sr where sr.id = v_row_id;
    when 'disputes' then
      select 'Dispute — ' || d.status::text, '/disputes' into v_label, v_route
      from public.disputes d where d.id = v_row_id;
    when 'subscriptions' then
      select 'Subscription — ' || s.status::text, '/subscriptions' into v_label, v_route
      from public.subscriptions s where s.id = v_row_id;
    when 'promotions' then
      select pr.title, null::text into v_label, v_route
      from public.promotions pr where pr.id = v_row_id;
    else
      v_label := null; v_route := null;
  end case;

  -- A registry hit whose fetch found nothing is a deleted record, not a
  -- miss: `found` stays true and `row_id` goes null so the caller can say
  -- so rather than reporting a bad identifier.
  v_exists := v_label is not null;

  return query select
    true,
    v_entity,
    coalesce(v_label, initcap(replace(v_entity, '_', ' ')) || ' — record no longer exists'),
    v_query,
    case when v_exists then v_row_id else null end,
    case when v_exists then v_route else null end,
    v_matched;
end;
$$;

comment on function public.admin_lookup_public_id(text) is
  'Staff-only: resolves a public identifier (current or legacy) to the record it names, with a label and an admin-portal route.';

-- The lookup itself gates on `is_admin()` internally, so `authenticated`
-- may call it — a client who does gets `forbidden`, which is the same
-- answer every other admin RPC gives them.
grant execute on function public.admin_lookup_public_id(text) to authenticated;
