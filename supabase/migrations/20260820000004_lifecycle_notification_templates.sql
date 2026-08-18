-- =====================================================================
-- Sinnapi — 0820d Lifecycle notifications: the copy
--
-- `{{placeholders}}` resolve against the payloads built by
-- `quotation_notify_payload` and `booking_notify_payload`, enriched by
-- `notify_enrich` for the in-app row and by the dispatcher's `enrich()` for the
-- email. Seeded as data so Support can reword without a deploy.
--
-- WHICH TRIGGERS GET AN EMAIL IS DECIDED HERE AND NOWHERE ELSE
-- `tg_notification_email` enqueues mail if and only if a row exists below with
-- `channel = 'email'` for that trigger and audience. So this table is the
-- email policy, and the policy is: mail the recipient when they have to do
-- something, and when the thing is over. Not for progress.
--
--   action required   quotation.requested, quotation.sent,
--                     quotation.revision_requested, booking.terms_proposed,
--                     booking.from_quotation, booking.terms_countered
--   terminal          quotation.accepted, .declined, .voided, .expired,
--                     booking.confirmed, .declined, .completed, .cancelled
--   in-app only       booking.started — a progress step both parties are
--                     already expecting on a day they already know about
--   in-app only       every `.admin` variant — the desk reads a feed, and an
--                     operator does not need a marketplace's exceptions in
--                     their inbox
--
-- WHY `E'...'` AND NOT `'...'`
-- The body is plain text with real newlines: `templatedEmail` splits it on
-- blank lines into paragraphs and converts single newlines to `<br />`. A plain
-- SQL literal under `standard_conforming_strings` (the default) would store a
-- backslash and an `n` — two characters that render as the text `\n` in the
-- recipient's inbox rather than as a line break.
-- =====================================================================

insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values

-- =====================================================================
-- QUOTATIONS
-- =====================================================================

-- ---------- a client asks for a price ----------
-- The vendor's queue is the whole point of this one: before it existed, a quote
-- request landed in the database and the vendor found out by looking.
('quotation.requested.vendor', 'in_app', 'New quote request from {{client_name}}',
 '{{client_name}} has asked you for a price on {{quote_ref}}. Build the quote and send it back with your terms.', 'en'),
('quotation.requested.vendor', 'email', 'New quote request — {{quote_ref}}',
 E'{{client_name}} has asked you for a price.\n\nReference: {{quote_ref}}\n\nQuotes you answer quickly are the ones that turn into bookings. Open the request, add your line items and send it back with the advance terms you want.', 'en'),

-- ---------- the vendor answers with a price ----------
('quotation.sent.client', 'in_app', '{{vendor_name}} sent you a quote',
 '{{quote_ref}} is priced at {{currency}} {{total}}. It is valid until {{valid_until}} — accept it, ask for changes, or decline.', 'en'),
('quotation.sent.client', 'email', 'Your quote from {{vendor_name}} — {{currency}} {{total}}',
 E'{{vendor_name}} has priced your request.\n\nReference: {{quote_ref}}\nTotal: {{currency}} {{total}}\nValid until: {{valid_until}}\n\nOpen it to see the line items and the advance terms. You can accept it, ask for a revision, or decline — and accepting is what lets you pick a date and turn it into a booking.', 'en'),

-- ---------- the client wants changes ----------
('quotation.revision_requested.vendor', 'in_app', '{{client_name}} asked for changes to {{quote_ref}}',
 '{{reason}}', 'en'),
('quotation.revision_requested.vendor', 'email', 'Revision requested on {{quote_ref}}',
 E'{{client_name}} has asked you to revise the quote you sent.\n\nReference: {{quote_ref}}\nCurrent total: {{currency}} {{total}}\n\nWhat they said:\n{{reason}}\n\nAdjust the line items and send it again.', 'en'),

-- ---------- the client says yes ----------
('quotation.accepted.vendor', 'in_app', '{{client_name}} accepted {{quote_ref}}',
 'The price of {{currency}} {{total}} is agreed. The client picks a date next, which arrives as a booking request for you to confirm.', 'en'),
('quotation.accepted.vendor', 'email', 'Quote accepted — {{quote_ref}}',
 E'{{client_name}} has accepted your quote.\n\nReference: {{quote_ref}}\nAgreed total: {{currency}} {{total}}\n\nThe price and your advance terms are now binding. The client chooses a date from here, which reaches you as a booking request — confirm it to hold the date.', 'en'),

-- ---------- the client says no ----------
('quotation.declined.vendor', 'in_app', '{{client_name}} declined {{quote_ref}}',
 '{{reason}}', 'en'),
('quotation.declined.vendor', 'email', 'Quote declined — {{quote_ref}}',
 E'{{client_name}} has declined your quote of {{currency}} {{total}}.\n\nReference: {{quote_ref}}\n\nWhat they said:\n{{reason}}\n\nThe thread stays open — if the price was the obstacle, you can send a revised quote.', 'en'),
