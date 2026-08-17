-- =====================================================================
-- Sinnapi — post-event settlement, step 4: notification copy.
--
-- Same shape as the escrow templates: `{{placeholders}}` resolve against the
-- payload `settlement_notify` builds, and copy is written per audience because
-- the same event is a request to one party, a decision to another and a work
-- item to Finance.
--
-- Email is reserved for the steps where someone has to *do* something, or
-- where money changed hands. Receipts and acknowledgements stay in-app: a
-- three-party flow that emails everyone at every step trains all three to stop
-- reading the emails that matter.
-- =====================================================================

insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values

-- ---------- the vendor asks ----------
('settlement.requested.vendor', 'in_app', 'Payout requested for {{booking_ref}}',
 'We have asked our team to release the {{currency}} {{requested_amount}} still held for booking {{booking_ref}}. You will hear as soon as the client responds.', 'en'),
('settlement.requested.admin', 'in_app', 'Vendor is asking to be paid — {{booking_ref}}',
 '{{vendor_name}} says the event for {{booking_ref}} is done and wants the {{currency}} {{requested_amount}} being held. Put it to {{client_name}} to approve.', 'en'),
('settlement.requested.admin', 'email', 'Settlement request awaiting you — {{booking_ref}}',
 '{{vendor_name}} has requested the balance held on booking {{booking_ref}} after the event.\n\nAmount held for the vendor: {{currency}} {{requested_amount}}\nVendor''s note: {{note}}\n\nOpen the booking and forward it to {{client_name}} for approval. Until you do, the client has not been asked anything and the vendor is waiting.', 'en'),

-- ---------- the admin puts it to the client ----------
('settlement.forwarded.client', 'in_app', 'Approve the payment for {{booking_ref}}',
 'Your event is done and {{vendor_name}} has asked for the {{currency}} {{requested_amount}} we are holding. Approve it, or tell us you want to pay less and why. Please respond by {{client_due_at}}.', 'en'),
('settlement.forwarded.client', 'email', 'Please approve the payment for booking {{booking_ref}}',
 'Your event with {{vendor_name}} is complete and they have asked to be paid the amount we have been holding for them.\n\nAmount requested: {{currency}} {{requested_amount}}\n\nYou can approve it in full, or approve a smaller amount and tell us why. Whatever you choose, the vendor sees your reason and has to agree to any reduction before we pay anything — nothing moves without both of you on the record.\n\nPlease respond by {{client_due_at}}. If we do not hear from you by then, we pass the request to our team as a full-amount release for review.', 'en'),
('settlement.forwarded.vendor', 'in_app', 'Your payout request is with the client',
 'We have asked {{client_name}} to approve the {{currency}} {{requested_amount}} for {{booking_ref}}. They have until {{client_due_at}} to respond.', 'en'),

-- ---------- the client approves in full ----------
('settlement.approved_full.vendor', 'in_app', 'Client approved your full payout',
 '{{client_name}} approved {{currency}} {{approved_amount}} in full for {{booking_ref}}. It is with our finance team for release.', 'en'),
('settlement.approved_full.vendor', 'email', 'Your payout was approved in full — {{booking_ref}}',
 'Good news — {{client_name}} approved your request on booking {{booking_ref}} in full.\n\nAgreed payout: {{currency}} {{approved_amount}}\n\nOur finance team will now approve the release and settle it to your registered payout destination. You will get the reference once it is sent.', 'en'),
('settlement.approved_full.client', 'in_app', 'Thanks — payment approved',
 'You approved {{currency}} {{approved_amount}} for {{booking_ref}}. We are releasing it to {{vendor_name}}.', 'en'),
('settlement.approved_full.admin', 'in_app', 'Settlement approved in full — {{booking_ref}}',
 '{{client_name}} approved {{currency}} {{approved_amount}}. Release it to {{vendor_name}}.', 'en'),

-- ---------- the client offers less ----------
('settlement.reduced.vendor', 'in_app', 'Client has offered less for {{booking_ref}}',
 '{{client_name}} has offered {{currency}} {{approved_amount}} of the {{currency}} {{requested_amount}} you asked for. Their reason: {{decision_reason}}. Accept it or contest it by {{vendor_due_at}} — we will not pay anything until you answer.', 'en'),
