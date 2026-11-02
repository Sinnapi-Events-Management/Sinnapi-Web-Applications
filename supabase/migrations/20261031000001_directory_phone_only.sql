-- =====================================================================
-- Sinnapi — The counterparty directory discloses phone, not email
--
-- WHY THIS CHANGES
-- 0816e released a counterparty's email AND phone once an engagement was live.
-- The product decision now is that a marketplace contact is a phone number:
-- an email address is easy to scrape and reuse outside the platform, and the
-- two parties can already reach each other through the in-app conversation.
-- So the email is removed from the function's return shape entirely, rather
-- than hidden in the portals. A value the server never sends cannot be shown,
-- copied or read from a network response by a caller.
--
-- WHAT IT DISCLOSES, AND WHEN
--   name + avatar   — as soon as a quotation or booking links the two parties,
--                     or they share a conversation (unchanged).
--   phone           — only once the engagement is live: a quotation the client
--                     ACCEPTED, or a booking past `requested` that is not
--                     `declined` (unchanged rule, email no longer part of it).
--
-- The return shape changes, so the function is dropped and recreated. Grants
-- are reissued for the new signature.
-- =====================================================================

drop function if exists public.get_profile_directory(uuid[]);

create or replace function public.get_profile_directory(p_ids uuid[])
returns table (
  id              uuid,
  full_name       text,
  avatar_url      text,
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

  select array_agg(distinct t.x) into v_ids
    from unnest(coalesce(p_ids, '{}'::uuid[])) as t(x)
   where t.x is not null;

  if v_ids is null then
    return;
  end if;

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

    -- A shared conversation names its counterparty but never unlocks the phone.
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
    nullif(trim(p.full_name), ''),
    p.avatar_url,
    case when v_engaged.ok then p.phone end,
    v_engaged.ok
  from public.profiles p
  left join rel on rel.pid = p.id
  cross join lateral (
    select coalesce(rel.engaged, false) or v_is_staff or p.id = v_me as ok
  ) v_engaged
  where p.id = any (v_ids)
    and p.deleted_at is null
    and (v_is_staff or p.id = v_me or rel.pid is not null);
end;
$$;

revoke all on function public.get_profile_directory(uuid[]) from public;
grant execute on function public.get_profile_directory(uuid[]) to authenticated;

comment on function public.get_profile_directory(uuid[]) is
  'Resolves profile ids the caller already shares a quotation, booking or conversation with. Always discloses display name and avatar; discloses phone only once that engagement is live (quote accepted, or booking past requested and not declined). Email is never returned. Unknown or unrelated ids are omitted rather than rejected.';
