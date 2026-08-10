-- =====================================================================
-- Sinnapi — Escrow v2, step 4: notification content and routing.
--
-- The money RPCs emit one outbox row per recipient, each already carrying the
-- resolved payload and an `audience` of client | vendor | admin. This file
-- supplies the copy those rows render with, and retires the blanket
-- table-change triggers that would otherwise double-notify.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Retire the generic fan-out for the two aggregates that now emit typed
-- events of their own. Left in place for every other table.
--
-- The old trigger fired on EVERY update of escrow_transactions and payments —
-- including internal bookkeeping like attaching a provider ref — and produced
-- a notification titled with the raw trigger key. Explicit emission from the
-- RPCs replaces it: one row per party who actually has standing in the event.
-- ---------------------------------------------------------------------
drop trigger if exists trg_outbox on public.escrow_transactions;
drop trigger if exists trg_outbox on public.payments;

-- Same reasoning for the escrow event stream. `tg_escrow_event` wrote a row on
-- every status change by casting the status name to an event type, which meant
--   (a) it duplicated the richer event `escrow_notify` already writes in the
--       same transaction, giving every transition two history rows, and
--   (b) any status without an identically-named event type aborted the whole
--       money transaction.
-- Every status write in the escrow RPCs calls escrow_notify, so the stream
-- stays complete — and each entry now carries the acting user, the amount that
-- actually moved, and the context, rather than just a new status name.
drop trigger if exists trg_escrow_event on public.escrow_transactions;

-- ---------------------------------------------------------------------
-- Templates.
--
-- `{{placeholders}}` resolve against the outbox payload built by
-- escrow_notify. Copy differs per audience: the same release approval is
-- reassurance to a client, an incoming payment to a vendor, and a work item
-- to Finance. Seeded as data so Support can reword without a deploy.
-- ---------------------------------------------------------------------
insert into public.notification_templates (trigger_key, channel, subject, body_template, locale) values

-- ---------- awaiting payment ----------
('escrow.awaiting_payment.client', 'in_app', 'Complete your escrow payment',
 'Booking {{booking_ref}} is ready to fund. Pay {{currency}} {{gross_amount}} to secure {{vendor_name}}.', 'en'),
('escrow.awaiting_payment.client', 'email', 'Complete your payment for booking {{booking_ref}}',
 'Your booking with {{vendor_name}} is confirmed and waiting on payment.\n\nAgreed amount: {{currency}} {{agreed_amount}}\nPlatform commission: {{currency}} {{commission_amount}}\nProcessing fee: {{currency}} {{psp_fee_amount}}\nTotal to pay: {{currency}} {{gross_amount}}\n\nYour money is held by Sinnapi and only released to the vendor on the schedule you approved.', 'en'),
('escrow.awaiting_payment.vendor', 'in_app', 'Client is paying for {{booking_ref}}',
 '{{client_name}} has started an escrow payment for booking {{booking_ref}}. We will confirm once the funds clear.', 'en'),

-- ---------- funded ----------
('escrow.funded.client', 'in_app', 'Payment received — funds are protected',
 'We are holding {{currency}} {{gross_amount}} for booking {{booking_ref}}. Nothing reaches the vendor until the agreed schedule.', 'en'),
('escrow.funded.client', 'email', 'Your escrow payment is secured — {{booking_ref}}',
 'We have received {{currency}} {{gross_amount}} for booking {{booking_ref}}.\n\nAdvance to vendor: {{currency}} {{advance_amount}}, releasing on {{advance_release_due_at}}\nBalance: {{currency}} {{balance_amount}}, releasing once you confirm the service after the event.\n\nIf anything goes wrong you can raise an issue from your booking at any time.', 'en'),
('escrow.funded.vendor', 'in_app', 'Escrow funded for {{booking_ref}}',
 'The client has funded booking {{booking_ref}}. You will receive {{currency}} {{advance_amount}} as an advance, then {{currency}} {{balance_amount}} after the event.', 'en'),
