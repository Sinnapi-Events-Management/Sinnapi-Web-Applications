-- =====================================================================
-- Sinnapi — 1103b WhatsApp notifications, step 1: the database half.
--
-- WHAT THIS ADDS
-- A second outbound channel next to email. Every notification that reaches a
-- person can now also enqueue ONE WhatsApp outbox row, which
-- `notification-dispatch` sends through the Meta WhatsApp Cloud API.
-- Email is untouched: nothing below reads or changes an email row.
--
-- THE RULE IS THE SAME AS EMAIL'S
-- "Send a WhatsApp" is decided exactly like "send an email": a
-- `notification_templates` row exists for (trigger.audience | trigger,
-- 'whatsapp'). For WhatsApp that row also names the Meta template to use
-- (`provider_template`) and which payload keys fill its numbered blanks
-- (`params`), because Meta only delivers pre-approved templates — the copy in
-- `body_template` is a readable reference for Support, never sent as is.
--
-- No WhatsApp template is seeded here. Until one is, every path below is a
-- no-op, so this file is safe to deploy ahead of the dispatcher.
--
-- WHERE THE ROWS COME FROM
-- Every notification reaches a person by one of three routes:
--
--   A. `notify_party` writes the in-app row; `trg_notification_email` mails it.
--   B. A money RPC / `tg_message_notify` writes an addressed outbox row; the
--      dispatcher mails it and then writes the in-app row (`dispatched`).
--   C. An email-only outbox row with no in-app row at all — today only
--      `message.support_ack`, the sender's own support receipt.
--
-- A and B both end in a `notifications` insert, so one trigger there covers
-- them. C never touches `notifications`, so a second trigger on `outbox`
-- picks up exactly that shape — "email-only and not about a notification" —
-- rather than naming `message.support_ack`, so a future receipt of the same
-- shape is covered without another migration.
--
-- Chat (`message.received`) needs no rule of its own: `tg_message_notify`
-- only notifies on the FIRST unread message of a burst, and WhatsApp follows
-- the notification, so it inherits once-per-burst for free.
--
-- WHY A WHATSAPP ROW IS ITS OWN OUTBOX ROW
-- A failed WhatsApp send retries on its own and dead-letters on its own. If it
-- shared the email's row, a Meta outage would re-send the email five times.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. PHONE, IN THE ONE FORMAT WHATSAPP ACCEPTS
--
-- `profiles.phone` is free text, and most stored numbers are local
-- (`0772…`, `772…`). The product decision is NOT to guess a country: a
-- number without a `+country` code is treated as missing, and the portals
-- ask its owner to fix it at login.
--
-- Generated rather than a second editable column, so the two can never
-- disagree: the user edits `phone`, and `phone_e164` follows. Spaces,
-- dashes, dots and brackets are stripped; what is left must be `+` and
-- 8–15 digits, not starting with 0 (the E.164 shape). Anything else is null.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone_e164 text
    generated always as (
      case
        when regexp_replace(coalesce(phone, ''), '[\s().\-]', '', 'g') ~ '^\+[1-9][0-9]{7,14}$'
          then regexp_replace(phone, '[\s().\-]', '', 'g')
      end
    ) stored;

comment on column public.profiles.phone_e164 is
  'phone in E.164 (+256772123456), or null when phone is missing or lacks a country code. '
  'Generated from phone — never written directly. The WhatsApp channel sends only here.';

-- ---------------------------------------------------------------------
-- 2. OPT-OUT
--
-- On by default (product decision): anyone with a valid number receives
-- WhatsApp. Set by the profile switch or by replying STOP (the webhook);
-- cleared to turn it back on. A timestamp rather than a boolean so Support
-- can see when, which is the first question an opted-out user's complaint
-- raises. Writable by the owner through the existing `profiles_self_update`
-- policy.
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists whatsapp_opt_out_at timestamptz;

comment on column public.profiles.whatsapp_opt_out_at is
  'When this person turned WhatsApp notifications off (profile switch or a STOP reply). '
  'Null = on.';


-- ---------------------------------------------------------------------
-- 3. TEMPLATES — which Meta template, and what fills its blanks
-- ---------------------------------------------------------------------
alter table public.notification_templates
  add column if not exists provider_template text,
  add column if not exists params text[] not null default '{}';

