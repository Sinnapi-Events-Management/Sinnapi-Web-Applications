-- =====================================================================
-- Sinnapi — 1103d WhatsApp notifications, step 5: what the webhook writes.
--
-- Meta reports on every message AFTER the send call has returned: a send the
-- API accepted can still fail minutes later (the 2026-11-03 test showed
-- exactly that — accepted, then `131031 Business Account locked` by webhook).
-- So the send log only tells the truth once the webhook updates it.
--
-- Two writes, both service-role only, both called by `whatsapp-webhook`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Replies people send to the WhatsApp number (anything but STOP/START).
--
-- Nobody reads the Sinnapi WhatsApp number, so a reply is forwarded to the
-- support inbox email (`SUPPORT_MESSAGES_INBOX`) and the sender gets one
-- auto-reply per 24 hours pointing them at in-app Messages. Product decision,
-- 2026-11-03.
--
-- The row is what makes that safe under Meta's redelivery: `wa_message_id`
-- is unique, `forwarded_at` / `auto_replied_at` are set only after the email
-- or reply actually went, so a redelivered event finishes what failed and
-- repeats nothing that succeeded.
--
-- It holds what a person typed, so it is support data: service-role only,
-- RLS on with no policies.
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_inbound (
  id              uuid primary key default gen_random_uuid(),
  wa_message_id   text not null unique,
  from_phone      text not null,
  message_type    text not null,
  body            text,
  -- Profiles holding this number at the time — a phone can be shared by a
  -- client account and a vendor account.
  profile_ids     uuid[] not null default '{}',
  forwarded_at    timestamptz,
  auto_replied_at timestamptz,
  received_at     timestamptz not null default now()
);

create index if not exists ix_whatsapp_inbound_phone
  on public.whatsapp_inbound(from_phone, auto_replied_at desc);

alter table public.whatsapp_inbound enable row level security;

comment on table public.whatsapp_inbound is
  'Replies sent to the Sinnapi WhatsApp number (other than STOP/START), forwarded to the support '
  'inbox. Unique wa_message_id + forwarded_at/auto_replied_at make Meta redelivery idempotent.';

-- STOP / START find people by the number Meta reports, which is E.164
-- without the plus.
create index if not exists ix_profiles_phone_e164
  on public.profiles(phone_e164) where phone_e164 is not null;

/**
 * Record one delivery status for a sent message.
 *
 * Meta's status callbacks can arrive out of order — `read` before `delivered`,
 * or a retried `sent` after both — so a status only ever moves FORWARD:
 * sending → sent → delivered → read, with `failed` outranking everything
 * because a failure is final. A stale callback is acknowledged and ignored.
 *
 * Returns false when no row has this Meta id: either the message was not sent
 * by the dispatcher (the smoke test, a send from WhatsApp Manager) or the
 * callback beat the dispatcher's own write of the id by a few milliseconds.
 * The webhook decides which of those deserves a retry.
 */
create or replace function public.whatsapp_record_status(
  p_message_id    text,
  p_status        text,
  p_at            timestamptz,
  p_error_code    text default null,
  p_error_message text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_rank   constant jsonb := '{"sending":0,"sent":1,"delivered":2,"read":3,"failed":4}';
  v_exists boolean;
begin
  if not (v_rank ? p_status) then return true; end if;   -- a status we do not track

  select true into v_exists from public.whatsapp_messages where provider_message_id = p_message_id;
  if v_exists is null then return false; end if;

  update public.whatsapp_messages
     set status        = p_status,
         status_at     = coalesce(p_at, now()),
         error_code    = coalesce(p_error_code, error_code),
         error_message = coalesce(left(p_error_message, 1000), error_message),
         updated_at    = now()
   where provider_message_id = p_message_id
     and (v_rank ->> p_status)::int > (v_rank ->> status)::int;

  return true;
end;$$;

revoke all on function public.whatsapp_record_status(text, text, timestamptz, text, text)
  from public, anon, authenticated;
grant execute on function public.whatsapp_record_status(text, text, timestamptz, text, text)
  to service_role;

/**
 * Turn WhatsApp notifications off (STOP) or back on (START) for every profile
 * holding this number. Every one, deliberately: a phone shared by a client
 * account and a vendor account belongs to one person, and "stop" from that
 * phone means stop.
 *
 * Opting out keeps the FIRST opt-out time (so Support can see when it began);
 * opting in clears it. Returns how many profiles changed.
 */
create or replace function public.whatsapp_set_opt_out(p_phone text, p_opt_out boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.profiles
     set whatsapp_opt_out_at = case when p_opt_out then coalesce(whatsapp_opt_out_at, now()) end
   where phone_e164 = p_phone
     and deleted_at is null
     and (whatsapp_opt_out_at is null) = p_opt_out;   -- only rows that actually change
  get diagnostics v_count = row_count;
  return v_count;
end;$$;

revoke all on function public.whatsapp_set_opt_out(text, boolean) from public, anon, authenticated;
grant execute on function public.whatsapp_set_opt_out(text, boolean) to service_role;
