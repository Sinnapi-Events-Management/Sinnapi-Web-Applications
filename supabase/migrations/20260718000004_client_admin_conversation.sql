-- =====================================================================
-- Sinnapi — 0023 Admin ↔ client conversations
--
-- The admin-portal client detail page lets an operator chat with a client. RLS
-- has no INSERT policy on `conversations` / `conversation_participants` (they're
-- only ever created through controlled paths), so a SECURITY DEFINER RPC owns
-- the find-or-create: it returns the id of the `client_admin` conversation for a
-- client, creating it — and enrolling both the client and the calling admin as
-- participants — on first use.
--
-- Enrolling the caller matters: `messages_insert` requires the sender to be a
-- participant (see 0011_rls.sql), so without this an admin could read a thread
-- (via moderation.manage) but never reply.
-- =====================================================================
create or replace function public.get_or_create_client_admin_conversation(p_client_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_convo uuid;
begin
  if v_admin is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Only staff who manage users may open an admin↔client thread.
  if not public.has_permission('users.manage') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Target must be a real, non-deleted client (client / event_planner).
  if not exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r on r.id = ur.role_id
    where p.id = p_client_id
      and p.deleted_at is null
      and r.key in ('client', 'event_planner')
  ) then
    raise exception 'not_a_client' using errcode = 'P0002';
  end if;

  -- Reuse the client's existing admin thread if one exists.
  select c.id
    into v_convo
  from public.conversations c
  join public.conversation_participants cp
    on cp.conversation_id = c.id and cp.profile_id = p_client_id
  where c.type = 'client_admin'
    and c.deleted_at is null
  order by c.created_at
  limit 1;

  if v_convo is null then
    insert into public.conversations (type, subject, status, created_by)
    values ('client_admin', 'Support', 'active', v_admin)
    returning id into v_convo;

    insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
    values (v_convo, p_client_id, 'client');
  end if;

  -- Ensure the calling admin is enrolled so they can post.
  insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
  values (v_convo, v_admin, 'admin')
  on conflict (conversation_id, profile_id) do nothing;

  return v_convo;
end;
$$;

revoke all on function public.get_or_create_client_admin_conversation(uuid) from public;
grant execute on function public.get_or_create_client_admin_conversation(uuid) to authenticated;