('escrow.funded.vendor', 'email', 'Funds secured for booking {{booking_ref}}',
 'Good news — {{client_name}} has funded booking {{booking_ref}} through Sinnapi escrow.\n\nAdvance: {{currency}} {{advance_amount}} — due {{advance_release_due_at}}\nBalance: {{currency}} {{balance_amount}} — after the client confirms the service\nTotal to you: {{currency}} {{agreed_amount}}\n\nPlease keep your payout details up to date so we can settle without delay.', 'en'),
('escrow.funded.admin', 'in_app', 'Escrow funded — {{booking_ref}}',
 '{{currency}} {{gross_amount}} received. Advance of {{currency}} {{advance_amount}} falls due {{advance_release_due_at}}.', 'en'),

-- ---------- payment problems ----------
('escrow.payment_failed.client', 'in_app', 'Payment did not go through',
 'Your payment for booking {{booking_ref}} failed: {{reason}}. You can try again from the booking.', 'en'),
('escrow.payment_failed.client', 'email', 'Payment failed for booking {{booking_ref}}',
 'We could not complete your payment for booking {{booking_ref}}.\n\nReason: {{reason}}\n\nNo money has left your account. You can retry with the same or a different payment method from your booking page.', 'en'),
('escrow.payment_failed.admin', 'in_app', 'Escrow funding failed — {{booking_ref}}',
 'Funding failed for {{booking_ref}}: {{reason}}.', 'en'),
('escrow.payment_reversed.admin', 'in_app', 'Payment reversed after funding — {{booking_ref}}',
 'The processor reversed {{currency}} {{amount}} on {{booking_ref}} after escrow was funded. Escrow is frozen pending review.', 'en'),
('escrow.payment_reversed.client', 'in_app', 'There is a problem with your payment',
 'Your payment for {{booking_ref}} was reversed by the provider. Our team is reviewing it and will be in touch.', 'en'),
('escrow.payment_reversed.vendor', 'in_app', 'Escrow frozen on {{booking_ref}}',
 'A payment reversal on booking {{booking_ref}} has put the escrow on hold pending review.', 'en'),

-- ---------- advance tranche ----------
('escrow.advance_scheduled.vendor', 'in_app', 'Your advance is due',
 'The advance of {{currency}} {{advance_amount}} for booking {{booking_ref}} is now with our finance team for settlement.', 'en'),
('escrow.advance_scheduled.vendor', 'email', 'Advance due for booking {{booking_ref}}',
 'Your advance of {{currency}} {{advance_amount}} for booking {{booking_ref}} is scheduled for settlement.\n\nOur finance team will transfer it to your registered payout destination and you will get a confirmation with the reference once it is sent.', 'en'),
('escrow.advance_scheduled.admin', 'in_app', 'Advance settlement due — {{booking_ref}}',
 '{{currency}} {{advance_amount}} owed to {{vendor_name}}. Record the settlement with a reference and receipt.', 'en'),
('escrow.advance_settled.vendor', 'in_app', 'Advance sent',
 'We have sent your advance of {{currency}} {{advance_amount}} for {{booking_ref}} via {{method}}.', 'en'),
('escrow.advance_settled.vendor', 'email', 'Your advance has been sent — {{booking_ref}}',
 'We have transferred your advance of {{currency}} {{advance_amount}} for booking {{booking_ref}}.\n\nMethod: {{method}}\nReference: {{settlement_reference}}\n\nThe remaining {{currency}} {{balance_amount}} follows once the client confirms the service after the event.', 'en'),
('escrow.advance_settled.client', 'in_app', 'Advance released to your vendor',
 'The agreed advance of {{currency}} {{advance_amount}} for {{booking_ref}} has been paid to {{vendor_name}}. The balance stays protected until you confirm.', 'en'),

-- ---------- release ----------
('escrow.release_reminder.client', 'in_app', 'Confirm your booking went well',
 'How was {{vendor_name}} for {{booking_ref}}? Confirm to release the balance, or raise an issue if something went wrong.', 'en'),