('quotation.declined.admin', 'in_app', 'Quote declined — {{quote_ref}}',
 '{{client_name}} declined {{vendor_name}}''s quote of {{currency}} {{total}}. Reason: {{reason}}', 'en'),

-- ---------- either party withdraws ----------
-- Two audiences, one trigger, and the sentences are not interchangeable: the
-- client is told the vendor pulled out, the vendor that the client did.
('quotation.voided.client', 'in_app', '{{vendor_name}} withdrew {{quote_ref}}',
 'The vendor has withdrawn this quote. Reason: {{reason}}', 'en'),
('quotation.voided.client', 'email', 'Quote withdrawn — {{quote_ref}}',
 E'{{vendor_name}} has withdrawn the quote {{quote_ref}}.\n\nReason: {{reason}}\n\nNothing is owed and nothing is booked. You can request a price from another vendor at any time.', 'en'),
('quotation.voided.vendor', 'in_app', '{{client_name}} withdrew {{quote_ref}}',
 'The client has withdrawn this quote request. Reason: {{reason}}', 'en'),
('quotation.voided.vendor', 'email', 'Quote request withdrawn — {{quote_ref}}',
 E'{{client_name}} has withdrawn the quote request {{quote_ref}}.\n\nReason: {{reason}}\n\nNo further action is needed from you.', 'en'),
('quotation.voided.admin', 'in_app', 'Quote withdrawn — {{quote_ref}}',
 '{{quote_ref}} between {{client_name}} and {{vendor_name}} was withdrawn. Reason: {{reason}}', 'en'),

-- ---------- the clock runs out ----------
-- Nobody did this, so both sides hear it, and neither sentence blames anyone.
('quotation.expired.client', 'in_app', 'Your quote from {{vendor_name}} has expired',
 '{{quote_ref}} passed its validity date of {{valid_until}} without an answer. Ask {{vendor_name}} for a fresh price if you still need it.', 'en'),
('quotation.expired.client', 'email', 'Quote expired — {{quote_ref}}',
 E'The quote {{vendor_name}} sent you has passed its validity date.\n\nReference: {{quote_ref}}\nTotal quoted: {{currency}} {{total}}\nExpired: {{valid_until}}\n\nPrices move, so this one no longer stands. If the event is still on, ask {{vendor_name}} for a current price — the conversation is still there.', 'en'),
('quotation.expired.vendor', 'in_app', '{{quote_ref}} expired without an answer',
 'Your quote to {{client_name}} for {{currency}} {{total}} lapsed on {{valid_until}}.', 'en'),
('quotation.expired.vendor', 'email', 'Your quote expired — {{quote_ref}}',
 E'The quote you sent {{client_name}} has passed its validity date with no answer.\n\nReference: {{quote_ref}}\nTotal quoted: {{currency}} {{total}}\nExpired: {{valid_until}}\n\nIf the work is still available, sending a fresh quote is often what restarts the conversation.', 'en'),

-- =====================================================================
-- BOOKINGS
--
-- The three below have no `in_app` template on purpose: their in-app copy is
-- composed in SQL by the RPCs that create them, because it depends on which
-- payment rail the client proposed and templates cannot select on a column.
-- Seeding only the `email` row is what turns the mail on for them.
-- =====================================================================

('booking.terms_proposed.vendor', 'email', 'New booking request — {{event_date}}',
 E'{{client_name}} has asked to book you.\n\nDate: {{event_date}}\nAmount: {{currency}} {{amount}}\n\nThey have also proposed how they want to pay. Open the request to confirm the date and the terms, or to propose the other payment rail instead. A date you have not confirmed is not held.', 'en'),

('booking.from_quotation.vendor', 'email', 'Your quote has been booked — {{event_date}}',
 E'{{client_name}} has accepted your quote and picked a date.\n\nDate: {{event_date}}\nAgreed amount: {{currency}} {{amount}}\n\nConfirm the booking to hold the date. Until you do, it is a request rather than an arrangement.', 'en'),

('booking.terms_countered.client', 'email', 'Your vendor proposed different payment terms',
 E'{{vendor_name}} would rather be paid on a different basis than the one you proposed for your booking on {{event_date}}.\n\nWhat they said:\n{{reason}}\n\nThe date is not held while this is open. Review what they are proposing and accept or decline it.', 'en'),

-- ---------- the vendor confirms ----------
-- `payment_terms_line` is the rail-specific half — reassurance on escrow, a
-- plain warning on direct. See booking_notify_payload for why it is composed
-- in SQL rather than selected here.
('booking.confirmed.client', 'in_app', 'Your booking is confirmed',
 'The vendor has confirmed {{event_date}}. {{payment_terms_line}}', 'en'),
('booking.confirmed.client', 'email', 'Booking confirmed — {{event_date}}',
 E'{{vendor_name}} has confirmed your booking.\n\nReference: {{booking_ref}}\nDate: {{event_date}}\nAmount: {{currency}} {{amount}}\n\n{{payment_terms_line}}', 'en'),
