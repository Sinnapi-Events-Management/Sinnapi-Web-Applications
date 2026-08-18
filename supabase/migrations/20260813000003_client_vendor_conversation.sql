-- =====================================================================
-- Sinnapi — 0813c Client ↔ vendor conversations: find-or-create
--
-- WHY THIS EXISTS
-- The quotation detail page gives the client a "Message vendor" control, which
-- is the natural move when a quote is nearly right — asking one question is
-- cheaper for both sides than a formal revision round trip.
--
-- `start_conversation` cannot serve it. It is an unconditional INSERT: every
-- tap would open another thread with the same vendor, and after a week of
-- quote-shopping the client's inbox is a list of duplicate titles with one
-- message each. It also requires the caller to supply the vendor's owner
-- profile id, which means reading `vendors.owner_id` in the browser purely to
-- pass it back — a detail of who runs a business that no client screen shows.
--
-- This mirrors `get_or_create_client_admin_conversation` from 0718b, for the
-- same reason it was written: RLS has no INSERT policy on `conversations` /
-- `conversation_participants`, so the find-or-create belongs in one
-- SECURITY DEFINER path that resolves the other party itself.
--
-- Idempotent: a second call returns the same thread. The client is enrolled as
-- `client` and the vendor's owner as `vendor`, which is what `messages_insert`
-- checks before letting either of them post.
-- =====================================================================
create or replace function public.get_or_create_client_vendor_conversation(p_vendor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := auth.uid();
  v_owner  uuid;
  v_name   text;
  v_convo  uuid;
begin
  if v_client is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Only a vendor the client could have reached in the first place. A vendor
  -- who has been suspended or hidden should not become reachable through a
  -- quote the client happens to still be holding.
  if not public.vendor_is_public(p_vendor_id) then
    raise exception 'vendor_unavailable' using errcode = 'P0002';
  end if;

  select owner_id, business_name into v_owner, v_name
    from public.vendors where id = p_vendor_id;
  if v_owner is null then raise exception 'vendor_not_found' using errcode = 'P0002'; end if;

  -- The vendor's own owner opening a thread with themselves is not a
  -- conversation, and enrolling one profile under two roles would break the
  -- participant lookup for everyone.
  if v_owner = v_client then perform public._forbidden(); end if;

  -- Reuse the pair's existing thread if one exists. Matched on both
  -- participants, not on `vendor_id` alone, so two clients quoting the same
  -- vendor never land in each other's conversation.
  select c.id into v_convo
  from public.conversations c
  join public.conversation_participants me    on me.conversation_id = c.id and me.profile_id = v_client
  join public.conversation_participants other on other.conversation_id = c.id and other.profile_id = v_owner
  where c.type = 'client_vendor'
    and c.vendor_id = p_vendor_id
    and c.deleted_at is null
  order by c.created_at asc
  limit 1;

  if v_convo is null then
    insert into public.conversations (type, subject, vendor_id, status, created_by)
    values ('client_vendor', left(coalesce(v_name, 'Vendor enquiry'), 200),
            p_vendor_id, 'active', v_client)
    returning id into v_convo;

    insert into public.conversation_participants (conversation_id, profile_id, role_in_convo)
    values (v_convo, v_client, 'client'), (v_convo, v_owner, 'vendor')
    on conflict (conversation_id, profile_id) do nothing;
  end if;

  return v_convo;
end;
$$;

revoke all on function public.get_or_create_client_vendor_conversation(uuid) from public;
grant execute on function public.get_or_create_client_vendor_conversation(uuid) to authenticated;
