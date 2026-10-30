-- =====================================================================
-- Sinnapi — 1030a tg_message_notify: the missing `audience`
--
-- WHAT WAS WRONG
-- `message.received` has had both an `in_app` and an `email` template since
-- 0815c, and the quotation detail page's Messages tab is one of the threads
-- that trigger carries. None of it ever reached anyone.
--
-- `notification-dispatch`'s router picks the addressed path — the one that
-- writes the in-app bell row AND sends the templated email — only when an
-- outbox row carries BOTH `recipient_id` and `audience`:
--
--   payload.recipient_id && payload.audience  -> dispatchAddressed()
--   otherwise                                 -> dispatchLegacy()
--
-- `tg_message_notify`'s outbox insert has only ever set `recipient_id`.
-- Every `message.received` row therefore fell into `dispatchLegacy`, whose
-- `LEGACY_ROUTES` table has an entry for `messages_changed` (the retired
-- blanket trigger's event name) but none for `message.received` — so the row
-- was claimed, matched nothing, and was marked `processed` having done
-- nothing at all. No bell notification, no email, for any chat thread: a
-- client replying on a quote, a vendor replying to a client, or an operator
-- replying in a support thread all went silently nowhere.
--
-- THE FIX
-- One field. `conversation_participants.role_in_convo` is already selected
-- into the loop variable as `r.role_in_convo`, and its type — `conversation_
-- role` — is exactly the three strings the notification system already uses
-- as `audience` ('client' | 'vendor' | 'admin'). Stamping it onto the payload
-- is the whole change; `dispatchAddressed` and the already-seeded
-- `message.received` templates do the rest, exactly as they do for every
-- other addressed trigger.
--
-- Everything else about `tg_message_notify` — the system-message skip, the
-- mute skip, the first-unread-only digest, and the support-thread fan-out to
-- `message.support_inbox` / `message.support_received` / `message.support_ack`
-- — is unchanged. Those three support events already carry `audience` (two
-- are addressed explicitly, one resolves via `notify_admins`) and were never
-- affected by this bug.
-- =====================================================================

create or replace function public.tg_message_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c                public.conversations;
  v_sender         text;
  v_sender_email   text;
  v_sender_phone   text;
  v_sender_ref     text;
  v_vendor_name    text;
  v_payload        jsonb;
  v_support        jsonb;
  r                record;
  v_prior          integer;
  v_is_support     boolean := false;
  v_kind           text;
  v_kind_label     text;
  v_own_in_burst   integer;
begin
  -- System messages narrate a state change that has already sent its own
  -- notification through the aggregate that caused it.
  if new.is_system then return new; end if;

  select * into c from public.conversations where id = new.conversation_id;
  if c.id is null then return new; end if;

  select nullif(trim(p.full_name), ''),
         nullif(trim(p.email::text), ''),
         nullif(trim(p.phone), ''),
         p.public_id
    into v_sender, v_sender_email, v_sender_phone, v_sender_ref
  from public.profiles p
  where p.id = new.sender_id;

  -- A client↔vendor thread is a business relationship, so the sender is named
  -- by their business rather than the person who happens to own the account.
  if c.type = 'client_vendor' and c.vendor_id is not null then
    select coalesce(v.business_name, v_sender) into v_sender
    from public.vendors v
    where v.id = c.vendor_id and v.owner_id = new.sender_id;
  end if;

  if c.vendor_id is not null then
    select business_name into v_vendor_name from public.vendors where id = c.vendor_id;
  end if;

  -- An inbound support message: a support thread, written by someone who is
  -- not on the support desk. An operator replying in the same thread is the
  -- other direction and keeps the participant digest below.
  if c.type in ('client_admin', 'vendor_admin')
     and not public.profile_has_permission(new.sender_id, 'moderation.manage') then
    v_is_support := true;
    -- Taken from the thread type rather than from the sender's roles: the type
    -- is what decided which queue this belongs in when the thread was opened,
    -- and an owner who is also a client must not have their payout question
    -- filed as a client one.
    v_kind       := case when c.type = 'vendor_admin' then 'vendor' else 'client' end;
    v_kind_label := case when c.type = 'vendor_admin' then 'Vendor' else 'Client' end;
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
    select cp.profile_id, cp.last_read_at, cp.role_in_convo
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.profile_id <> new.sender_id
      and cp.is_muted = false
  loop
    -- Operators on an inbound support message are notified by permission, not
    -- by participation. Skipping them here is what keeps one message from
    -- producing both a `message.received` and a `message.support_received`.
    continue when v_is_support and r.role_in_convo = 'admin';

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
              -- `audience` is what routes this row to `dispatchAddressed` in
              -- notification-dispatch instead of into the legacy projection,
              -- which has no entry for `message.received` and quietly drops
              -- it. `role_in_convo` already is 'client' | 'vendor' | 'admin'
              -- — the exact vocabulary the dispatcher's audience resolution
              -- and `resolve_notification_template` expect.
              v_payload || jsonb_build_object(
                'recipient_id', r.profile_id,
                'audience',     r.role_in_convo),
              'pending', now());
    end if;
  end loop;

  if not v_is_support then
    return new;
  end if;

  -- ---- the support payload -------------------------------------------
  -- Carries the message WHOLE. An operator triaging from their inbox needs to
  -- read the request, not a 140-character tease of it, and the recipients are
  -- the support desk and the sender themselves — nobody who could not already
  -- read the thread in the portal.
  v_support := v_payload || jsonb_build_object(
    'sender_email',      v_sender_email,
    'sender_phone',      v_sender_phone,
    'sender_reference',  v_sender_ref,
    'sender_kind',       v_kind,
    'sender_kind_label', v_kind_label,
    'vendor_name',       v_vendor_name,
    'message_body',      coalesce(new.body, ''),
    'sent_at',           new.created_at,
    -- The dispatcher turns this into a real Reply-To header on the desk-bound
    -- copies, so an operator reading the mail can answer the person who wrote
    -- in without first finding the thread. Stripped from the sender's own
    -- receipt below — a Reply-To pointing at the recipient is nonsense.
    'reply_to_email',    v_sender_email
  );

  -- ---- 1. the configured support mailbox, every message ---------------
  -- No `recipient_id` and no `audience` key the addressed path would claim:
  -- `notification-dispatch` recognises this event type and resolves the
  -- address from its own secret.
  insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
  values ('conversations', c.id, 'message.support_inbox', v_support, 'pending', now());

  -- ---- 2. the support desk, in-app and at their own addresses ---------
  -- `notify_admins` writes one in-app row per `moderation.manage` holder;
  -- `trg_notification_email` then enqueues the email for each, because this
  -- trigger has an `email` template seeded below. Operators who muted or
  -- archived the thread are still told: a muted thread is a personal reading
  -- preference, and support arriving is a work item for the desk.
  perform public.notify_admins(
    'message.support_received', 'moderation.manage', 'conversations', c.id, v_support);

  -- ---- 3. one receipt to the sender, per burst -----------------------
  -- Messages this sender wrote since the last message from anyone else. Zero
  -- means this message opens a new burst, so it is the one that gets the
  -- receipt; everything they add before Sinnapi answers is silent.
  select count(*)::integer into v_own_in_burst
  from public.messages m
  where m.conversation_id = new.conversation_id
    and m.id <> new.id
    and m.deleted_at is null
    and m.is_system = false
    and m.sender_id = new.sender_id
    and m.created_at <= new.created_at
    and m.created_at > coalesce((
      select max(m2.created_at)
      from public.messages m2
      where m2.conversation_id = new.conversation_id
        and m2.deleted_at is null
        and m2.is_system = false
        and m2.sender_id <> new.sender_id
    ), '-infinity'::timestamptz);

  if v_own_in_burst = 0 and v_sender_email is not null then
    insert into public.outbox (aggregate_type, aggregate_id, event_type, payload, status, available_at)
    values ('conversations', c.id, 'message.support_ack',
            (v_support - 'reply_to_email') || jsonb_build_object(
              'recipient_id', new.sender_id,
              'audience',     v_kind,
              -- They are looking at the thread they just wrote in. An in-app
              -- notification telling them about their own message would be
              -- noise; the point of the receipt is that it reaches their inbox.
              'email_only',   true),
            'pending', now());
  end if;

  return new;
end;
$$;

comment on function public.tg_message_notify() is
  'New-message notifications. Participants get the first-unread digest, now correctly addressed '
  '(audience = role_in_convo) so it reaches dispatchAddressed instead of the legacy no-op path. An '
  'inbound support message additionally emits message.support_inbox (the configured support '
  'mailbox, every message), message.support_received (every moderation.manage operator) and one '
  'message.support_ack receipt to the sender per burst.';
