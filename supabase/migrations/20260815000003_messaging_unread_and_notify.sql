-- =====================================================================
-- Sinnapi — 0815c Unread state, thread controls, and new-message notifications
--
-- WHY THIS EXISTS
-- Three gaps, all of which forced work into the browser that belongs in the
-- database:
--
-- 1. UNREAD. The admin inbox derives "unread" client-side by embedding the
--    newest message per conversation and comparing it to a separately-fetched
--    list of participant rows. That is two round trips, a limit-1 lateral join
--    per conversation, and a boolean rather than a count — and the client and
--    vendor portals do not attempt it at all. `get_conversation_unread` returns
--    the whole picture in one indexed call.
--
-- 2. THREAD CONTROLS. `conversation_participants.is_muted` is *rendered* by the
--    admin inbox and can never be set: there is no UPDATE policy on the table.
--    Same for archiving a conversation. Both go through SECURITY DEFINER RPCs
--    for the same reason `mark_conversation_read` does.
--
-- 3. NOTIFICATIONS. A message arriving while the recipient is elsewhere in the
--    product produced nothing at all — no bell, no email. Emission follows the
--    escrow pattern from 0809d: a row on `public.outbox` carrying a resolved
--    payload and a `recipient_id`, which the existing worker renders through
--    `notification_templates`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- UNREAD
--
-- One row per conversation the caller participates in. `security definer`
-- because it counts rows in `messages` for conversations the caller belongs to;
-- the WHERE clause on `cp.profile_id = auth.uid()` is what scopes it, and it is
-- the only thing that does — do not relax it.
-- ---------------------------------------------------------------------
create or replace function public.get_conversation_unread()
returns table (
  conversation_id uuid,
  unread_count    integer,
  last_read_at    timestamptz,
  is_muted        boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.conversation_id,
    (
      select count(*)::integer
      from public.messages m
      where m.conversation_id = cp.conversation_id
        and m.deleted_at is null
        -- Your own messages are never unread to you, and a system message is
        -- an announcement rather than something awaiting a reply.
        and m.sender_id <> auth.uid()
        and m.is_system = false
        and (cp.last_read_at is null or m.created_at > cp.last_read_at)
    ) as unread_count,
    cp.last_read_at,
    cp.is_muted
  from public.conversation_participants cp
  join public.conversations c
    on c.id = cp.conversation_id
   and c.deleted_at is null
  where cp.profile_id = auth.uid();
$$;

revoke all on function public.get_conversation_unread() from public;
grant execute on function public.get_conversation_unread() to authenticated;

-- Single number for the nav badge. Muted threads are excluded: muting is the
-- user saying "stop counting this at me", and a badge that keeps ticking is the
-- exact thing they turned off.
create or replace function public.get_unread_message_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(u.unread_count), 0)::integer
  from public.get_conversation_unread() u
  where u.is_muted = false;
$$;

revoke all on function public.get_unread_message_count() from public;
grant execute on function public.get_unread_message_count() to authenticated;

-- ---------------------------------------------------------------------
-- READ RECEIPT
--
-- Re-declared to return the stamped timestamp. The original returned void, so
-- the caller had to refetch to learn what "read" now means and could not
-- reconcile an optimistic badge clear against the server's clock.
--
-- The stamp only ever moves forward. Two tabs open on the same thread will race
-- otherwise, and the older tab winning would resurrect an unread badge the user
-- has already cleared.
-- ---------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare v_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  update public.conversation_participants
     set last_read_at = now()
   where conversation_id = p_conversation_id
     and profile_id = auth.uid()
     and (last_read_at is null or last_read_at < now())
  returning last_read_at into v_at;

  if v_at is null then
    select last_read_at into v_at
      from public.conversation_participants
     where conversation_id = p_conversation_id and profile_id = auth.uid();
  end if;

  return v_at;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- MUTE