comment on column public.notification_templates.provider_template is
  'WhatsApp only: the approved Meta template name this row sends, e.g. quotation_requested_vendor.';
comment on column public.notification_templates.params is
  'WhatsApp only: payload keys, in order, that fill the Meta template''s {{1}}, {{2}}, …';

alter table public.notification_templates
  drop constraint if exists notification_templates_whatsapp_provider;
alter table public.notification_templates
  add constraint notification_templates_whatsapp_provider
  check (channel <> 'whatsapp' or nullif(btrim(provider_template), '') is not null);

/**
 * The WhatsApp counterpart of `resolve_notification_template`: same fallback
 * order (exact audience first, then the audience-agnostic key; exact locale
 * first, then English), plus the two columns only WhatsApp needs.
 *
 * A separate function rather than more output columns on the existing one,
 * because that one's return shape is read by SQL and by the dispatcher, and
 * changing a `returns table` means drop-and-recreate plus re-grant.
 */
create or replace function public.resolve_whatsapp_template(
  p_trigger  text,
  p_audience text,
  p_locale   text default 'en')
returns table (provider_template text, params text[], body_template text, locale text)
language sql stable security definer set search_path = public as $$
  select t.provider_template, t.params, t.body_template, t.locale
  from public.notification_templates t
  where t.channel = 'whatsapp'
    and t.is_active
    and t.trigger_key in (p_trigger || '.' || p_audience, p_trigger)
    and t.locale in (p_locale, 'en')
  order by
    (t.trigger_key = p_trigger || '.' || p_audience) desc,
    (t.locale = p_locale) desc
  limit 1;
$$;