('settlement.reduced.vendor', 'email', 'Action needed: a reduced amount was offered on {{booking_ref}}',
 '{{client_name}} has reviewed your payout request on booking {{booking_ref}} and offered less than you asked for.\n\nYou asked for: {{currency}} {{requested_amount}}\nThey have offered: {{currency}} {{approved_amount}}\nTheir reason: {{decision_reason}}\n\nNothing is paid and nothing is refunded until you answer. Accept the amount and we release it, or contest it and our team will step in and review both sides before any money moves.\n\nPlease respond by {{vendor_due_at}}. Silence is not treated as agreement — if we do not hear from you, this goes to our team rather than being settled at the lower figure.', 'en'),
('settlement.reduced.client', 'in_app', 'We have put your offer to the vendor',
 'You offered {{currency}} {{approved_amount}} for {{booking_ref}}. {{vendor_name}} has to agree before we release anything — we will let you know as soon as they respond.', 'en'),
('settlement.reduced.admin', 'in_app', 'Reduced offer on {{booking_ref}}',
 '{{client_name}} offered {{currency}} {{approved_amount}} of {{currency}} {{requested_amount}} ({{decision_reason}}). Awaiting the vendor''s consent — do not release until they agree.', 'en'),

-- ---------- the vendor answers ----------
('settlement.vendor_accepted.client', 'in_app', 'Vendor accepted your amount',
 '{{vendor_name}} accepted {{currency}} {{approved_amount}} for {{booking_ref}}. The difference of {{currency}} {{withheld_amount}} comes back to you once finance processes it.', 'en'),
('settlement.vendor_accepted.vendor', 'in_app', 'You accepted the reduced amount',
 'You accepted {{currency}} {{approved_amount}} for {{booking_ref}}. It is with our finance team for release.', 'en'),
('settlement.vendor_accepted.admin', 'in_app', 'Both parties agreed — {{booking_ref}}',
 'Agreed figure: {{currency}} {{approved_amount}}. {{currency}} {{withheld_amount}} returns to the client. Release it.', 'en'),
('settlement.vendor_contested.client', 'in_app', 'Vendor has contested the amount',
 '{{vendor_name}} does not accept {{currency}} {{approved_amount}} for {{booking_ref}}. Funds are frozen and our team is reviewing both sides.', 'en'),
('settlement.vendor_contested.client', 'email', 'The vendor has contested your amount — {{booking_ref}}',
 '{{vendor_name}} has not accepted the {{currency}} {{approved_amount}} you offered on booking {{booking_ref}}.\n\nTheir reason: {{note}}\n\nNothing has been paid or refunded. The money stays where it is while our team reviews what both of you have said, and we will come back to you with a resolution.', 'en'),
('settlement.vendor_contested.vendor', 'in_app', 'You contested the amount on {{booking_ref}}',
 'We have raised this for review and frozen the funds. Please add anything that supports your side — photos, messages, the signed brief.', 'en'),
('settlement.vendor_contested.admin', 'in_app', 'Settlement contested — {{booking_ref}}',
 '{{vendor_name}} rejected {{currency}} {{approved_amount}} of {{currency}} {{requested_amount}}. A dispute is open and the timers are frozen.', 'en'),

-- ---------- released ----------
('settlement.released.vendor', 'in_app', 'Payout approved — {{booking_ref}}',
 '{{currency}} {{final_amount}} has been approved for release on {{booking_ref}} and is queued for settlement.', 'en'),
('settlement.released.vendor', 'email', 'Your settlement was approved — {{booking_ref}}',
 'The agreed amount for booking {{booking_ref}} has been approved for release.\n\nAgreed payout: {{currency}} {{final_amount}}\n\nThis is the figure recorded as agreed by you, the client and Sinnapi. Our finance team will now transfer it to your registered payout destination and send you the reference.', 'en'),
('settlement.released.client', 'in_app', 'Settlement complete for {{booking_ref}}',
 '{{currency}} {{final_amount}} is on its way to {{vendor_name}}. Anything withheld comes back to you once finance processes the refund.', 'en'),
