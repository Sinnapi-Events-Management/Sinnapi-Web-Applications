-- =====================================================================
-- Sinnapi — post-event settlement, step 1: enums, settings, permissions.
--
-- WHAT THIS FLOW IS
-- Completing a booking already opens the escrow release window, but the only
-- routes out of it are all-or-nothing: the client confirms and the vendor is
-- paid in full, the timer expires and Finance approves in full, or somebody
-- opens a dispute and the whole thing freezes. There is nothing in between —
-- and "in between" is the common case. The event happened, mostly as agreed,
-- and the client wants to pay a little less for a reason they can name.
--
-- So the vendor now *asks* for their held money once the event is over, an
-- admin puts that ask to the client, and the client either approves it in full
-- or proposes less with a reason. A reduction is not final until the vendor
-- accepts it: whatever figure is paid, all three parties have consented to it
-- on the record. That record is the point — an amount moved without documented
-- agreement is the one that comes back as a legal problem.
--
-- Enum VALUES added to an existing type cannot be used in the transaction that
-- adds them, and Supabase runs one file per transaction — so this file only
-- declares. Everything that uses these lives in 000003 onwards.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Escrow event stream: one value per step, so the append-only history of an
-- escrow reads as the negotiation it actually was.
-- ---------------------------------------------------------------------
alter type escrow_event_type add value if not exists 'settlement_requested';
alter type escrow_event_type add value if not exists 'settlement_forwarded';
alter type escrow_event_type add value if not exists 'settlement_decided';
alter type escrow_event_type add value if not exists 'settlement_consented';
alter type escrow_event_type add value if not exists 'settlement_contested';
alter type escrow_event_type add value if not exists 'settlement_released';
alter type escrow_event_type add value if not exists 'settlement_nudged';
alter type escrow_event_type add value if not exists 'settlement_escalated';
alter type escrow_event_type add value if not exists 'settlement_cancelled';

-- ---------------------------------------------------------------------
-- The request's own state machine.
--
--   vendor_requested         the event is over; the vendor wants their money
--   admin_forwarded          an admin has put it to the client; their clock runs
--   awaiting_vendor_consent  the client offered less; the vendor must answer
--   consented                every party has agreed the figure; Finance may pay
--   released                 the payout is raised (and any shortfall queued back)
--   contested                the vendor refused the reduction; a dispute is open
--   cancelled                withdrawn by the vendor or an admin
--
-- `consented` is deliberately its own state rather than something inferred
-- from a pair of timestamps. It is the state a court would ask about.
-- ---------------------------------------------------------------------
do $$ begin
  create type settlement_request_status as enum (
    'vendor_requested', 'admin_forwarded', 'awaiting_vendor_consent',
    'consented', 'released', 'contested', 'cancelled');
exception when duplicate_object then null; end $$;

-- What the client decided. `reduced` always carries a reason and an amount.
do $$ begin
  create type settlement_decision as enum ('full', 'reduced');
exception when duplicate_object then null; end $$;

-- The vendor's answer to a reduction. There is no third option on purpose:
-- silence is not consent, and the cron never converts it into one.
do $$ begin
  create type settlement_vendor_response as enum ('accepted', 'contested');
exception when duplicate_object then null; end $$;

-- The visible timeline every party reads. Nudges and escalations are in here
-- with the decisions because "nobody told me" is the argument this flow exists
-- to end.
do $$ begin
  create type settlement_event_kind as enum (
    'requested', 'forwarded', 'nudged', 'decided',
    'vendor_accepted', 'vendor_contested', 'released', 'escalated', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Settings.
--
-- These clocks are deliberately much shorter than `escrow_auto_release_days`
-- (7). That timer covers a client who never engaged at all; this one covers a
-- client who has just been asked a direct question about a finished event,
-- with their vendor waiting on the answer to be paid. Vendor cash flow after
-- an event is measured in hours, so the whole chain is sized in hours.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('settlement_admin_response_hours', '2'::jsonb, 'number',
   'How long a vendor''s settlement request may sit before an admin has put it to the client. Past this it is escalated in the console, not auto-approved.'),

  ('settlement_client_response_hours', '6'::jsonb, 'number',
   'How long the client has to approve the vendor''s payout or propose less. Silence past this hands the request to Finance as a full-amount release for approval — a human still approves it; nothing settles unattended.'),

  ('settlement_vendor_response_hours', '6'::jsonb, 'number',
   'How long the vendor has to accept or contest a reduced amount. Silence is never taken as acceptance — it escalates to an admin, because a payout the vendor did not agree to is the one that becomes a legal problem.'),

  ('settlement_nudge_cooldown_minutes', '60'::jsonb, 'number',
   'Minimum gap between manual reminders on one settlement request, per sender. Short enough to chase a stalled payout, long enough that chasing is not harassment.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Permissions.
--
-- Split on purpose. Forwarding a request and chasing the parties is support
-- work and should not require the key to the money; approving what is actually
-- paid stays behind `escrow.release`, where it already is.
-- ---------------------------------------------------------------------
insert into public.permissions (key, category, description) values
  ('settlement.manage', 'finance',
   'Put a vendor''s settlement request to the client and chase the parties')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'settlement.manage'
where r.key in ('finance', 'support')
on conflict do nothing;

-- Super Admin's grant was a one-time cross join at seed time, so anything
-- added later needs backfilling or the role silently loses coverage.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;
