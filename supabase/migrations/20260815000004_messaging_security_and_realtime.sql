-- =====================================================================
-- Sinnapi — 0815d Messaging RLS hardening, attachment access, realtime
--
-- WHY THIS EXISTS
-- Turning on attachments and live delivery exposed three gaps in the 0011/0013
-- policies that were harmless only because nothing used those features yet.
--
-- 1. FORGED SYSTEM MESSAGES. `messages_insert` checks the sender and the
--    participation and nothing else, so any participant can post
--    `{ is_system: true, moderation_status: 'clean' }`. The portals render
--    system messages as platform copy — centred, unattributed, styled as
--    Sinnapi speaking. A vendor could post "Sinnapi has verified this vendor's
--    licence" in that voice, inside a thread with a client who is deciding
--    whether to pay them. The same insert can self-clear moderation.
--
-- 2. WRITES INTO CLOSED THREADS. A `blocked` conversation is a moderation
--    decision; RLS let both parties keep posting into it and only the admin
--    portal's UI declined to. The client and vendor portals had no such check.
--
-- 3. UNREADABLE ATTACHMENTS. `chat_read` on storage.objects grants
--    `owner = auth.uid()`, i.e. only the uploader. The person the file was sent
--    to could not open it. The bucket has existed since 0013 and no code path
--    ever exercised it, so this has never been observed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: text → uuid without raising.
--
-- Storage object names are user-supplied; a path whose first segment is not a
-- uuid must fail the policy, not abort the request with 22P02.
-- ---------------------------------------------------------------------
create or replace function public.try_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 1 + 2. Message insert
--
-- `is_system` and `moderation_status` become server-owned. Both get defaults
-- that already match the honest value, so ordinary inserts are unaffected —
-- what changes is that a hand-rolled request can no longer choose them.
-- ---------------------------------------------------------------------
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    -- Only the platform speaks as the platform. System rows are written by
    -- SECURITY DEFINER code, which is not subject to this policy.
    and is_system = false
    -- Moderation is something done *to* a message, never something it may
    -- claim about itself.
    and moderation_status = 'pending'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.deleted_at is null
        and c.status = 'active'
    )
  );

-- The composer in every portal sends `moderation_status: 'pending'` explicitly
-- today. The default makes that redundant rather than required, so a caller
-- that omits it still satisfies the policy above.
alter table public.messages alter column moderation_status set default 'pending';

-- ---------------------------------------------------------------------
-- Message update
--
-- The 0011 policy let a sender UPDATE their own row with no column restriction,
-- which re-opens (1) one statement later: insert clean, then set
-- `is_system = true`. Editing a body is the only thing a sender legitimately
-- does here; everything else is moderation's.
-- ---------------------------------------------------------------------
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (
    (sender_id = auth.uid() and is_system = false)
    or public.has_permission('moderation.manage')
  )
  with check (
    (sender_id = auth.uid() and is_system = false)
    or public.has_permission('moderation.manage')
  );

-- Which columns a sender may actually move. This is a trigger rather than more
-- predicate in the policy above because the rule is about the *transition*
-- (old vs new), and a WITH CHECK clause only ever sees the new row — a
-- predicate like `moderation_status <> 'clean'` would read as "you may not
-- edit a message a moderator has already approved", which is not the rule.
create or replace function public.tg_message_guard_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Moderators and SECURITY DEFINER callers are trusted with the whole row.
  if public.has_permission('moderation.manage') or auth.uid() is null then
    return new;
  end if;

  if new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id
     or new.is_system is distinct from old.is_system
     or new.created_at is distinct from old.created_at
     -- Self-clearing moderation is the whole reason this guard exists.
     or new.moderation_status is distinct from old.moderation_status then
    raise exception 'immutable_message_fields' using errcode = '42501';
  end if;

  -- Stamp rather than trust: an edit marker the editor can clear is not a
  -- marker. Only set when the body actually moved, so a soft delete does not
  -- present itself as an edit.
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_message_guard_edit on public.messages;
create trigger trg_message_guard_edit
  before update on public.messages
  for each row execute function public.tg_message_guard_edit();

-- ---------------------------------------------------------------------
-- Hide blocked messages from the thread
--
-- `messages_read` returned every row regardless of `moderation_status`, so a
-- message a moderator has *blocked* stayed on screen for both parties. The
-- moderator keeps full visibility; the participants stop seeing what was taken
-- down. The sender still sees their own row so the takedown is not silent.
-- ---------------------------------------------------------------------
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (
    public.has_permission('moderation.manage')
    or (
      public.is_conversation_participant(conversation_id)
      and (moderation_status <> 'blocked' or sender_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 3. Attachments
--
-- The 0011 policy was `for all`, which let any participant DELETE any
-- attachment row in the thread — including the other party's evidence in a
-- dispute. Split so that reading and adding follow participation, while
-- removal stays with the message's own sender or a moderator.
-- ---------------------------------------------------------------------
drop policy if exists msg_attach_rw on public.message_attachments;

create policy msg_attach_read on public.message_attachments for select to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (public.is_conversation_participant(m.conversation_id)
             or public.has_permission('moderation.manage'))
    )
  );

create policy msg_attach_insert on public.message_attachments for insert to authenticated
  with check (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.sender_id = auth.uid()
        and public.is_conversation_participant(m.conversation_id)
    )
  );

create policy msg_attach_delete on public.message_attachments for delete to authenticated
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
        and (m.sender_id = auth.uid() or public.has_permission('moderation.manage'))
    )
  );

-- ---------------------------------------------------------------------
-- Storage: chat-attachments
--
-- PATH CONVENTION: `{conversation_id}/{message_id}/{filename}`
--
-- This differs from the bucket's original "first segment = owner id" note, and
-- deliberately: authorising a download means answering "may this person read
-- this conversation", and only a conversation id in the path lets the policy
-- ask that without a lookup table between objects and messages.
-- ---------------------------------------------------------------------
drop policy if exists chat_read on storage.objects;
drop policy if exists chat_write on storage.objects;

create policy chat_read on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      public.is_conversation_participant(public.try_uuid(public.storage_owner_segment(name)))
      or public.has_permission('moderation.manage')
    )
  );

create policy chat_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and owner = auth.uid()
    -- Uploading into a thread you are not in would let an attacker stage files
    -- that the participants can then read.
    and public.is_conversation_participant(public.try_uuid(public.storage_owner_segment(name)))
  );

-- Removal is the uploader's, so a failed send can clean up after itself.
create policy chat_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (owner = auth.uid() or public.has_permission('moderation.manage'))
  );

-- The bucket accepted any mime type at 25MB. Chat is not a file-transfer
-- service, and an unrestricted bucket is a malware drop with a share link.
update storage.buckets
   set allowed_mime_types = array[
         'image/jpeg','image/png','image/webp','image/avif','image/gif','image/heic',
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/plain','text/csv'
       ],
       file_size_limit = 10485760
 where id = 'chat-attachments';

-- ---------------------------------------------------------------------
-- REALTIME
--
-- `messages` and `conversations` were already published in 0015. Two additions:
--
--   conversation_participants — so marking a thread read in one tab clears the
--     unread badge in the others, and so an operator joining a support thread
--     appears without a refresh.
--   message_attachments — an attachment row lands after its message, so
--     without this the bubble streams in and then sits there with no file until
--     something else triggers a refetch.
--
-- Both are governed by their base-table RLS above; publication membership does
-- not widen access.
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select unnest(array['conversation_participants','message_attachments']) as t
  loop
    execute format('alter table public.%I replica identity full;', r.t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = r.t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', r.t);
    end if;
  end loop;
end$$;