('settlement.released.client', 'email', 'What was agreed on booking {{booking_ref}}',
 'The settlement on booking {{booking_ref}} is done and this is the record of it.\n\nVendor asked for: {{currency}} {{requested_amount}}\nAgreed and paid to {{vendor_name}}: {{currency}} {{final_amount}}\nReturning to you: {{currency}} {{withheld_amount}}\n\nEvery figure above was consented to by you and by the vendor before anything moved. Keep this email — it is your copy of that agreement.', 'en'),
('settlement.released.admin', 'in_app', 'Settlement released — {{booking_ref}}',
 'Paid {{currency}} {{final_amount}} to {{vendor_name}}; {{currency}} {{withheld_amount}} raised as a refund to {{client_name}}. Settle both.', 'en'),

-- ---------- chasing and expiry ----------
('settlement.nudge.client', 'in_app', 'Reminder: {{booking_ref}} is waiting on you',
 '{{vendor_name}} is still waiting on your decision about the {{currency}} {{requested_amount}} for {{booking_ref}}. {{note}}', 'en'),
('settlement.nudge.vendor', 'in_app', 'Reminder: {{booking_ref}} is waiting on you',
 'The client is waiting for your answer on the amount offered for {{booking_ref}}. {{note}}', 'en'),
('settlement.nudge.admin', 'in_app', 'Reminder: {{booking_ref}} is waiting on us',
 'A settlement request on {{booking_ref}} is still with our team. {{note}}', 'en'),

('settlement.client_timeout.client', 'in_app', 'We did not hear back on {{booking_ref}}',
 'You did not respond by {{client_due_at}}, so the request for {{currency}} {{approved_amount}} has gone to our team for review. Contact us now if there was a problem with this event.', 'en'),
('settlement.client_timeout.client', 'email', 'Booking {{booking_ref}} has gone to our team for review',
 'We asked you to approve the payment for booking {{booking_ref}} and did not hear back by {{client_due_at}}.\n\nAmount: {{currency}} {{approved_amount}}\n\nAs we said we would, the request has been passed to our finance team to review and approve. A person still looks at it before anything is paid — so if something went wrong with this event, contact us now and we will stop it.', 'en'),
('settlement.client_timeout.vendor', 'in_app', 'No response from the client on {{booking_ref}}',
 'The client did not respond in time, so your request for {{currency}} {{approved_amount}} has gone to our finance team for approval.', 'en'),
('settlement.client_timeout.admin', 'in_app', 'Client did not respond — {{booking_ref}}',
 'No client response within the window. Recorded as a full approval of {{currency}} {{approved_amount}}; review it and release.', 'en'),

('settlement.vendor_timeout.vendor', 'in_app', 'You still have not answered on {{booking_ref}}',
 'The client offered {{currency}} {{approved_amount}} and we have not had your answer. Nothing is paid until you accept or contest it.', 'en'),
('settlement.vendor_timeout.admin', 'in_app', 'Vendor has not answered a reduction — {{booking_ref}}',
 '{{vendor_name}} has not responded to the reduced offer of {{currency}} {{approved_amount}}. Silence is not consent — someone should call them.', 'en'),

('settlement.admin_overdue.admin', 'in_app', 'Settlement request not forwarded — {{booking_ref}}',
 '{{vendor_name}}''s request for {{currency}} {{requested_amount}} has not been put to the client yet. They are waiting on us.', 'en'),
('settlement.admin_overdue.vendor', 'in_app', 'Your request is still with our team',
 'We have not yet put your request for {{booking_ref}} to the client. We are on it — thanks for your patience.', 'en'),

-- ---------- withdrawn ----------
('settlement.cancelled.client', 'in_app', 'Payment request withdrawn — {{booking_ref}}',
 'The request for {{currency}} {{requested_amount}} on {{booking_ref}} has been withdrawn: {{note}}', 'en'),
('settlement.cancelled.vendor', 'in_app', 'Payment request withdrawn — {{booking_ref}}',
 'The settlement request on {{booking_ref}} has been withdrawn: {{note}}', 'en'),
('settlement.cancelled.admin', 'in_app', 'Settlement withdrawn — {{booking_ref}}',
 'The request for {{currency}} {{requested_amount}} was withdrawn: {{note}}', 'en')

on conflict (trigger_key, channel, locale) do update
  set subject = excluded.subject,
      body_template = excluded.body_template,
      is_active = true;
