-- =====================================================================
-- Sinnapi — 0816h Repair: vendor resolution in the conversation RPCs
--
-- WHAT WAS BROKEN
--   ERROR 42883: function min(uuid) does not exist
--
-- 0815b and 0815g both resolve "the caller's vendor, if they own exactly one"
-- with `select count(*), min(v.id) into v_count, v_vendor`. Postgres has no
-- `min`/`max` aggregate for `uuid`, so that statement never executes — it fails
-- at call time, not at create time, which is why `create or replace` accepted
-- all three functions and nothing complained until a vendor pressed the button.
--
-- The branch is not an edge case: `useStartConversation` calls both RPCs with
-- no `p_vendor_id`, and `get_vendor_clients()` takes no argument at all, so
-- every vendor-side call in the portal took the broken path. Vendor → client
-- messaging, vendor → support messaging, and the client picker were all dead.
--
-- The fix is an ordered `array_agg` — count and pick still happen in one scan,
-- and `order by created_at` means the implicit choice is the owner's first
-- business rather than whichever uuid sorted lowest.
--
-- Folded in while these bodies are being replaced anyway: the relationship gate
-- filtered `bookings.deleted_at` but not `quotations.deleted_at`, so a deleted
-- quotation kept a vendor's messaging rights alive indefinitely.
--
-- 0815b and 0815g are left exactly as they were applied — a migration that has
-- already run is history, and editing one in place fixes nothing on a database
-- that has run it while quietly diverging the file from what that database
-- actually contains. Both keep their broken bodies; this migration is the only
-- place these three functions are correct, and from here it is where they are
-- maintained. On a fresh `db reset` the broken versions are created and then
-- immediately dropped by this file, so the end state is identical either way.
--
-- WHY DROP RATHER THAN `create or replace`
-- `create or replace` cannot change a function's return type, and it leaves any
-- overload with a different argument list standing — a stale
-- `get_vendor_clients(uuid, text)` from an earlier iteration would keep
-- resolving ahead of this one for some call shapes and the bug would look
-- half-fixed. Dropping first makes the post-migration state depend only on this
-- file. Nothing in the schema references these three (no view, policy, trigger,
-- or other function body), so there is nothing to cascade into and `cascade` is
-- deliberately not used — if a future dependency appears, this should fail
-- loudly rather than quietly delete it.
--
-- The drop is by name over `pg_proc`, not by a hand-written signature, so every
-- overload goes regardless of what the deployed database actually has. Grants
-- do not survive a drop; each function re-states its own below.
-- =====================================================================

do $$
declare
  r record;
begin
  for r in
    select n.nspname                                  as schema_name,
           p.proname                                  as func_name,
           pg_get_function_identity_arguments(p.oid)  as arg_list
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and p.proname in (
         'get_or_create_vendor_support_conversation',
         'get_or_create_vendor_client_conversation',
         'get_vendor_clients'
       )
  loop
    -- Schema-qualified explicitly rather than leaning on `regprocedure`, whose
    -- output drops the schema whenever it is already on the search_path.
    execute format('drop function %I.%I(%s)', r.schema_name, r.func_name, r.arg_list);
    raise notice 'dropped %.%(%)', r.schema_name, r.func_name, r.arg_list;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- VENDOR → Sinnapi support (0815b)
--
-- `p_vendor_id` is optional: most owners run exactly one business and the
-- portal should not make them pick. When they own several, passing the id is
-- required — silently filing a question against whichever vendor sorted first
-- would send the operator to the wrong account.
-- ---------------------------------------------------------------------
create function public.get_or_create_vendor_support_conversation(p_vendor_id uuid default null)
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
    -- No `min(uuid)` in Postgres — ordered aggregate instead, oldest business
    -- first rather than lowest uuid.
    select count(*), (array_agg(v.id order by v.created_at, v.id))[1]
      into v_count, v_vendor
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
-- VENDOR → client (0815g)
-- ---------------------------------------------------------------------
create function public.get_or_create_vendor_client_conversation(
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
    select count(*), (array_agg(v.id order by v.created_at, v.id))[1]
      into v_count, v_vendor
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
  --
  -- Two `exists` rather than one `union all`: either subquery alone settles it,
  -- and each hits its own (vendor_id, …) index instead of building a union.
  -- Both sides filter `deleted_at` — a deleted quotation is not a standing
  -- relationship, and leaving that off let a vendor keep messaging a client
  -- whose only tie to them had been deleted.
  if not exists (
        select 1 from public.bookings b
         where b.vendor_id = v_vendor and b.client_id = p_client_id
           and b.deleted_at is null
      )
     and not exists (
        select 1 from public.quotations q
         where q.vendor_id = v_vendor and q.client_id = p_client_id
           and q.deleted_at is null
      )
  then
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
-- The picker's candidate list (0815g)
--
-- Deliberately the same predicate the RPC enforces — a picker that offered
-- names the RPC would then refuse is a UI that lies — and resolved to the same
-- vendor, since a picker that resolved a different one would list the wrong
-- people and one that errored listed nobody.
-- ---------------------------------------------------------------------
create function public.get_vendor_clients(p_vendor_id uuid default null)
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
    select count(*), (array_agg(v.id order by v.created_at, v.id))[1]
      into v_count, v_vendor
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
               where b.vendor_id = v_vendor and b.client_id = p.id
                 and b.deleted_at is null)
      or exists (select 1 from public.quotations q
                  where q.vendor_id = v_vendor and q.client_id = p.id
                    and q.deleted_at is null)
    )
  -- By name, then by id so two clients sharing a display name hold a stable
  -- position between renders rather than swapping places.
  order by 2, 1;
end;
$$;

revoke all on function public.get_vendor_clients(uuid) from public;
grant execute on function public.get_vendor_clients(uuid) to authenticated;