('escrow.release_reminder.client', 'email', 'Please confirm booking {{booking_ref}}',
 'Your event has passed and {{currency}} {{balance_amount}} is still being held for booking {{booking_ref}}.\n\nIf the service was delivered as agreed, confirm it so we can pay {{vendor_name}}.\nIf something went wrong, raise an issue and we will look into it before any money moves.\n\nIf we do not hear from you within {{auto_release_days}} days we will pass this to our team for review.', 'en'),
('escrow.release_requested.client', 'in_app', 'Thanks — release under review',
 'You confirmed booking {{booking_ref}}. Our finance team is approving the release of {{currency}} {{balance_amount}}.', 'en'),
('escrow.release_requested.vendor', 'in_app', 'Client confirmed {{booking_ref}}',
 '{{client_name}} confirmed the service. The balance of {{currency}} {{balance_amount}} is being approved for release.', 'en'),
('escrow.release_requested.admin', 'in_app', 'Release awaiting approval — {{booking_ref}}',
 'Client confirmed {{booking_ref}}. Approve the release of {{currency}} {{balance_amount}}.', 'en'),
('escrow.auto_release_triggered.client', 'in_app', 'Booking {{booking_ref}} passed to review',
 'We did not hear from you, so booking {{booking_ref}} has gone to our team for review. Contact us now if there was a problem.', 'en'),
('escrow.auto_release_triggered.admin', 'in_app', 'Auto-release for review — {{booking_ref}}',
 'The client did not confirm {{booking_ref}} within the window. Review before approving {{currency}} {{balance_amount}}.', 'en'),
('escrow.release_approved.vendor', 'in_app', 'Balance approved for payout',
 'The balance of {{currency}} {{balance_amount}} for {{booking_ref}} has been approved and is queued for settlement.', 'en'),
('escrow.release_approved.client', 'in_app', 'Release approved',
 'The balance for {{booking_ref}} has been approved for release to {{vendor_name}}.', 'en'),

-- ---------- closed ----------
('escrow.balance_settled.vendor', 'in_app', 'Final payment sent',
 'We have sent {{currency}} {{amount}} for {{booking_ref}} via {{method}}. This booking is now fully settled.', 'en'),
('escrow.balance_settled.vendor', 'email', 'Final payment for booking {{booking_ref}}',
 'Your final payment of {{currency}} {{amount}} for booking {{booking_ref}} has been sent.\n\nMethod: {{method}}\nReference: {{settlement_reference}}\n\nTotal received for this booking: {{currency}} {{agreed_amount}}.\n\nThank you for working with Sinnapi.', 'en'),
('escrow.balance_settled.client', 'in_app', 'Booking complete',
 'Booking {{booking_ref}} is fully settled. Thanks for using Sinnapi escrow — we would love a review.', 'en'),
('escrow.balance_settled.client', 'email', 'Booking {{booking_ref}} is complete',
 'Everything is settled for booking {{booking_ref}}.\n\nYou paid: {{currency}} {{gross_amount}}\n{{vendor_name}} received: {{currency}} {{agreed_amount}}\n\nIf you have a moment, leaving a review helps other clients choose well.', 'en'),
('escrow.balance_settled.admin', 'in_app', 'Escrow closed — {{booking_ref}}',
 '{{booking_ref}} fully settled. Commission recognised: {{currency}} {{commission_amount}}.', 'en'),

-- ---------- disputes ----------
('escrow.dispute_opened.client', 'in_app', 'Issue raised on {{booking_ref}}',
 'An issue has been raised on booking {{booking_ref}}. Funds are frozen while we review.', 'en'),
('escrow.dispute_opened.vendor', 'in_app', 'Issue raised on {{booking_ref}}',
 'An issue has been raised on booking {{booking_ref}}. Please add your side and any evidence.', 'en'),
('escrow.dispute_opened.admin', 'in_app', 'New dispute — {{booking_ref}}',
 '{{reason}}. SLA {{sla_hours}}h. Escrow timers are frozen.', 'en'),
