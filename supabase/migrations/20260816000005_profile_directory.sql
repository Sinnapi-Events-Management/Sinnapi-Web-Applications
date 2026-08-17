-- =====================================================================
-- Sinnapi — 0816e The counterparty directory
--
-- WHY THIS EXISTS
-- `profiles_self_read` (0011) is:
--     using (id = auth.uid() or has_permission('users.read') or is_admin())
--
-- so a vendor cannot read the profile row of a client who has requested a
-- quote from them, and a client cannot read the profile behind a vendor
-- account. That is the correct policy — neither side of a marketplace should
-- be able to enumerate the other's identity rows — but it means every
-- embedded `profiles:client_id(full_name)` in a portal query silently
-- resolves to `null`. PostgREST raises no error for this: the join is legal,
-- the row is simply filtered away, so the portal renders a placeholder and
-- looks merely unpopulated rather than broken.
--
-- 0815f solved this for the inbox and 0815g for the vendor's client picker,
-- each with its own SECURITY DEFINER function. Meanwhile the vendor portal
-- has been rendering "Client" as the name on every bookings row, every
-- quotations row, the quotation detail hero, the review list, and a booking's
-- client card — whose email row, complete with a copy-to-clipboard button, has
-- never had an address in it.
--
-- Rather than a sixth bespoke function, this generalises 0815g's predicate
-- into one directory lookup that resolves a BATCH of profile ids for whoever
-- is calling. It is deliberately id-targeted rather than a listing: a caller
-- can only ask about people they already have a row in common with, and asking
-- about anyone else returns nothing rather than an error, so it cannot be used
-- to probe for the existence of an account.
--
-- WHAT IT DISCLOSES, AND WHEN
-- Two tiers, because a name and a phone number are not the same disclosure:
--
--   name + avatar   — as soon as a quotation or booking links the two parties,
--                     or they share a conversation. The vendor has to be able
--                     to say who a request came from.
--
--   email + phone   — only once the client has actually engaged: a quotation
--                     they ACCEPTED, or a booking that has progressed past
--                     `requested` without being `declined`. A vendor who
--                     merely received a request gets a name to answer, not a
--                     contact list to market to. Note that `cancelled` still
--                     counts — a booking that was live and then fell over is
--                     precisely when the two sides most need to reach each
--                     other — while `declined` never does, because it means
--                     the engagement never happened at all.
--
-- `contact_visible` is returned alongside so a portal can render the
-- difference deliberately ("available once the quote is accepted") instead of
-- showing an empty field that reads as missing data.
-- =====================================================================

create or replace function public.get_profile_directory(p_ids uuid[])
returns table (
  id              uuid,
  full_name       text,
  avatar_url      text,
  email           text,
  phone           text,
  contact_visible boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me         uuid := auth.uid();
  v_ids        uuid[];
  v_my_vendors uuid[];
  v_is_staff   boolean;
begin
  if v_me is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Callers assemble these ids from a page of rows, so duplicates are the norm
  -- rather than the exception.
  select array_agg(distinct t.x) into v_ids
    from unnest(coalesce(p_ids, '{}'::uuid[])) as t(x)
   where t.x is not null;

  if v_ids is null then
    return;
  end if;

  -- A page of results is the unit this is built for. The cap is not a security
  -- boundary — the relationship filter below is — it just stops one call from
  -- turning into an unbounded scan.
  if array_length(v_ids, 1) > 200 then
    raise exception 'get_profile_directory: at most 200 ids per call (got %)',
      array_length(v_ids, 1) using errcode = '22023';
  end if;

  v_is_staff := public.has_permission('users.read') or public.is_admin();

  v_my_vendors := array(
    select v.id from public.vendors v
     where v.owner_id = v_me and v.deleted_at is null
  );

  return query
  with linked as (
    -- Each branch is one way two people can legitimately know of each other,
    -- and carries whether THAT row also unlocks contact details. The branches
    -- are per-direction so the same function serves a vendor looking at their
    -- clients and a client looking at the person behind a vendor account.

    -- Quotations, me as the vendor.
    select q.client_id as pid, (q.status = 'accepted') as engaged
      from public.quotations q
     where q.deleted_at is null
       and q.vendor_id = any (v_my_vendors)
       and q.client_id = any (v_ids)

    union all

    -- Quotations, me as the client.
    select v.owner_id, (q.status = 'accepted')
      from public.quotations q
      join public.vendors v on v.id = q.vendor_id
     where q.deleted_at is null
       and q.client_id = v_me
       and v.owner_id = any (v_ids)

    union all

    -- Bookings, me as the vendor.
    select b.client_id, (b.status not in ('requested', 'declined'))
      from public.bookings b
     where b.deleted_at is null
       and b.vendor_id = any (v_my_vendors)
       and b.client_id = any (v_ids)

    union all

    -- Bookings, me as the client.
    select v.owner_id, (b.status not in ('requested', 'declined'))
      from public.bookings b
      join public.vendors v on v.id = b.vendor_id
     where b.deleted_at is null
       and b.client_id = v_me
       and v.owner_id = any (v_ids)

    union all

    -- A shared conversation names its counterparty but never unlocks contact
    -- details. This discloses nothing new — `get_my_conversations` already
    -- shows the caller this exact name — it only lets a page that has an id in
    -- hand resolve it without going through the inbox.
    select cp.profile_id, false
      from public.conversation_participants cp
     where cp.profile_id = any (v_ids)
       and cp.profile_id <> v_me
       and exists (
         select 1 from public.conversation_participants mine
          where mine.conversation_id = cp.conversation_id
            and mine.profile_id = v_me
       )
  ),
  rel as (
    select linked.pid, bool_or(linked.engaged) as engaged
      from linked
     group by linked.pid
  )
  select
    p.id,
    -- The fallback display string stays in the portals: "Client" is right in a
    -- vendor's bookings table and wrong everywhere else, and this function
    -- serves both sides.
    nullif(trim(p.full_name), ''),
    p.avatar_url,
    case when v_engaged.ok then p.email::text end,
    case when v_engaged.ok then p.phone end,
    v_engaged.ok
  from public.profiles p
  left join rel on rel.pid = p.id
  cross join lateral (
    select coalesce(rel.engaged, false) or v_is_staff or p.id = v_me as ok
  ) v_engaged
  where p.id = any (v_ids)
    and p.deleted_at is null
    -- Staff already hold `users.read`, so routing them through the same
    -- function keeps the admin portal on one code path instead of a parallel
    -- one that could drift.
    and (v_is_staff or p.id = v_me or rel.pid is not null);
end;
$$;

revoke all on function public.get_profile_directory(uuid[]) from public;
grant execute on function public.get_profile_directory(uuid[]) to authenticated;

comment on function public.get_profile_directory(uuid[]) is
  'Resolves profile ids the caller already shares a quotation, booking or conversation with. Always discloses display name and avatar; discloses email and phone only once that engagement is live (quote accepted, or booking past requested and not declined). Unknown or unrelated ids are omitted rather than rejected.';