('booking.confirmed.vendor', 'in_app', 'Booking {{booking_ref}} is confirmed',
 '{{client_name}} agreed to the terms and {{event_date}} is now held.', 'en'),
('booking.confirmed.vendor', 'email', 'Booking confirmed — {{event_date}}',
 E'Your booking with {{client_name}} is confirmed.\n\nReference: {{booking_ref}}\nDate: {{event_date}}\nAmount: {{currency}} {{amount}}\n\nThe date is held. Keep your payout details current so settlement is not delayed when the time comes.', 'en'),

-- ---------- it ends before it starts ----------
('booking.declined.client', 'in_app', 'Your booking request was declined',
 '{{reason}}', 'en'),
('booking.declined.client', 'email', 'Booking request declined — {{event_date}}',
 E'{{vendor_name}} has declined your booking request for {{event_date}}.\n\nWhat they said:\n{{reason}}\n\nNothing has been charged. Other vendors are available for that date — start from Discover to find one.', 'en'),
('booking.declined.vendor', 'in_app', 'Booking {{booking_ref}} was declined',
 '{{reason}}', 'en'),
('booking.declined.vendor', 'email', 'Booking declined — {{event_date}}',
 E'The booking request from {{client_name}} for {{event_date}} has been declined.\n\nReason: {{reason}}\n\nThe date is free again on your calendar.', 'en'),
('booking.declined.admin', 'in_app', 'Booking declined — {{booking_ref}}',
 '{{vendor_name}} and {{client_name}} did not agree on {{event_date}}. Reason: {{reason}}', 'en'),

-- ---------- work begins ----------
-- In-app only, deliberately. Both parties know the date; this is the pin in it,
-- not news, and it is the one arm of this flow that would be inbox noise.
('booking.started.client', 'in_app', '{{vendor_name}} has started work',
 'Booking {{booking_ref}} for {{event_date}} is now in progress.', 'en'),
('booking.started.vendor', 'in_app', 'Booking {{booking_ref}} is in progress',
 'Work on {{client_name}}''s booking for {{event_date}} has been marked as started.', 'en'),

-- ---------- it is done ----------
('booking.completed.client', 'in_app', 'Your booking is complete',
 '{{vendor_name}} has marked {{booking_ref}} complete. Confirm the service to release the balance, and leave a review while it is fresh.', 'en'),
('booking.completed.client', 'email', 'Booking complete — {{booking_ref}}',
 E'{{vendor_name}} has marked your booking as complete.\n\nReference: {{booking_ref}}\nDate: {{event_date}}\nAmount: {{currency}} {{amount}}\n\nIf you paid through Sinnapi escrow, confirming the service is what releases the remaining balance to the vendor — and if something was not right, raise it from the booking instead and we will hold the money while we look.\n\nA review takes a minute and is what other clients read when they are choosing.', 'en'),
('booking.completed.vendor', 'in_app', 'Booking {{booking_ref}} marked complete',
 'The balance is released once {{client_name}} confirms the service.', 'en'),
('booking.completed.vendor', 'email', 'Booking complete — {{booking_ref}}',
 E'Booking {{booking_ref}} with {{client_name}} is marked complete.\n\nDate: {{event_date}}\nAmount: {{currency}} {{amount}}\n\nOn an escrow booking the remaining balance is released once the client confirms the service. We will tell you the moment it is on its way.', 'en'),

-- ---------- it is called off ----------
('booking.cancelled.client', 'in_app', 'Booking {{booking_ref}} was cancelled',
 '{{reason}}', 'en'),
('booking.cancelled.client', 'email', 'Booking cancelled — {{booking_ref}}',
 E'Your booking with {{vendor_name}} for {{event_date}} has been cancelled.\n\nReference: {{booking_ref}}\n\nReason: {{reason}}\n\nIf you had funded this through Sinnapi escrow, your money is still held by us and any refund due follows the terms you agreed. You can see where it stands from the booking.', 'en'),
('booking.cancelled.vendor', 'in_app', 'Booking {{booking_ref}} was cancelled',
 '{{reason}}', 'en'),
('booking.cancelled.vendor', 'email', 'Booking cancelled — {{booking_ref}}',
 E'The booking with {{client_name}} for {{event_date}} has been cancelled.\n\nReference: {{booking_ref}}\n\nReason: {{reason}}\n\nThe date is free again on your calendar. Any settlement already due to you is unaffected.', 'en'),
('booking.cancelled.admin', 'in_app', 'Booking cancelled — {{booking_ref}}',
 '{{booking_ref}} ({{vendor_name}} / {{client_name}}, {{event_date}}, {{currency}} {{amount}}) was cancelled. Reason: {{reason}}', 'en')

on conflict (trigger_key, channel, locale) do update
  set subject       = excluded.subject,
      body_template = excluded.body_template,
      is_active     = true;
