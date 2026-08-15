-- =====================================================================
-- Sinnapi — 0815b Self-service support threads
--
-- WHY THIS EXISTS
-- The `conversation_type` enum has carried `client_admin` and `vendor_admin`
-- since 0001, but nothing lets the client or the vendor open one:
--
--   * `get_or_create_client_admin_conversation` (0718b) is gated on
--     `has_permission('users.manage')` — an operator reaching out, not a client
--     asking for help.
--   * `vendor_admin` had no creator at all.
--   * `start_conversation` could technically make either, which is precisely
--     why its grant is withdrawn in 0815a.
--
-- So "Contact Sinnapi" was unreachable from both the client and the vendor
-- portal. These two RPCs are the missing half: same shape as 0718b, but the
-- caller is the subject rather than the operator.
--
-- ONE THREAD, NOT A TICKET QUEUE
-- Both are find-or-create against a single durable thread per account. Support
-- reads as an ongoing relationship — the person asking about a payout today is
-- the person who asked about onboarding last month, and an operator opening the
-- thread should see that history rather than a stub. A fresh thread per
-- question would also let a client spam the moderation inbox by tapping twice.
--
-- THE JOIN PROBLEM
-- A client-created support thread has exactly one participant: the client.
-- Admins can *read* it (`convo_read` allows `moderation.manage`), but
-- `messages_insert` requires participation, so the first operator to open it
-- could read and not reply. `join_support_conversation` closes that: it enrols
-- the calling operator on demand, which is what 0718b did inline for the
-- admin-initiated case.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared guard: is the caller a live account that may raise support?
--
-- Deliberately does NOT check `profiles.status`. A suspended or blocked account
-- is the account most likely to need to reach a human, and locking support
-- behind good standing means the only route back is email — which the portal
-- does not surface either.
-- ---------------------------------------------------------------------
create or replace function public.can_open_support_thread(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_profile_id and p.deleted_at is null
  );
$$;

revoke all on function public.can_open_support_thread(uuid) from public;

-- ---------------------------------------------------------------------
-- CLIENT → Sinnapi
-- ---------------------------------------------------------------------
create or replace function public.get_or_create_client_support_conversation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_convo  uuid;
begin
  if v_client is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_open_support_thread(v_client) then
    raise exception 'account_unavailable' using errcode = 'P0002';
  end if;

  -- Vendors have their own support type; routing them here would file a vendor
  -- payout question in the client queue.
  if not exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = v_client and r.key in ('client', 'event_planner')
  ) then
    raise exception 'not_a_client' using errcode = 'P0002';
  end if;

  -- Matched on the caller's own participation, not on type alone — otherwise
  -- the first client_admin thread in the table would be handed to everyone.
  -- Same predicate 0718b uses, so both entry points converge on one thread.
  select c.id into v_convo
  from public.conversations c
  join public.conversation_participants cp
    on cp.conversation_id = c.id and cp.profile_id = v_client
  where c.type = 'client_admin'
    and c.deleted_at is null
  order by c.created_at asc
  limit 1;

  if v_convo is null then
    insert into public.conversations (type, subject, status, created_by)
    values ('client_admin', 'Sinnapi support', 'active', v_client)
    returning id into v_convo;

    insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
    values (v_convo, v_client, 'client')
    on conflict (conversation_id, profile_id) do nothing;
  end if;

  -- Reopen rather than stall: a client writing into a thread an operator
  -- archived months ago is a new request, and leaving it archived would hide it
  -- from the default inbox tab where operators actually work.
  update public.conversations
     set status = 'active'
   where id = v_convo and status = 'archived';

  return v_convo;
end;
$$;

revoke all on function public.get_or_create_client_support_conversation() from public;
grant execute on function public.get_or_create_client_support_conversation() to authenticated;

-- ---------------------------------------------------------------------
-- VENDOR → Sinnapi
--
-- `p_vendor_id` is optional: most owners run exactly one business and the
-- portal should not make them pick. When they own several, passing the id is
-- required — silently filing a question against whichever vendor sorted first
-- would send the operator to the wrong account.
-- ---------------------------------------------------------------------
create or replace function public.get_or_create_vendor_support_conversation(p_vendor_id uuid default null)
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

  if not public.can_open_support_thread(v_owner) then
    raise exception 'account_unavailable' using errcode = 'P0002';
  end if;

  if v_vendor is null then
    select count(*), min(v.id) into v_count, v_vendor
      from public.vendors v
     where v.owner_id = v_owner and v.deleted_at is null;

    if v_count = 0 then raise exception 'not_a_vendor' using errcode = 'P0002'; end if;
    if v_count > 1 then raise exception 'vendor_required' using errcode = 'P0002'; end if;
  elsif not public.is_vendor_owner(v_vendor) then
    -- Not `_forbidden()`: the caller may legitimately be a vendor owner who
    -- passed someone else's id, and the distinct code lets the portal say so.
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select business_name into v_name from public.vendors where id = v_vendor;

  -- Scoped by `vendor_id` as well as participation, so an owner with two
  -- businesses gets one support thread per business rather than one shared
  -- thread whose subject lies about which account is being discussed.
  select c.id into v_convo
  from public.conversations c
  join public.conversation_participants cp
    on cp.conversation_id = c.id and cp.profile_id = v_owner
  where c.type = 'vendor_admin'
    and c.vendor_id = v_vendor
    and c.deleted_at is null
  order by c.created_at asc
  limit 1;

  if v_convo is null then
    insert into public.conversations (type, subject, vendor_id, status, created_by)
    values ('vendor_admin',
            left(coalesce(v_name || ' — support', 'Sinnapi support'), 200),
            v_vendor, 'active', v_owner)
    returning id into v_convo;

    insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
    values (v_convo, v_owner, 'vendor')
    on conflict (conversation_id, profile_id) do nothing;
  end if;

  update public.conversations
     set status = 'active'
   where id = v_convo and status = 'archived';

  return v_convo;
end;
$$;

revoke all on function public.get_or_create_vendor_support_conversation(uuid) from public;
grant execute on function public.get_or_create_vendor_support_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- OPERATOR joins a support thread
--
-- Enrols the caller so they can reply. Restricted to the two support types:
-- `client_vendor` threads are visible to moderators for oversight, and an
-- operator silently appearing as a participant in a private client↔vendor
-- negotiation is a different and much larger decision than answering a support
-- request addressed to Sinnapi.
-- ---------------------------------------------------------------------
create or replace function public.join_support_conversation(p_conversation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_type  conversation_type;
begin
  if v_admin is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.has_permission('moderation.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select type into v_type
    from public.conversations
   where id = p_conversation_id and deleted_at is null;

  if v_type is null then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;

  if v_type not in ('client_admin', 'vendor_admin') then
    raise exception 'not_a_support_thread' using errcode = '42501';
  end if;

  insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
  values (p_conversation_id, v_admin, 'admin')
  on conflict (conversation_id, profile_id) do nothing;

  return p_conversation_id;
end;
$$;

revoke all on function public.join_support_conversation(uuid) from public;
grant execute on function public.join_support_conversation(uuid) to authenticated;
