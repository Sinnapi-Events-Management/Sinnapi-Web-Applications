-- =====================================================================
-- Sinnapi — the booking payment window, step 4: the copy.
--
-- `{{placeholders}}` resolve against the payload `booking_payment_notify`
-- builds. Copy differs per audience for the reason the escrow templates do:
-- the same elapsed deadline is a last chance to the client, a released date to
-- the vendor, and a queue item to an admin.
--
-- One rule runs through all of it. Nothing here threatens the client with an
-- automatic cancellation, because there is no automatic cancellation — the
-- copy says a person may cancel it, which is what actually happens. Warning
-- someone about a consequence the system will not deliver is how a platform
-- teaches its users to ignore its warnings.
-- =====================================================================

insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values

-- ---------- the clock starts ----------
('booking.payment_due.client', 'in_app', 'Payment due for {{booking_ref}}',
 '{{vendor_name}} has confirmed your booking. Pay by {{payment_due_at}} to secure the date.', 'en'),
('booking.payment_due.client', 'email', 'Secure your booking {{booking_ref}} — payment due {{payment_due_at}}',
 'Good news — {{vendor_name}} has confirmed booking {{booking_ref}} for {{event_date}}.\n\nThe date is being held for you until {{payment_due_at}}. To secure it, pay the booking in full through Sinnapi escrow: the agreed amount of {{currency}} {{agreed_amount}}, plus Sinnapi''s commission and the payment provider''s processing fee, in one single payment. There are no instalments — the whole amount is held by us and released to {{vendor_name}} only on the schedule you approved.\n\nIf we have not received payment by {{payment_due_at}}, {{vendor_name}} or our team may cancel the booking and release the date to someone else.', 'en'),
('booking.payment_due.admin', 'in_app', 'Awaiting payment — {{booking_ref}}',
 '{{client_name}} has until {{payment_due_at}} to fund booking {{booking_ref}} ({{currency}} {{agreed_amount}}).', 'en'),

-- ---------- automatic reminders on the way down ----------
('booking.payment_reminder.client', 'in_app', '{{hours_left}}h left to pay {{booking_ref}}',
 'Your booking with {{vendor_name}} is still unpaid. Payment is due by {{payment_due_at}}.', 'en'),
('booking.payment_reminder.client', 'email', 'Reminder: booking {{booking_ref}} is still unpaid',
 'Booking {{booking_ref}} with {{vendor_name}} on {{event_date}} has not been paid yet.\n\nPayment is due by {{payment_due_at}} — that is about {{hours_left}} hours away. The full amount is paid in one go through Sinnapi escrow, and we hold it until the job is done.\n\nIf the deadline passes, {{vendor_name}} or our team may cancel the booking and release your date.', 'en'),

-- ---------- somebody chases by hand ----------
('booking.payment_nudge.client', 'in_app', 'A reminder about booking {{booking_ref}}',
 'You have been sent a reminder to pay booking {{booking_ref}}. Payment is due by {{payment_due_at}}.', 'en'),
('booking.payment_nudge.client', 'email', 'A reminder to pay booking {{booking_ref}}',
 'This is a reminder about booking {{booking_ref}} with {{vendor_name}} on {{event_date}}, which is still awaiting payment.\n\n{{note}}\n\nPayment is due in full by {{payment_due_at}}.', 'en'),

-- ---------- an admin buys the client more time ----------
('booking.payment_extended.client', 'in_app', 'More time to pay {{booking_ref}}',
 'Your payment deadline for booking {{booking_ref}} has been extended to {{payment_due_at}}.', 'en'),
('booking.payment_extended.client', 'email', 'Your payment deadline for {{booking_ref}} has been extended',
 'We have extended the payment deadline on booking {{booking_ref}} with {{vendor_name}}.\n\nNew deadline: {{payment_due_at}}\nReason: {{note}}\n\nThe booking is still held for you until then.', 'en'),
('booking.payment_extended.vendor', 'in_app', 'Payment deadline extended — {{booking_ref}}',
 'Our team has given {{client_name}} until {{payment_due_at}} to pay booking {{booking_ref}}. Reason: {{note}}', 'en'),

-- ---------- the clock ran out ----------
('booking.payment_overdue.client', 'in_app', 'Booking {{booking_ref}} is unpaid and overdue',
 'The payment deadline for booking {{booking_ref}} has passed. Pay now, or {{vendor_name}} may cancel and release your date.', 'en'),
('booking.payment_overdue.client', 'email', 'Action needed: booking {{booking_ref}} is overdue',
 'The payment deadline for booking {{booking_ref}} with {{vendor_name}} passed on {{payment_due_at}} and we have not received payment.\n\nYou can still pay in full from your booking page, and we would encourage you to do it now — {{vendor_name}} or our team may now cancel this booking and release your date of {{event_date}} to another client.\n\nIf you are having trouble paying, reply to this email and we will help.', 'en'),
('booking.payment_overdue.vendor', 'in_app', '{{booking_ref}} was not paid in time',
 '{{client_name}} did not fund booking {{booking_ref}} by {{payment_due_at}}. You can cancel it and free up {{event_date}}, or give them longer by doing nothing.', 'en'),
('booking.payment_overdue.vendor', 'email', 'Booking {{booking_ref}} was not paid in time',
 '{{client_name}} has not paid for booking {{booking_ref}} on {{event_date}}, and the deadline of {{payment_due_at}} has now passed.\n\nNothing has been cancelled. The decision is yours: you can cancel the booking from your booking page and release the date, or leave it open and give the client more time. If you cancel, we will tell the client why.\n\nYou can also send them one more reminder before deciding.', 'en'),
('booking.payment_overdue.admin', 'in_app', 'Overdue payment — {{booking_ref}}',
 '{{client_name}} missed the {{payment_due_at}} deadline on booking {{booking_ref}} ({{currency}} {{agreed_amount}}). Nothing was cancelled.', 'en'),

-- ---------- somebody ended it ----------
('booking.payment_cancelled.client', 'in_app', 'Booking {{booking_ref}} was cancelled',
 'Booking {{booking_ref}} was cancelled because it was not paid by {{payment_due_at}}. Reason given: {{note}}', 'en'),
('booking.payment_cancelled.client', 'email', 'Booking {{booking_ref}} has been cancelled',
 'Booking {{booking_ref}} with {{vendor_name}} on {{event_date}} has been cancelled because payment was not received by {{payment_due_at}}.\n\nReason given: {{note}}\n\nNo money was taken — nothing was ever charged to you for this booking. If you still want this vendor for your event, you are welcome to send them a fresh request.', 'en'),
('booking.payment_cancelled.vendor', 'in_app', '{{booking_ref}} cancelled — date released',
 'Unpaid booking {{booking_ref}} has been cancelled and {{event_date}} is free again.', 'en'),
('booking.payment_cancelled.admin', 'in_app', 'Unpaid booking cancelled — {{booking_ref}}',
 'Booking {{booking_ref}} was cancelled unpaid by {{cancelled_by}}. Reason: {{note}}', 'en')

on conflict (trigger_key, channel, locale) do nothing;
