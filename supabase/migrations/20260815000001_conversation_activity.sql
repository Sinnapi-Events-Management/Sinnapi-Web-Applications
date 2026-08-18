-- =====================================================================
-- Sinnapi — 0815a Conversation activity: last message denormalisation
--
-- WHY THIS EXISTS
-- `conversations.last_message_at` has been on the table since 0008 and has
-- never been written by anything. Every inbox in the platform orders by it
--
--   .order('last_message_at', { ascending: false, nullsFirst: false })
--
-- so today the sort is a no-op and every row renders "No messages yet" no
-- matter how long the thread is. The admin inbox papered over the preview by
-- embedding `messages(body, created_at, sender_id)` with a limit-1 ordered
-- sub-select, which is one lateral join per conversation on every inbox load,
-- and still could not fix the ordering.
--
-- The fix is a denormalised trio on `conversations`, maintained by trigger:
--   last_message_at         — the sort key the UI already asks for
--   last_message_preview    — the row snippet, so the inbox needs no join
--   last_message_sender_id  — lets "is this unread?" be answered without
--                             touching `messages` at all (see 0815c)
--
-- Denormalisation is the right trade here: the read is the inbox, which every
-- portal loads on every visit, and the write is one UPDATE on a row we already
-- have the id for. Consistency is guaranteed by recomputing from `messages`
-- rather than by trusting the trigger's NEW row — a soft delete of the newest
-- message has to promote the one before it, which an incremental update cannot
-- do.
--
-- Also here: `start_conversation` loses its `authenticated` grant. See the note
-- above that block — it is an unauthenticated-by-design privilege escalation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------
alter table public.conversations
  add column if not exists last_message_preview   text,
  add column if not exists last_message_sender_id uuid references public.profiles(id) on delete set null;

comment on column public.conversations.last_message_preview is
  'Denormalised snippet of the newest non-deleted message. Maintained by tg_message_touch_conversation; never write directly.';
comment on column public.conversations.last_message_sender_id is
  'Sender of the newest non-deleted message. Lets a reader decide "unread" without joining messages.';

-- The inbox only ever lists live conversations ordered by recency. A partial
-- index on that exact shape keeps the scan off the archived/deleted tail.
create index if not exists ix_conversations_live_recent
  on public.conversations (last_message_at desc nulls last)
  where deleted_at is null;

-- ---------------------------------------------------------------------
-- Recompute
--
-- Reads the newest surviving message and stamps the three columns. Called for
-- every mutation on `messages` rather than being folded into the trigger's NEW
-- row, because delete and edit both need the *previous* message promoted and
-- only a fresh read knows what that is.
-- ---------------------------------------------------------------------
create or replace function public.refresh_conversation_last_message(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at     timestamptz;
  v_body   text;
  v_sender uuid;
begin
  select m.created_at,
         -- System messages have no author-written body worth previewing but do
         -- carry status text, so they preview the same way.
         left(coalesce(m.body, ''), 180),
         m.sender_id
    into v_at, v_body, v_sender
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.deleted_at is null
    -- A message a moderator has taken down must not survive as the inbox
    -- preview. `messages_read` (0815d) hides the message itself from the
    -- participants, and this column is read straight off `conversations`,
    -- which that policy does not cover — so the text would leak into the one
    -- place both parties are guaranteed to look.
    and m.moderation_status <> 'blocked'
  order by m.created_at desc, m.id desc
  limit 1;

  update public.conversations c
     set last_message_at        = v_at,
         last_message_preview   = nullif(v_body, ''),
         last_message_sender_id = v_sender,
         updated_at             = now()
   where c.id = p_conversation_id
     -- Skip the write when nothing actually moved. Conversations are in the
     -- realtime publication with REPLICA IDENTITY FULL, so a no-op UPDATE would
     -- still fan out a full-row payload to every subscribed inbox.
     and (c.last_message_at is distinct from v_at
       or c.last_message_preview is distinct from nullif(v_body, '')
       or c.last_message_sender_id is distinct from v_sender);
end;
$$;

revoke all on function public.refresh_conversation_last_message(uuid) from public;

-- ---------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------
create or replace function public.tg_message_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_conversation_last_message(old.conversation_id);
    return old;
  end if;

  -- An edit that touches none of the inputs to the preview cannot change it.
  -- Skipping those matters because `conversations` is in the realtime
  -- publication with REPLICA IDENTITY FULL, so a pointless UPDATE fans a
  -- full-row payload out to every subscribed inbox.
  --
  -- `moderation_status` IS an input: a moderator blocking the newest message
  -- has to promote the one before it, or the taken-down text stays on the
  -- inbox row.
  if tg_op = 'UPDATE'
     and new.body is not distinct from old.body
     and new.deleted_at is not distinct from old.deleted_at
     and new.created_at is not distinct from old.created_at
     and new.moderation_status is not distinct from old.moderation_status then
    return new;
  end if;

  perform public.refresh_conversation_last_message(new.conversation_id);

  -- A message moved between threads would leave the old one stale.
  if tg_op = 'UPDATE' and new.conversation_id is distinct from old.conversation_id then
    perform public.refresh_conversation_last_message(old.conversation_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_message_touch_conversation on public.messages;
create trigger trg_message_touch_conversation
  after insert or update or delete on public.messages
  for each row execute function public.tg_message_touch_conversation();

-- ---------------------------------------------------------------------
-- Backfill
--
-- Every conversation created before this migration has a null sort key. Without
-- this, existing threads sort below brand-new empty ones forever.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select id from public.conversations loop
    perform public.refresh_conversation_last_message(r.id);
  end loop;
end$$;

-- ---------------------------------------------------------------------
-- Harden `start_conversation` (0014)
--
-- The original is SECURITY DEFINER, granted to `authenticated` by the blanket
-- grant in 0014, and performs an unconditional INSERT with zero checks on
-- `p_other_party`:
--
--   insert into conversations(type, subject, vendor_id, status, created_by) ...
--   insert into conversation_participants(...) values (v_id, auth.uid(), ...),
--                                                     (v_id, p_other_party, ...)
--
-- Any authenticated user can therefore enrol an arbitrary profile id into a
-- thread of an arbitrary type and immediately post into it — `messages_insert`
-- only asks that the sender be a participant, which the caller has just made
-- themselves. That is unsolicited direct messaging to any user on the platform,
-- and it bypasses the `vendor_is_public` gate that
-- `get_or_create_client_vendor_conversation` exists to enforce.
--
-- Nothing in any portal calls it: every real path goes through one of the three
-- find-or-create RPCs, each of which resolves the counterparty itself and
-- authorises the pairing. So the grant is withdrawn rather than the signature
-- patched — a function no caller needs is better closed than guarded.
-- ---------------------------------------------------------------------
revoke all on function public.start_conversation(conversation_type, uuid, uuid, text) from public;
revoke all on function public.start_conversation(conversation_type, uuid, uuid, text) from authenticated;
revoke all on function public.start_conversation(conversation_type, uuid, uuid, text) from anon;

comment on function public.start_conversation(conversation_type, uuid, uuid, text) is
  'DEPRECATED and un-granted (0815a): performed an unauthorised INSERT of any profile into any thread. Use get_or_create_client_vendor_conversation / _client_admin_ / _client_support_ / _vendor_support_ instead.';