revoke all on function public.resolve_whatsapp_template(text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_whatsapp_template(text, text, text) to service_role;


-- ---------------------------------------------------------------------
-- 4. THE SEND LOG
--
-- One row per WhatsApp the dispatcher sends. It does two jobs:
--
--   * Idempotency. `outbox_id` is unique: the dispatcher writes this row
--     BEFORE calling Meta and records Meta's message id after. A retry that
--     finds a row with a message id knows the send already happened (the
--     crash was after Meta accepted it) and does not send twice.
--   * Delivery truth. Meta reports sent → delivered → read, or failed, to the
--     webhook (step 5), keyed by `provider_message_id`.
--
-- Service-role only: no policies, RLS on. An admin view comes later.
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_messages (
  id                  uuid primary key default gen_random_uuid(),
  -- Nullable + set null: outbox retention may purge the row, the log stays.
  outbox_id           uuid unique references public.outbox(id) on delete set null,
  notification_id     uuid references public.notifications(id) on delete set null,
  recipient_id        uuid references public.profiles(id) on delete set null,
  trigger_key         text not null,
  provider_template   text not null,
  -- The number it actually went to, frozen: the profile's number may change.
  to_phone            text not null,
  provider_message_id text unique,
  status              text not null default 'sending'
                        check (status in ('sending', 'sent', 'delivered', 'read', 'failed')),
  error_code          text,
  error_message       text,
  status_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ix_whatsapp_messages_recipient
  on public.whatsapp_messages(recipient_id, created_at desc);

alter table public.whatsapp_messages enable row level security;

comment on table public.whatsapp_messages is
  'One row per WhatsApp notification sent through the Meta Cloud API: idempotency for the '
  'dispatcher (unique outbox_id) and delivery status from the webhook (provider_message_id).';


-- ---------------------------------------------------------------------
-- 5. THE ENQUEUER — one place that decides "does this person get a WhatsApp"
-- ---------------------------------------------------------------------

/**
 * Enqueue one WhatsApp outbox row for a person, when all of these hold:
 *   - the profile exists and is not deleted,
 *   - it has a valid international number (`phone_e164`),
 *   - its owner has not opted out,
 *   - a WhatsApp template exists for this trigger and audience.
 * Otherwise it does nothing — each of those is a normal state, not an error.
 *
 * The payload carries `channel = 'whatsapp'`, which is what the dispatcher
 * routes on BEFORE its addressed path. That order matters: this row also has
 * `recipient_id` and `audience`, and the addressed path would otherwise send
 * the email again and write a second in-app row.
 */
create or replace function public.enqueue_whatsapp_notification(
  p_trigger         text,
  p_recipient       uuid,
  p_audience        text,
  p_data            jsonb,
  p_notification_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_phone   text;
  v_opt_out timestamptz;
  v_locale  text;
begin
  if p_recipient is null or p_audience is null then return; end if;

  select phone_e164, whatsapp_opt_out_at, coalesce(locale, 'en')
    into v_phone, v_opt_out, v_locale
    from public.profiles
   where id = p_recipient and deleted_at is null;

  if not found or v_phone is null or v_opt_out is not null then return; end if;

  if not exists (
    select 1 from public.resolve_whatsapp_template(p_trigger, p_audience, v_locale)
  ) then
    return;   -- no WhatsApp for this event, deliberately
  end if;

  insert into public.outbox(aggregate_type, aggregate_id, event_type, payload, status, available_at)
  values (
    coalesce(p_data ->> 'aggregate_type', 'notifications'),
    coalesce(nullif(p_data ->> 'aggregate_id', '')::uuid, p_notification_id),
    p_trigger,
    -- The email-only / dispatched flags belong to the email row this came
    -- from, not to this one.
    (coalesce(p_data, '{}'::jsonb) - 'email_only' - 'dispatched')
      || jsonb_build_object(
           'channel',         'whatsapp',
           'recipient_id',    p_recipient,
           'audience',        p_audience,
           'notification_id', p_notification_id),
    'pending',
    now());
end;$$;

revoke all on function public.enqueue_whatsapp_notification(text, uuid, text, jsonb, uuid)
  from public, anon, authenticated;

comment on function public.enqueue_whatsapp_notification(text, uuid, text, jsonb, uuid) is
  'Enqueues one WhatsApp outbox row (payload.channel = whatsapp) when the recipient has a valid '
  'E.164 phone, has not opted out, and a whatsapp notification_templates row exists.';


-- ---------------------------------------------------------------------
-- 6. ROUTES A + B — every in-app notification
--
-- Unlike `tg_notification_email` this does NOT skip `dispatched` rows: that
-- stamp means "the dispatcher already sent the EMAIL for this", and says
-- nothing about WhatsApp, which the dispatcher never sends inline.
-- ---------------------------------------------------------------------
create or replace function public.tg_notification_whatsapp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.channel <> 'in_app' then return new; end if;

  perform public.enqueue_whatsapp_notification(
    new.trigger_key,
    new.recipient_id,
    public.notify_audience_of(new.recipient_id, coalesce(new.data, '{}'::jsonb)),
    coalesce(new.data, '{}'::jsonb),
    new.id);

  return new;
end;$$;

drop trigger if exists trg_notification_whatsapp on public.notifications;
create trigger trg_notification_whatsapp
  after insert on public.notifications
  for each row execute function public.tg_notification_whatsapp();


-- ---------------------------------------------------------------------
-- 7. ROUTE C — email-only outbox rows that no in-app row stands behind
--
-- Rows from `tg_notification_email` carry `notification_id` and were already
-- handled by the trigger above, so they are skipped. WhatsApp rows never
-- carry `email_only`, so this cannot feed itself.
-- ---------------------------------------------------------------------
create or replace function public.tg_outbox_whatsapp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_whatsapp_notification(
    new.event_type,
    nullif(new.payload ->> 'recipient_id', '')::uuid,
    new.payload ->> 'audience',
    new.payload || jsonb_build_object(
      'aggregate_type', new.aggregate_type,
      'aggregate_id',   new.aggregate_id),
    null);
  return new;
end;$$;

drop trigger if exists trg_outbox_whatsapp on public.outbox;
create trigger trg_outbox_whatsapp
  after insert on public.outbox
  for each row
  when (
    coalesce(new.payload ->> 'email_only', '') = 'true'
    and coalesce(new.payload ->> 'notification_id', '') = ''
    and coalesce(new.payload ->> 'channel', '') <> 'whatsapp'
  )
  execute function public.tg_outbox_whatsapp();
