-- =====================================================================
-- Sinnapi — 0815g Vendor → client conversations
--
-- WHY THIS EXISTS
-- `get_or_create_client_vendor_conversation` (0813c) resolves the *caller* as
-- the client. It is the only way a `client_vendor` thread comes into existence,
-- which means the vendor side of the marketplace can reply and can never open.
-- A photographer who needs to ask about the venue before a shoot has no route
-- to the client at all unless that client messaged them first.
--
-- THE SPAM QUESTION IS THE WHOLE DESIGN
-- Letting vendors direct-message arbitrary clients would turn the inbox into an
-- outbound sales channel, which is exactly what the withdrawn
-- `start_conversation` grant (0815a) allowed and exactly why it was withdrawn.
-- So this requires a real commercial relationship: the client must already have
-- a booking or a quotation with this vendor. That is a relationship the client
-- initiated, and it is the same bar the vendor's own dashboard uses to decide
-- whose details it will show them.
--
-- Idempotent, and matched on the same predicate as 0813c, so both sides
-- converge on one thread rather than each creating their own.
-- =====================================================================
create or replace function public.get_or_create_vendor_client_conversation(
  p_client_id uuid,
  p_vendor_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid := auth.uid();
  v_vendor uuid := p_vendor_id;
  v_count  integer;
  v_name   text;
  v_convo  uuid;
begin
  if v_owner is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Same resolution rule as the vendor support RPC: one business needs no
  -- choosing, several make the choice mandatory rather than arbitrary.
  if v_vendor is null then
    select count(*), min(v.id) into v_count, v_vendor
      from public.vendors v
     where v.owner_id = v_owner and v.deleted_at is null;

    if v_count = 0 then raise exception 'not_a_vendor' using errcode = 'P0002'; end if;
    if v_count > 1 then raise exception 'vendor_required' using errcode = 'P0002'; end if;
  elsif not public.is_vendor_owner(v_vendor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_client_id = v_owner then perform public._forbidden(); end if;

  -- The relationship gate. Without an existing booking or quotation this is
  -- cold outreach, and the platform does not offer that.
  if not exists (
    select 1 from public.bookings b
     where b.vendor_id = v_vendor and b.client_id = p_client_id and b.deleted_at is null
    union all
    select 1 from public.quotations q
     where q.vendor_id = v_vendor and q.client_id = p_client_id
  ) then
    raise exception 'no_relationship' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = p_client_id and p.deleted_at is null
  ) then
    raise exception 'client_not_found' using errcode = 'P0002';
  end if;

  select business_name into v_name from public.vendors where id = v_vendor;

  -- Matched on both participants, not on `vendor_id` alone, so two clients of
  -- the same vendor never land in each other's conversation. Identical to the
  -- lookup in 0813c, which is what makes the two entry points idempotent
  -- against each other.
  select c.id into v_convo
  from public.conversations c
  join public.conversation_participants me    on me.conversation_id = c.id and me.profile_id = v_owner
  join public.conversation_participants other on other.conversation_id = c.id and other.profile_id = p_client_id
  where c.type = 'client_vendor'
    and c.vendor_id = v_vendor
    and c.deleted_at is null
  order by c.created_at asc
  limit 1;

  if v_convo is null then
    insert into public.conversations (type, subject, vendor_id, status, created_by)
    values ('client_vendor', left(coalesce(v_name, 'Client enquiry'), 200),
            v_vendor, 'active', v_owner)
    returning id into v_convo;

    insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
    values (v_convo, p_client_id, 'client'), (v_convo, v_owner, 'vendor')
    on conflict (conversation_id, profile_id) do nothing;
  end if;

  update public.conversations
     set status = 'active'
   where id = v_convo and status = 'archived';

  return v_convo;
end;
$$;

revoke all on function public.get_or_create_vendor_client_conversation(uuid, uuid) from public;
grant execute on function public.get_or_create_vendor_client_conversation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Who a vendor is allowed to start a conversation with.
--
-- The picker's candidate list, and deliberately the same predicate the RPC
-- enforces — a picker that offered names the RPC would then refuse is a UI that
-- lies. `profiles_self_read` blocks the vendor from reading these names
-- directly, so this is SECURITY DEFINER for the same narrow reason
-- `get_my_conversations` is: two display fields, for people the caller already
-- has a booking or quotation with.
-- ---------------------------------------------------------------------
create or replace function public.get_vendor_clients(p_vendor_id uuid default null)
returns table (
  client_id    uuid,
  display_name text,
  avatar_url   text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner  uuid := auth.uid();
  v_vendor uuid := p_vendor_id;
  v_count  integer;
begin
  if v_owner is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if v_vendor is null then
    select count(*), min(v.id) into v_count, v_vendor
      from public.vendors v
     where v.owner_id = v_owner and v.deleted_at is null;
    if v_count <> 1 then return; end if;
  elsif not public.is_vendor_owner(v_vendor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select distinct
    p.id,
    coalesce(nullif(trim(p.full_name), ''), 'Client'),
    p.avatar_url
  from public.profiles p
  where p.deleted_at is null
    and p.id <> v_owner
    and (
      exists (select 1 from public.bookings b
               where b.vendor_id = v_vendor and b.client_id = p.id and b.deleted_at is null)
      or exists (select 1 from public.quotations q
                  where q.vendor_id = v_vendor and q.client_id = p.id)
    )
  order by 2;
end;
$$;

revoke all on function public.get_vendor_clients(uuid) from public;
grant execute on function public.get_vendor_clients(uuid) to authenticated;
