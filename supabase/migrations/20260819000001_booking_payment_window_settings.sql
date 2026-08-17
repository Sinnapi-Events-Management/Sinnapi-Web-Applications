-- =====================================================================
-- Sinnapi — the booking payment window, step 1: enums, settings, permission.
--
-- WHAT THIS FLOW IS
-- A client and a vendor agree a booking on the escrow rail, the vendor
-- confirms it, and then — nothing. The client never pays. Today that booking
-- sits in `confirmed` forever: the vendor is holding a date for money that is
-- never coming, the client sees a page with a Pay button and no urgency on it,
-- and no admin anywhere is told. `escrow.awaiting_payment` fires once, at the
-- moment a checkout is *opened*, so the one client who most needs chasing —
-- the one who never opened a checkout at all — is the one nobody hears about.
--
-- So the offer now has a clock on it. It starts when payment first becomes
-- possible, it is visible to all three parties, the client is reminded on the
-- way down, and when it runs out the booking is flagged overdue and a vendor
-- or an admin may cancel it and get the date back.
--
-- WHAT IT DELIBERATELY DOES NOT DO
-- It never cancels anything on its own. The deadline passing is a fact about
-- a booking, not a decision about one — a client may have paid at the PSP
-- while the webhook is still in flight, and a booking auto-cancelled out from
-- under a paid client is a far worse failure than a date held one day too
-- long. The cron flags and notifies; a person cancels.
--
-- Enum VALUES added to an existing type cannot be used in the transaction that
-- adds them, and Supabase runs one file per transaction — so this file only
-- declares. Everything that uses these lives in 000002 onwards.
-- =====================================================================

-- ---------------------------------------------------------------------
-- The visible trail on an unpaid booking.
--
-- Its own type rather than more values on `escrow_event_type`, because the
-- interesting half of this flow happens when there is no escrow row to hang an
-- event off. A booking that was confirmed and never paid has a clock, three
-- reminders and a cancellation in its history and no `escrow_transactions`
-- row at all — those events have nowhere to live on the escrow stream.
--
--   window_opened   payment became possible; the clock started
--   reminded        an automatic reminder went to the client
--   nudged          a vendor or admin chased the client by hand
--   extended        an admin moved the deadline, with a reason
--   overdue         the clock ran out with nothing paid
--   paid            the escrow funded; the clock is closed and stays closed
--   cancelled       someone ended an overdue booking
-- ---------------------------------------------------------------------
do $$ begin
  create type booking_payment_event_kind as enum (
    'window_opened', 'reminded', 'nudged', 'extended', 'overdue', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Settings.
--
-- Hours, not days. The window exists to protect a *date* the vendor is holding
-- off the market, and the shorter the notice on that date the more a day of
-- silence costs — which is also why 000002 clamps the deadline to the event
-- itself. A payment that comes due after the event it pays for is not a
-- deadline, it is a decoration.
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, data_type, description) values
  ('booking_payment_window_hours', '48'::jsonb, 'number',
   'How long a client has to fund an escrow booking, in hours, counted from the moment payment first becomes possible — the vendor has confirmed AND the payment terms are accepted. Never counted from the request, because a client cannot pay a booking no vendor has taken. The deadline is additionally clamped to the start of the event, so it can never fall after the thing it pays for. An admin can extend one booking without changing this.'),

  ('booking_payment_reminder_hours', '[24,6,1]'::jsonb, 'json',
   'Hours-remaining marks at which the client is automatically reminded to pay. Each fires at most once per booking; a window shorter than a mark simply skips it.'),

  ('booking_payment_nudge_cooldown_minutes', '60'::jsonb, 'number',
   'Minimum gap between manual payment reminders on one booking, per sender. Short enough for a vendor to chase a date they are holding, long enough that chasing is not harassment.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Permission.
--
-- Chasing an unpaid client and cancelling a dead booking is support work, not
-- treasury work: no money has moved, and by definition none is being held.
-- Kept off `escrow.release` for that reason, and granted to the roles that
-- already carry the booking desk.
-- ---------------------------------------------------------------------
insert into public.permissions (key, category, description) values
  ('booking.payment.chase', 'operations',
   'Chase a client who has not funded an escrow booking, extend their deadline, and cancel it once the deadline has passed')
on conflict (key) do nothing;

-- Support already carries `bookings.read` and is the desk that chases people;
-- Finance carries the escrow. Neither needs `bookings.manage` for this, which
-- is the point of splitting it out — chasing an unpaid booking should not
-- require the permission that can rewrite any booking's status.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key = 'booking.payment.chase'
where r.key in ('finance', 'support')
on conflict do nothing;

-- Super Admin's grant was a one-time cross join at seed time, so anything
-- added later needs backfilling or the role silently loses coverage.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;
