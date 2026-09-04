-- =====================================================================
-- Sinnapi — 0903k Subscription payments, step 1: enum values.
--
-- Split from the body of the work (0903l) because `alter type … add value`
-- commits at statement end but the new label cannot be *used* by any other
-- statement in the same transaction, and the Supabase CLI runs each file in
-- one. Nothing here is referenced until the next file.
--
-- `subscription_event` gains the three moments the existing set could not
-- name. The old values were the status names, written by a trigger on every
-- status change; the new emitter (0903l) writes an event for things that are
-- not status changes at all — a checkout being opened, a reminder going out,
-- and a hide being withheld pending review.
-- =====================================================================
alter type subscription_event add value if not exists 'payment_pending';
alter type subscription_event add value if not exists 'renewal_reminder_sent';
alter type subscription_event add value if not exists 'hide_blocked';
