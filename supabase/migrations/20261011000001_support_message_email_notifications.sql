-- =====================================================================
-- Sinnapi — 1011a Support messages reach a human by email
--
-- WHY THIS EXISTS
-- A client or vendor writing to Sinnapi support could be shouting into a void.
-- `get_or_create_client_support_conversation` / `_vendor_support_conversation`
-- (0815b) create a thread whose ONLY participant is the person asking for help:
-- operators are enrolled later, on demand, by `join_support_conversation`.
--
-- `tg_message_notify` (0815c) fans out one outbox row per *other participant*.
-- On a brand-new support thread there are none, so the first message — the one
-- that actually opens the request — notified nobody at all. Once an operator
-- had joined, that one operator was nudged, and only on their first unread, by
-- the digest rule that is right for a two-party chat and wrong for a support
-- queue where every message is a work item.
--
-- The blanket `trg_outbox` on `messages` did not cover the gap either: it
-- enqueues `to_jsonb(new)`, and the dispatcher's legacy path resolves
-- recipients from `client_id` / `recipient_id` / `payer_id` — none of which
-- exist on a message row. Every message insert *and update* therefore wrote an
-- outbox row that processed to nothing. It is dropped below.
--
-- WHAT AN INBOUND SUPPORT MESSAGE NOW PRODUCES
--   1. `message.support_inbox` — one row, every message, carrying the whole
--      message. The dispatcher mails it to whatever `SUPPORT_MESSAGES_INBOX`
--      resolves to, with Reply-To set to the sender. No `recipient_id`: this
--      copy is addressed to a mailbox, not to a profile, which is exactly why
--      the address lives in Edge Function secrets rather than in this schema.
--      Same shape as `VENDOR_APPLICATIONS_INBOX` — one address or several,
--      unset means the copy is skipped and logged, never that the message is
--      lost.
--   2. `message.support_received` via `notify_admins` — an in-app row for every
--      operator holding `moderation.manage`, the same permission that gates
--      reading and joining a support thread. `trg_notification_email` turns
--      each of those into mail at the operator's own address, because an email
--      template is seeded for it below.
--   3. `message.support_ack` — one acknowledgement to the sender, email only,
--      once per burst: the first message, then silence until Sinnapi replies.
--      A person writing three messages in a row gets one receipt, not three.
--
-- WHY THE TRIGGER KEYS START WITH `message.`
-- `resolveDomain` in the shared notifications kit routes on the trigger-key
-- prefix, and `support.*` is claimed by nothing — the rows would land in the
-- never-linked System domain. Prefixed `message.`, they inherit the Messages
-- domain, its accent, its grouping and the admin portal's `/messages` route
-- with no frontend change at all.
--
-- WHAT DELIBERATELY DOES NOT CHANGE
-- An operator's *reply* still notifies the client or vendor through the
-- existing first-unread digest. Support is the direction that needed to become
-- every-message; the other direction is a conversation, and one nudge per
-- unread run is the right amount of mail for it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Does a *named* profile hold a permission?
--
-- `has_permission` answers only for `auth.uid()`, which is the caller — and in
-- `tg_message_notify` the caller is the person who sent the message, while the
-- question being asked is "is the SENDER an operator?". Same three-table join,
-- taken as an argument instead of from the session, so the trigger can tell an
-- inbound support request from an operator's reply in the same thread.
--
-- `has_permission` is left alone: it is evaluated by nearly every RLS policy in
-- the schema and is not worth re-pointing for this.
-- ---------------------------------------------------------------------
create or replace function public.profile_has_permission(p_profile_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p       on p.id = rp.permission_id
    where ur.profile_id = p_profile_id
      and p.key = p_permission
  );
$$;

revoke all on function public.profile_has_permission(uuid, text) from public;

comment on function public.profile_has_permission(uuid, text) is
  'Does the named profile hold the permission? The session-scoped has_permission() answers the '
  'same question for auth.uid() only, which is useless to a trigger asking about a row author.';

-- ---------------------------------------------------------------------
-- Retire the blanket fan-out on `messages`, exactly as 0809d did for
-- `escrow_transactions` / `payments` and 0820a for `bookings` / `quotations`.
--
-- `tg_message_notify` has owned message notifications since 0815c. The blanket
-- trigger's rows could never resolve a recipient (see the header), so this
-- removes work, not behaviour. Rows already in the table still dispatch: the
-- `messages_changed` entry in the dispatcher's LEGACY_ROUTES stays.
-- ---------------------------------------------------------------------
drop trigger if exists trg_outbox on public.messages;

-- ---------------------------------------------------------------------
-- NEW-MESSAGE NOTIFICATIONS, with the support direction split out
--
-- Everything the 0815c version did is preserved: system messages are silent,
-- muted participants get nothing, and a participant with an outstanding unread
-- is not nudged twice. One suppression is added — on an inbound support
-- message, participants enrolled as `admin` are skipped here, because the
-- `notify_admins` fan-out below covers every operator including them, and
-- being both a participant and a permission holder must not mean two emails.
-- ---------------------------------------------------------------------
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
              v_payload || jsonb_build_object('recipient_id', r.profile_id),
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
  'New-message notifications. Participants get the first-unread digest; an inbound support '
  'message additionally emits message.support_inbox (the configured support mailbox, every '
  'message), message.support_received (every moderation.manage operator) and one '
  'message.support_ack receipt to the sender per burst.';

drop trigger if exists trg_message_notify on public.messages;
create trigger trg_message_notify
  after insert on public.messages
  for each row execute function public.tg_message_notify();

-- ---------------------------------------------------------------------
-- Copy. Seeded as data so Support can reword without a deploy, matching 0815c.
--
-- The audience suffix is how `resolve_notification_template` picks a variant,
-- so `message.support_received.admin` is the operator wording and the bare
-- `message.support_ack` serves both the client and the vendor — the receipt
-- says the same thing to either, and an audience-agnostic key is one fewer row
-- to keep in step.
--
-- `{{message_body}}` is the whole message. `notification-dispatch` escapes
-- every rendered value before it reaches the HTML, so a message containing
-- markup arrives as text.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values
  ('message.support_received.admin', 'in_app',
   'Support message from {{sender_name}}',
   '{{excerpt}}', 'en'),

  ('message.support_received.admin', 'email',
   'Support request from {{sender_name}}',
   '{{sender_name}} ({{sender_kind_label}}) has written to Sinnapi support.' || chr(10) || chr(10) ||
   'From: {{sender_name}} <{{sender_email}}>' || chr(10) || chr(10) ||
   '"{{message_body}}"' || chr(10) || chr(10) ||
   'Replying to this email reaches them directly. Answering in the admin portal instead keeps ' ||
   'the reply in their support thread, where they will look for it.',
   'en'),

  ('message.support_ack', 'email',
   'We have your message',
   'Hello {{sender_name}},' || chr(10) || chr(10) ||
   'Thank you for contacting Sinnapi support. Your message has reached our team and we will ' ||
   'reply in this thread.' || chr(10) || chr(10) ||
   '"{{excerpt}}"' || chr(10) || chr(10) ||
   'There is nothing else you need to do — anything you add to the thread reaches us too.',
   'en')
on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;