('escrow.dispute_resolved.client', 'in_app', 'Dispute resolved on {{booking_ref}}',
 'We have resolved the issue on booking {{booking_ref}}: {{resolution}}.', 'en'),
('escrow.dispute_resolved.vendor', 'in_app', 'Dispute resolved on {{booking_ref}}',
 'We have resolved the issue on booking {{booking_ref}}: {{resolution}}.', 'en'),
('escrow.dispute_resolved.admin', 'in_app', 'Dispute closed — {{booking_ref}}',
 'Resolution: {{resolution}}. Timers have resumed.', 'en'),

-- ---------- refunds ----------
('escrow.refund_requested.client', 'in_app', 'Refund requested',
 'A refund of {{currency}} {{amount}} has been requested for {{booking_ref}}.', 'en'),
('escrow.refund_requested.vendor', 'in_app', 'Refund requested on {{booking_ref}}',
 'A refund of {{currency}} {{amount}} has been requested for booking {{booking_ref}}.', 'en'),
('escrow.refund_requested.admin', 'in_app', 'Refund awaiting approval — {{booking_ref}}',
 '{{currency}} {{amount}} requested ({{reason}}). Shortfall beyond held funds: {{currency}} {{shortfall}}.', 'en'),
('escrow.refund_approved.client', 'in_app', 'Refund approved',
 'Your refund of {{currency}} {{amount}} for {{booking_ref}} is approved and being sent.', 'en'),
('escrow.refund_settled.client', 'in_app', 'Refund sent',
 'We have sent your refund of {{currency}} {{amount}} for {{booking_ref}} via {{method}}.', 'en'),
('escrow.refund_settled.client', 'email', 'Your refund has been sent — {{booking_ref}}',
 'We have sent your refund of {{currency}} {{amount}} for booking {{booking_ref}}.\n\nMethod: {{method}}\nReference: {{settlement_reference}}\n\nDepending on your provider it may take a few days to appear.', 'en'),
('escrow.refund_settled.vendor', 'in_app', 'Refund settled on {{booking_ref}}',
 'A refund of {{currency}} {{amount}} has been settled for booking {{booking_ref}}.', 'en'),
('escrow.refund_settled.admin', 'in_app', 'Refund settled — {{booking_ref}}',
 '{{currency}} {{amount}} refunded via {{method}}.', 'en'),

-- ---------- finance operations ----------
('finance.reconciliation_alert.admin', 'in_app', 'Reconciliation needs review',
 '{{count}} item(s) did not reconcile. Open the exception queue to review.', 'en'),
('finance.settlement_overdue.admin', 'in_app', 'Payout overdue — {{booking_ref}}',
 '{{currency}} {{amount}} to {{vendor_name}} has been awaiting settlement past the SLA.', 'en')

on conflict (trigger_key, channel, locale) do update
  set subject = excluded.subject,
      body_template = excluded.body_template,
      is_active = true;

-- ---------------------------------------------------------------------
-- Resolve a template for a trigger + audience, falling back to the
-- audience-agnostic key so a missing variant degrades instead of going silent.
-- ---------------------------------------------------------------------
create or replace function public.resolve_notification_template(
  p_trigger  text,
  p_audience text,
  p_channel  notification_channel,
  p_locale   text default 'en')
returns table (subject text, body_template text)
language sql stable security definer set search_path = public as $$
  select t.subject, t.body_template
  from public.notification_templates t
  where t.channel = p_channel
    and t.is_active
    and t.trigger_key in (p_trigger || '.' || p_audience, p_trigger)
    and t.locale in (p_locale, 'en')
  order by
    -- most specific first: exact audience, then exact locale
    (t.trigger_key = p_trigger || '.' || p_audience) desc,
    (t.locale = p_locale) desc
  limit 1;
$$;
grant execute on function public.resolve_notification_template(text, text, notification_channel, text)
  to service_role;
