-- =====================================================================
-- Sinnapi — 0815f The inbox, resolved server-side
--
-- WHY THIS EXISTS
-- An inbox row has to name who the conversation is with, and no portal can
-- work that out from the browser.
--
-- `profiles_self_read` (0011) is:
--     using (id = auth.uid() or has_permission('users.read') or is_admin())
--
-- so a vendor cannot read the client's `full_name`, and a client cannot read
-- the profile of the person behind a vendor account. That is the correct
-- policy — a marketplace should not let either side enumerate the other's
-- identity rows — but it means an embedded
-- `conversation_participants(profiles(full_name))` returns nothing to either of
-- them.
--
-- The portals have been living with the consequences. The client inbox reads
-- `vendors(business_name)`, which works only because `vendors` is publicly
-- readable and only for `client_vendor` threads: support threads fall through
-- to `titleize(type)` and render as the literal string "Client Admin". The
-- vendor inbox selected no relation at all, so every thread it has ever shown
-- was titled "Client Vendor". The admin inbox has the same hole for support.
--
-- So resolution moves to one SECURITY DEFINER function. It discloses exactly
-- two fields — display name and avatar — and only for people the caller is
-- already in a conversation with. That is strictly narrower than granting
-- `users.read`, which is the alternative and would open every profile on the
-- platform.
--
-- It also collapses what was three round trips (conversations, unread counts,
-- and per-row relation embeds) into one call.
-- =====================================================================
create or replace function public.get_my_conversations()
returns table (
  id                      uuid,
  type                    conversation_type,
  subject                 text,
  status                  conversation_status,
  vendor_id               uuid,
  created_at              timestamptz,
  last_message_at         timestamptz,
  last_message_preview    text,
  last_message_sender_id  uuid,
  counterparty_id         uuid,
  counterparty_name       text,
  counterparty_avatar_url text,
  unread_count            integer,
  last_read_at            timestamptz,
  is_muted                boolean,
  -- True when the caller sees this through moderation rather than membership.
  is_observer             boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me        uuid := auth.uid();
  v_moderator boolean;
begin
  if v_me is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  v_moderator := public.has_permission('moderation.manage');

  return query
  with visible as (
    -- Mirrors `convo_read` exactly. If these ever disagree the RPC becomes a
    -- way to see rows RLS would refuse, so it is written as the same predicate
    -- rather than a convenient approximation of it.
    select c.*
    from public.conversations c
    where c.deleted_at is null
      and (v_moderator or exists (
        select 1 from public.conversation_participants cp
        where cp.conversation_id = c.id and cp.profile_id = v_me
      ))
  ),
  mine as (
    select cp.conversation_id, cp.last_read_at, cp.is_muted
    from public.conversation_participants cp
    where cp.profile_id = v_me
  ),
  other as (
    -- The counterparty. For a moderator observing a thread they are not in,
    -- "the other party" is ambiguous by definition — there are two — so a
    -- non-admin participant is preferred and ties break on join order, rather
    -- than leaving the choice to the planner.
    select distinct on (cp.conversation_id)
           cp.conversation_id, cp.profile_id, cp.role_in_convo
    from public.conversation_participants cp
    where cp.profile_id <> v_me
    order by cp.conversation_id, (cp.role_in_convo = 'admin'), cp.created_at
  )
  select
    v.id, v.type, v.subject, v.status, v.vendor_id, v.created_at,
    v.last_message_at, v.last_message_preview, v.last_message_sender_id,
    o.profile_id,
    case
      -- Sinnapi never appears as the individual operator who happens to be on
      -- shift. To a client or a vendor, support is one entity with continuity.
      when o.role_in_convo = 'admin'
        or (o.profile_id is null and v.type in ('client_admin', 'vendor_admin'))
        then 'Sinnapi support'
      -- A vendor is named by its business, not by whoever owns the login.
      when vend.id is not null and vend.owner_id = o.profile_id then vend.business_name
      else coalesce(nullif(trim(p.full_name), ''), 'Sinnapi user')
    end,
    case
      when o.role_in_convo = 'admin' and o.profile_id is not null then null
      when vend.id is not null and vend.owner_id = o.profile_id then vend.profile_image_url
      else p.avatar_url
    end,
    case
      -- An observer has no participant row, so counting against a null
      -- `last_read_at` would report every message in the thread as unread and
      -- turn a moderator's inbox into a permanent wall of red for
      -- conversations that are not theirs to answer.
      when mn.conversation_id is null then 0
      else (
        select count(*)::integer
        from public.messages m
        where m.conversation_id = v.id
          and m.deleted_at is null
          and m.sender_id <> v_me
          and m.is_system = false
          and m.moderation_status <> 'blocked'
          and (mn.last_read_at is null or m.created_at > mn.last_read_at)
      )
    end,
    mn.last_read_at,
    coalesce(mn.is_muted, false),
    (mn.conversation_id is null)
  from visible v
  left join mine mn on mn.conversation_id = v.id
  left join other o on o.conversation_id = v.id
  left join public.vendors vend on vend.id = v.vendor_id
  left join public.profiles p on p.id = o.profile_id
  order by v.last_message_at desc nulls last, v.created_at desc;
end;
$$;

revoke all on function public.get_my_conversations() from public;
grant execute on function public.get_my_conversations() to authenticated;

comment on function public.get_my_conversations() is
  'Inbox for the calling user with the counterparty resolved. Discloses only display name and avatar, and only for conversations the caller can already read under convo_read.';
