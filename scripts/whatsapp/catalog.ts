// The WhatsApp message for every notification that sends an email today.
//
// THIS FILE IS THE SOURCE OF TRUTH. `scripts/whatsapp/templates.ts` reads it to
// check the copy against Meta's rules, write the seed migration, and submit
// every template to Meta. Edit the wording here, never in the database or in
// WhatsApp Manager, or the three drift apart.
//
// HOW A MESSAGE IS BUILT
//   Hi {{recipient_first_name}},
//
//   *<title>*
//   <text>
//
//   Open it here: {{link}}
//   Thank you for using Sinnapi.
//   ───
//   Reply STOP to turn off WhatsApp updates      (footer)
//
// Blanks are written by NAME ({{client_name}}) for readability; the script turns
// them into Meta's numbered blanks ({{1}}, {{2}}, …) and records which name fills
// which number in `notification_templates.params`.
//
// RULES (enforced by `templates.ts check`)
//   * Every blank needs a sample in SAMPLES — Meta reviews the filled example.
//   * Each blank appears at most once per message.
//   * Two blanks may not touch (only spaces/punctuation between them): Meta
//     rejects that. Money is therefore one blank, `{{total_money}}` = "UGX 226,600",
//     produced by the dispatcher for every amount key.
//   * Strictly transactional wording. Anything that reads as promotion ("leave a
//     review!", "discover more vendors") gets the template re-categorised as
//     MARKETING by Meta, which costs more and needs separate opt-in.
//
// Keys available: everything in the event payload after the dispatcher's
// `enrich`, plus `recipient_first_name`, `recipient_name` and `link`.

export interface WhatsAppTemplateSpec {
  /** notification trigger + audience, exactly as the email template's key. */
  trigger: string;
  /** Bold first line. Plain text, no blanks. */
  title: string;
  /** The message. May use blanks. */
  text: string;
}

export const FOOTER = 'Reply STOP to turn off WhatsApp updates';

/** Wrap a spec into the full body, with named blanks. */
export function fullBody(spec: WhatsAppTemplateSpec): string {
  return [
    'Hi {{recipient_first_name}},',
    '',
    `*${spec.title}*`,
    spec.text,
    '',
    'Open it here: {{link}}',
    'Thank you for using Sinnapi.',
  ].join('\n');
}

/** Meta template name: the trigger with dots as underscores. */
export function templateName(trigger: string): string {
  return trigger.replace(/\./g, '_');
}

/** Example values Meta's reviewers see, one per blank name. */
export const SAMPLES: Record<string, string> = {
  recipient_first_name: 'Sarah',
  link: 'https://app.sinnapi.com/bookings/7f3c2a',
  client_name: 'Sarah Namuli',
  vendor_name: 'Kampala Sound & Light',
  sender_name: 'Kampala Sound & Light',
  sender_kind_label: 'Vendor',
  booking_ref: 'BK-24817',
  quote_ref: 'QT-10352',
  event_date: '14 December 2026',
  valid_until: '20 November 2026',
  payment_due_at: '10 November, 18:00',
  client_due_at: '12 November, 14:00',
  advance_release_due_at: '15 November 2026',
  hours_left: '6',
  days_left: '7',
  period_start: '1 November 2026',
  period_end: '1 December 2026',
  grace_until: '4 December, 23:59',
  plan_name: 'Professional',
  method: 'MTN Mobile Money',
  settlement_reference: 'STL-55021',
  reason: 'The date is no longer available',
  decision_reason: 'Two of the agreed items were not delivered',
  note: 'Please complete payment so the date stays held',
  rating: '5',
  review_title: 'Great sound and lighting',
  total_money: 'UGX 2,450,000',
  amount_money: 'UGX 2,450,000',
  gross_amount_money: 'UGX 2,560,000',
  agreed_amount_money: 'UGX 2,450,000',
  advance_amount_money: 'UGX 735,000',
  balance_amount_money: 'UGX 1,715,000',
  requested_amount_money: 'UGX 1,715,000',
  approved_amount_money: 'UGX 1,500,000',
  final_amount_money: 'UGX 1,500,000',
  withheld_amount_money: 'UGX 215,000',
};