--
-- Scoped to the caller's own participant row, so muting is a personal setting:
-- an admin silencing a noisy thread must not silence it for the client.
-- ---------------------------------------------------------------------
create or replace function public.set_conversation_muted(p_conversation_id uuid, p_muted boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_muted boolean;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  update public.conversation_participants
     set is_muted = coalesce(p_muted, false)
   where conversation_id = p_conversation_id
     and profile_id = auth.uid()
  returning is_muted into v_muted;

  if v_muted is null then
    raise exception 'not_a_participant' using errcode = '42501';
  end if;

  return v_muted;
end;
$$;

revoke all on function public.set_conversation_muted(uuid, boolean) from public;
grant execute on function public.set_conversation_muted(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- ARCHIVE / REOPEN
--
-- `blocked` is deliberately not reachable here. Blocking a thread is a
-- moderation decision with consequences for the other party, and it belongs
-- with the moderation tooling rather than in a participant's own archive
-- control.
-- ---------------------------------------------------------------------
create or replace function public.set_conversation_status(p_conversation_id uuid, p_status conversation_status)
returns conversation_status
language plpgsql
security definer
set search_path = public
as $$
declare v_status conversation_status;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_status not in ('active', 'archived') then
    raise exception 'unsupported_status' using errcode = '22023';
  end if;

  if not (public.is_conversation_participant(p_conversation_id)
          or public.has_permission('moderation.manage')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.conversations
     set status = p_status
   where id = p_conversation_id
     and deleted_at is null
     -- A moderator-imposed block is not something either party may lift by
     -- archiving and unarchiving their own copy of the thread.
     and status <> 'blocked'
  returning status into v_status;

  if v_status is null then
    raise exception 'conversation_unavailable' using errcode = 'P0002';
  end if;

  return v_status;
end;
$$;

revoke all on function public.set_conversation_status(uuid, conversation_status) from public;
grant execute on function public.set_conversation_status(uuid, conversation_status) to authenticated;

-- ---------------------------------------------------------------------
-- NEW-MESSAGE NOTIFICATIONS
--
-- Emits one outbox row per other participant. Two suppressions matter:
--
--   * MUTED participants get nothing, which is the whole point of the flag.
--
--   * ONLY THE FIRST UNREAD notifies. A ten-message back-and-forth while the
--     recipient is away should produce one nudge, not ten emails. If the
--     recipient already has unread messages in this thread they have already
--     been told, so the trigger stays quiet until they read and the counter
--     resets. This is the same digest behaviour every real messaging product
--     ships, and it is far cheaper than a scheduled batcher.
-- ---------------------------------------------------------------------
create or replace function public.tg_message_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c            public.conversations;
  v_sender     text;
  v_payload    jsonb;
  r            record;
  v_prior      integer;
begin
  -- System messages narrate a state change that has already sent its own
  -- notification through the aggregate that caused it.
  if new.is_system then return new; end if;

  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null then return new; end if;

  select nullif(trim(p.full_name), '') into v_sender
  from public.profiles p where p.id = new.sender_id;

  -- A client↔vendor thread is a business relationship, so the sender is named
  -- by their business rather than the person who happens to own the account.
  if c.type = 'client_vendor' and c.vendor_id is not null then
    select coalesce(v.business_name, v_sender) into v_sender
    from public.vendors v
    where v.id = c.vendor_id and v.owner_id = new.sender_id;
  end if;

  v_payload := jsonb_build_object(
    'conversation_id',   c.id,
    'conversation_type', c.type,
    'subject',           c.subject,
    'vendor_id',         c.vendor_id,
    'message_id',        new.id,
    'sender_id',         new.sender_id,
    'sender_name',       coalesce(v_sender, 'Someone'),
    -- Enough to recognise the thread in a notification list, not enough to
    -- leak a private conversation into an email preview pane.
    'excerpt',           left(coalesce(new.body, ''), 140)
  );

  for r in
    select cp.profile_id, cp.last_read_at
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.profile_id <> new.sender_id
      and cp.is_muted = false
  loop
    -- Messages from others, older than this one, that the recipient has not
    -- read. Non-zero means a nudge is already outstanding.
    select count(*)::integer into v_prior
    from public.messages m
    where m.conversation_id = new.conversation_id
      and m.id <> new.id
      and m.deleted_at is null
      and m.is_system = false
      and m.sender_id <> r.profile_id
      and m.created_at <= new.created_at
      and (r.last_read_at is null or m.created_at > r.last_read_at);

    if v_prior = 0 then
      insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
      values ('conversations', c.id, 'message.received',
              v_payload || jsonb_build_object('recipient_id', r.profile_id),
              'pending', now());
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_message_notify on public.messages;
create trigger trg_message_notify
  after insert on public.messages
  for each row execute function public.tg_message_notify();

-- ---------------------------------------------------------------------
-- Copy. Seeded as data so Support can reword without a deploy, matching 0809d.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
  ('message.received', 'in_app', 'New message from {{sender_name}}',
   '{{excerpt}}', 'en'),
  ('message.received', 'email', '{{sender_name}} sent you a message on Sinnapi',
   'You have a new message from {{sender_name}}.' || chr(10) || chr(10) ||
   '"{{excerpt}}"' || chr(10) || chr(10) ||
   'Open Sinnapi to read the full conversation and reply.', 'en')
on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;

-- ---------------------------------------------------------------------
-- Supporting index
--
-- Both the unread count and the notification suppression ask the same
-- question: "messages in this thread, after this timestamp, not from me".
-- The existing ix_messages_convo (conversation_id, created_at) serves the range
-- scan; this partial index keeps the soft-deleted and system rows out of it.
-- ---------------------------------------------------------------------
create index if not exists ix_messages_convo_live
  on public.messages (conversation_id, created_at)
  where deleted_at is null and is_system = false;
