-- =====================================================================
-- Sinnapi — 0815e Atomic message send
--
-- WHY THIS EXISTS
-- With attachments, sending stops being one INSERT. The browser would have to:
--   insert the message → read back its id → insert one attachment row per file
-- and any failure after the first step leaves a message on screen claiming to
-- carry a file it does not have. Realtime makes that worse, not better: the
-- bare message streams to the recipient the instant step one commits, so they
-- see the empty bubble before the sender's own client has finished.
--
-- `send_message` does the whole thing in one statement-level transaction.
--
-- SECURITY INVOKER, NOT DEFINER
-- Deliberate, and the opposite of every other RPC in this feature. The
-- find-or-create functions must be DEFINER because there is no INSERT policy on
-- `conversations` for them to satisfy. Sending has a perfectly good policy —
-- `messages_insert`, hardened in 0815d — and running as the caller means this
-- function cannot become a way around it. If the policy says no, so does this.
--
-- Storage is not touched here. Files are uploaded to
-- `{conversation_id}/{draft_id}/{filename}` *before* the send, so a failed
-- upload never produces a message at all, and `chat_write` (0815d) has already
-- established that the uploader is a participant of the conversation named in
-- the path. This function re-checks that the paths it is handed sit under the
-- conversation being posted to, so a caller cannot attach someone else's file
-- by passing its path.
-- =====================================================================
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body            text default null,
  -- [{ storage_path, file_name, mime_type, size_bytes }, …]
  p_attachments     jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_body   text := nullif(trim(coalesce(p_body, '')), '');
  v_count  integer := coalesce(jsonb_array_length(p_attachments), 0);
  v_msg    uuid;
  a        jsonb;
  v_path   text;
begin
  if v_sender is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- An empty message with no files is a mis-send, not a message.
  if v_body is null and v_count = 0 then
    raise exception 'empty_message' using errcode = '22023';
  end if;

  -- Bounded so a single send cannot be used to bulk-register storage rows.
  if v_count > 10 then
    raise exception 'too_many_attachments' using errcode = '22023';
  end if;

  -- Long enough for any real message; short enough that the column is not a
  -- blob store. The composer stops the user well before this.
  if v_body is not null and length(v_body) > 5000 then
    raise exception 'message_too_long' using errcode = '22001';
  end if;

  -- The INSERT is what authorises this: `messages_insert` requires the caller
  -- to be a participant of an active, non-deleted conversation, and running as
  -- INVOKER means that policy is evaluated for real.
  insert into public.messages (conversation_id, sender_id, body, moderation_status, is_system)
  values (p_conversation_id, v_sender, v_body, 'pending', false)
  returning id into v_msg;

  for a in select * from jsonb_array_elements(p_attachments)
  loop
    v_path := a ->> 'storage_path';

    if v_path is null or v_path = '' then
      raise exception 'attachment_path_required' using errcode = '22023';
    end if;

    -- The path must live under the conversation being posted to. Without this
    -- a participant of thread A could reference an object under thread B: they
    -- could not have uploaded it (chat_write blocks that), but they could point
    -- at one they had already been given a path to, and `chat_read` would then
    -- grant thread A's other participants a download they were never sent.
    if public.storage_owner_segment(v_path) <> p_conversation_id::text then
      raise exception 'attachment_conversation_mismatch' using errcode = '42501';
    end if;

    insert into public.message_attachments
      (message_id, storage_path, file_name, mime_type, size_bytes, scan_status)
    values (
      v_msg,
      v_path,
      left(coalesce(a ->> 'file_name', 'attachment'), 255),
      a ->> 'mime_type',
      nullif(a ->> 'size_bytes', '')::bigint,
      -- Nothing scans these yet. `pending` is the honest state, and the UI
      -- labels it rather than implying a clean bill of health.
      'pending'
    );
  end loop;

  return v_msg;
end;
$$;

revoke all on function public.send_message(uuid, text, jsonb) from public;
grant execute on function public.send_message(uuid, text, jsonb) to authenticated;

comment on function public.send_message(uuid, text, jsonb) is
  'Atomic message + attachment insert. SECURITY INVOKER: authorisation is messages_insert / msg_attach_insert, not this function.';