export const TEMPLATES: WhatsAppTemplateSpec[] = [
  // ── Quotations ──────────────────────────────────────────────────────────
  {
    trigger: 'quotation.requested.vendor',
    title: 'New quote request',
    text: '{{client_name}} has asked you for a price. Reference: {{quote_ref}}.',
  },
  {
    trigger: 'quotation.sent.client',
    title: 'You have a new quote',
    text: '{{vendor_name}} has sent you a quote of {{total_money}}, valid until {{valid_until}}. Reference: {{quote_ref}}. You can accept it, ask for a revision or decline it.',
  },
  {
    trigger: 'quotation.revision_requested.vendor',
    title: 'Revision requested',
    text: '{{client_name}} has asked you to revise quote {{quote_ref}}, currently {{total_money}}. What they said: {{reason}}.',
  },
  {
    trigger: 'quotation.accepted.vendor',
    title: 'Quote accepted',
    text: '{{client_name}} has accepted your quote {{quote_ref}} for {{total_money}}. They will now pick a date, which reaches you as a booking request.',
  },
  {
    trigger: 'quotation.declined.vendor',
    title: 'Quote declined',
    text: '{{client_name}} has declined your quote {{quote_ref}} of {{total_money}}. What they said: {{reason}}.',
  },
  {
    trigger: 'quotation.voided.client',
    title: 'Quote withdrawn',
    text: '{{vendor_name}} has withdrawn quote {{quote_ref}}. Reason: {{reason}}. Nothing is owed and nothing is booked.',
  },
  {
    trigger: 'quotation.voided.vendor',
    title: 'Quote request withdrawn',
    text: '{{client_name}} has withdrawn quote request {{quote_ref}}. Reason: {{reason}}. No action is needed from you.',
  },
  {
    trigger: 'quotation.expired.client',
    title: 'Quote expired',
    text: 'The quote {{quote_ref}} from {{vendor_name}} for {{total_money}} expired on {{valid_until}}. If your event is still on, you can ask them for a current price.',
  },
  {
    trigger: 'quotation.expired.vendor',
    title: 'Your quote expired',
    text: 'Your quote {{quote_ref}} to {{client_name}} for {{total_money}} expired on {{valid_until}} without an answer.',
  },

  // ── Bookings ────────────────────────────────────────────────────────────
  {
    trigger: 'booking.terms_proposed.vendor',
    title: 'New booking request',
    text: '{{client_name}} has asked to book you on {{event_date}} for {{amount_money}}. Please confirm the date and the payment terms. A date you have not confirmed is not held.',
  },
  {
    trigger: 'booking.from_quotation.vendor',
    title: 'Your quote has been booked',
    text: '{{client_name}} accepted your quote and picked {{event_date}}, for {{amount_money}}. Please confirm the booking to hold the date.',
  },
  {
    trigger: 'booking.terms_countered.client',
    title: 'Different payment terms proposed',
    text: '{{vendor_name}} has proposed different payment terms for your booking on {{event_date}}. What they said: {{reason}}. Please accept or decline them.',
  },
  {
    trigger: 'booking.confirmed.client',
    title: 'Booking confirmed',
    text: '{{vendor_name}} has confirmed your booking {{booking_ref}} on {{event_date}} for {{amount_money}}.',
  },
  {
    trigger: 'booking.confirmed.vendor',
    title: 'Booking confirmed',
    text: 'Your booking {{booking_ref}} with {{client_name}} on {{event_date}} for {{amount_money}} is confirmed. The date is held.',
  },
  {
    trigger: 'booking.declined.client',
    title: 'Booking request declined',
    text: '{{vendor_name}} has declined your booking request for {{event_date}}. What they said: {{reason}}. Nothing has been charged.',
  },
  {
    trigger: 'booking.declined.vendor',
    title: 'Booking declined',
    text: 'The booking request from {{client_name}} for {{event_date}} has been declined. Reason: {{reason}}. The date is free again on your calendar.',
  },
  {
    trigger: 'booking.completed.client',
    title: 'Booking complete',
    text: '{{vendor_name}} has marked booking {{booking_ref}} on {{event_date}} as complete. If you paid through Sinnapi escrow, please confirm the service, or raise an issue if something was not right.',
  },
  {
    trigger: 'booking.completed.vendor',
    title: 'Booking complete',
    text: 'Booking {{booking_ref}} with {{client_name}} on {{event_date}} is marked complete. On an escrow booking, the balance is released once the client confirms the service.',
  },
  {
    trigger: 'booking.cancelled.client',
    title: 'Booking cancelled',
    text: 'Your booking {{booking_ref}} with {{vendor_name}} for {{event_date}} has been cancelled. Reason: {{reason}}.',
  },
  {
    trigger: 'booking.cancelled.vendor',
    title: 'Booking cancelled',
    text: 'The booking {{booking_ref}} with {{client_name}} for {{event_date}} has been cancelled. Reason: {{reason}}. The date is free again on your calendar.',
  },

  // ── Booking payment window ──────────────────────────────────────────────
  {
    trigger: 'booking.payment_due.client',
    title: 'Payment due',
    text: '{{vendor_name}} has confirmed booking {{booking_ref}} for {{event_date}}. Your date is held until {{payment_due_at}}. Pay {{agreed_amount_money}} plus fees through Sinnapi escrow to secure it.',
  },
  {
    trigger: 'booking.payment_reminder.client',
    title: 'Payment reminder',
    text: 'Booking {{booking_ref}} with {{vendor_name}} on {{event_date}} is still unpaid. Payment is due by {{payment_due_at}}, about {{hours_left}} hours from now.',
  },
  {
    trigger: 'booking.payment_nudge.client',
    title: 'Payment reminder',
    text: 'Booking {{booking_ref}} with {{vendor_name}} on {{event_date}} is still awaiting payment, due by {{payment_due_at}}. Message from the vendor: {{note}}.',
  },
  {
    trigger: 'booking.payment_extended.client',
    title: 'Payment deadline extended',
    text: 'The payment deadline for booking {{booking_ref}} with {{vendor_name}} is now {{payment_due_at}}. Reason: {{note}}. The booking is still held for you.',
  },
  {
    trigger: 'booking.payment_overdue.client',
    title: 'Payment overdue',
    text: 'The payment deadline for booking {{booking_ref}} with {{vendor_name}} passed on {{payment_due_at}}. You can still pay from your booking, but it may now be cancelled and your date of {{event_date}} released.',
  },
  {
    trigger: 'booking.payment_overdue.vendor',
    title: 'Booking not paid in time',
    text: '{{client_name}} has not paid for booking {{booking_ref}} on {{event_date}}, and the deadline of {{payment_due_at}} has passed. Nothing has been cancelled: you can cancel the booking or give the client more time.',
  },
  {
    trigger: 'booking.payment_cancelled.client',
    title: 'Booking cancelled',
    text: 'Booking {{booking_ref}} with {{vendor_name}} on {{event_date}} was cancelled because payment was not received by {{payment_due_at}}. Nothing was charged to you.',
  },

  // ── Escrow payments ─────────────────────────────────────────────────────
  {
    trigger: 'escrow.awaiting_payment.client',
    title: 'Complete your payment',
    text: 'Your booking {{booking_ref}} with {{vendor_name}} is confirmed and waiting for payment. Total to pay: {{gross_amount_money}}. Sinnapi holds the money and releases it to the vendor only as you agreed.',
  },
  {
    trigger: 'escrow.funded.client',
    title: 'Payment received',
    text: 'We have received {{gross_amount_money}} for booking {{booking_ref}}. The advance of {{advance_amount_money}} goes to the vendor on {{advance_release_due_at}}, and the balance of {{balance_amount_money}} only after you confirm the service.',
  },
  {
    trigger: 'escrow.funded.vendor',
    title: 'Booking paid',
    text: '{{client_name}} has paid for booking {{booking_ref}} through Sinnapi escrow. Advance: {{advance_amount_money}}, due on {{advance_release_due_at}}. Balance: {{balance_amount_money}}, after the client confirms the service.',
  },
  {
    trigger: 'escrow.payment_failed.client',
    title: 'Payment failed',
    text: 'Your payment for booking {{booking_ref}} did not go through. Reason: {{reason}}. No money has left your account, and you can try again from your booking.',
  },
  {
    trigger: 'escrow.advance_scheduled.vendor',
    title: 'Advance scheduled',
    text: 'Your advance of {{advance_amount_money}} for booking {{booking_ref}} is scheduled for payout. We will send you the reference once it has been sent.',
  },
  {
    trigger: 'escrow.advance_settled.vendor',
    title: 'Advance sent',
    text: 'We have sent your advance of {{advance_amount_money}} for booking {{booking_ref}} by {{method}}. Reference: {{settlement_reference}}.',
  },
  {
    trigger: 'escrow.release_reminder.client',
    title: 'Please confirm your booking',
    text: 'Your event has passed and {{balance_amount_money}} is still held for booking {{booking_ref}}. Please confirm the service so we can pay {{vendor_name}}, or raise an issue if something went wrong.',
  },
  {
    trigger: 'escrow.balance_settled.vendor',
    title: 'Final payment sent',
    text: 'Your final payment of {{amount_money}} for booking {{booking_ref}} has been sent by {{method}}. Reference: {{settlement_reference}}.',
  },
  {
    trigger: 'escrow.balance_settled.client',
    title: 'Booking settled',
    text: 'Everything is settled for booking {{booking_ref}}. You paid {{gross_amount_money}} and {{vendor_name}} received {{agreed_amount_money}}.',
  },
  {
    trigger: 'escrow.refund_settled.client',
    title: 'Refund sent',
    text: 'We have sent your refund of {{amount_money}} for booking {{booking_ref}} by {{method}}. Reference: {{settlement_reference}}. It may take a few days to appear.',
  },

  // ── Settlements ─────────────────────────────────────────────────────────
  {
    trigger: 'settlement.requested.admin',
    title: 'Settlement request waiting',
    text: '{{vendor_name}} has requested {{requested_amount_money}} on booking {{booking_ref}}. Please review it and forward it to {{client_name}} for approval.',
  },
  {
    trigger: 'settlement.forwarded.client',
    title: 'Please approve a payment',
    text: '{{vendor_name}} has asked to be paid {{requested_amount_money}} for booking {{booking_ref}}. You can approve it in full or offer a smaller amount with a reason. Nothing is paid until you answer.',
  },
  {
    trigger: 'settlement.approved_full.vendor',
    title: 'Payout approved in full',
    text: '{{client_name}} has approved your payout request on booking {{booking_ref}} in full: {{approved_amount_money}}. Our finance team will now release it.',
  },
  {
    trigger: 'settlement.reduced.vendor',
    title: 'Reduced amount offered',
    text: '{{client_name}} has offered {{approved_amount_money}} instead of the {{requested_amount_money}} you asked for on booking {{booking_ref}}. Their reason: {{decision_reason}}. Please accept or contest it.',
  },
  {
    trigger: 'settlement.vendor_contested.client',
    title: 'Vendor contested your amount',
    text: '{{vendor_name}} has not accepted the {{approved_amount_money}} you offered on booking {{booking_ref}}. Their reason: {{note}}. Nothing has been paid, and our team is reviewing it.',
  },
  {
    trigger: 'settlement.released.vendor',
    title: 'Payout approved',
    text: 'The agreed payout of {{final_amount_money}} for booking {{booking_ref}} has been approved. Our finance team will transfer it and send you the reference.',
  },
  {
    trigger: 'settlement.released.client',
    title: 'Settlement complete',
    text: 'The settlement on booking {{booking_ref}} is done. {{vendor_name}} has been paid {{final_amount_money}}, and {{withheld_amount_money}} is returning to you.',
  },
  {
    trigger: 'settlement.client_timeout.client',
    title: 'Sent to our team for review',
    text: 'We did not hear back about the payment for booking {{booking_ref}} by {{client_due_at}}, so it has gone to our finance team for review. If something went wrong with this event, please contact us now.',
  },

  // ── Subscriptions (vendors) ─────────────────────────────────────────────
  {
    trigger: 'subscription.activated.vendor',
    title: 'Plan active',
    text: 'Your {{plan_name}} plan is active from {{period_start}} to {{period_end}}. We received {{amount_money}}, and your listing is live.',
  },
  {
    trigger: 'subscription.payment_failed.vendor',
    title: 'Subscription payment failed',
    text: 'Your payment for the {{plan_name}} plan did not go through. Reason: {{reason}}. No money was taken and your current plan is unchanged.',
  },
  {
    trigger: 'subscription.renewal_due.vendor',
    title: 'Plan ending soon',
    text: 'Your {{plan_name}} plan ends on {{period_end}}, in {{days_left}} days. Renewal costs {{amount_money}}. We never charge automatically.',
  },
  {
    trigger: 'subscription.trial_ending.vendor',
    title: 'Free trial ending',
    text: 'Your free trial ends on {{period_end}}, in {{days_left}} days. Choose a plan to keep your listing live.',
  },
  {
    trigger: 'subscription.grace_entered.vendor',
    title: 'Subscription ended',
    text: 'Your subscription period has ended. Pay for a plan before {{grace_until}} to keep your listing visible. Existing bookings are not affected.',
  },
  {
    trigger: 'subscription.expired.vendor',
    title: 'Listing hidden',
    text: 'Your subscription has expired and your listing is hidden from search. Existing bookings and conversations continue as normal. Pay for a plan to be listed again.',
  },
  {
    trigger: 'subscription.hide_blocked.admin',
    title: 'Subscription needs review',
    text: 'The subscription of {{vendor_name}} expired without any renewal reminder being sent, so their listing was not hidden. Please review it.',
  },

  // ── Reviews ─────────────────────────────────────────────────────────────
  {
    trigger: 'review.received.vendor',
    title: 'New review',
    text: '{{client_name}} has rated booking {{booking_ref}} with {{rating}} out of 5, titled "{{review_title}}". The review is on your public profile and you can reply to it.',
  },
  {
    trigger: 'review.replied.client',
    title: 'The vendor replied to your review',
    text: '{{vendor_name}} has replied to your review for booking {{booking_ref}}. Your review can no longer be edited.',
  },

  // ── Messages ────────────────────────────────────────────────────────────
  {
    trigger: 'message.received',
    title: 'New message',
    text: '{{sender_name}} has sent you a new message on Sinnapi.',
  },
  {
    trigger: 'message.support_received.admin',
    title: 'New support request',
    text: '{{sender_name}}, a {{sender_kind_label}} account, has written to Sinnapi support.',
  },
  {
    trigger: 'message.support_ack',
    title: 'We have your message',
    text: 'Thank you for contacting Sinnapi support. We will reply in your support thread as soon as we can.',
  },
];
