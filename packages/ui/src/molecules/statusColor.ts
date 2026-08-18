/**
 * Domain status → chip colour. Pure data (no React/MUI), shared by all three
 * portals so a `confirmed` booking never reads teal in one portal and gold in
 * another — which is exactly what had happened while each app carried its own
 * copy of this map.
 *
 * The mapping is secondary-forward: states that are *in flight and healthy*
 * (confirmed, in progress, payout approved) read gold, matching the portals'
 * default action colour. Terminal success stays green, failure red, and states
 * awaiting someone's attention amber — semantic colour is never spent on
 * decoration here.
 *
 * The union is the superset across all portals; keys an app never emits are
 * simply unreachable for it, which is cheaper than three drifting copies.
 */
export type StatusChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const MAP: Record<string, StatusChipColor> = {
  // bookings
  requested: 'info',
  confirmed: 'secondary',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'error',
  declined: 'error',
  // quotations
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  revised: 'warning',
  expired: 'default',
  // Withdrawn by one of the two parties before it was answered. Neutral, not
  // red: `declined` is the client rejecting a price and is a failure of the
  // deal, where a void is either side calling it off — often because the event
  // itself moved. Colouring them alike would tell the vendor they were turned
  // down when they were not.
  voided: 'default',
  // escrow
  initiated: 'default',
  funded: 'info',
  held: 'info',
  // Funded and waiting on the advance date — healthy and in flight.
  awaiting_advance: 'info',
  advance_released: 'secondary',
  release_requested: 'warning',
  admin_review: 'warning',
  payout_approved: 'secondary',
  paid_out: 'success',
  disputed: 'error',
  refunded: 'error',
  partially_refunded: 'warning',
  // payouts / refunds — settlement is manual, so 'recorded' is a real state
  // meaning one admin has evidenced it and a second has yet to sign it off.
  settlement_recorded: 'warning',
  // reconciliation exceptions
  open: 'error',
  investigating: 'warning',
  resolved: 'success',
  ignored: 'default',
  // payments
  failed: 'error',
  pending: 'warning',
  processing: 'info',
  succeeded: 'success',
  // subscriptions
  trialing: 'info',
  active: 'success',
  grace: 'warning',
  suspended: 'error',
  // account lifecycle (profile_status). `active`, `pending` and `suspended`
  // are already mapped above. The two below split what `suspended` used to
  // carry alone: `blocked` is punitive and reads as failure, `deactivated` is
  // simply off — neutral, because colouring a vendor who asked to close their
  // shop the same red as one barred for fraud is the console telling an
  // operator something untrue.
  deactivated: 'default',
  blocked: 'error',
  // listings
  published: 'success',
  hidden: 'default',
  removed: 'error',
  // event lifecycle
  closed: 'warning',
  archived: 'default',
  // vendor application intake
  submitted: 'info',
  reviewing: 'warning',
  approved: 'success',
  rejected: 'error',
  // newsletter campaigns. `draft`, `sent`, `cancelled` and `failed` are already
  // mapped above and mean the same thing here, which is the point of one map.
  scheduled: 'info',
  // In flight and healthy, so gold — the same reading `in_progress` gets.
  sending: 'secondary',
  // marketing consent (`marketing_consent_status`). `pending` is mapped above.
  //
  // `unsubscribed` is neutral, not red. Somebody exercising their Art.7(3)
  // right has done nothing wrong, and a subscriber register that paints every
  // opt-out as a failure state quietly trains whoever reads it to treat
  // consent withdrawal as a problem to be worked around.
  subscribed: 'success',
  unsubscribed: 'default',
  // newsletter delivery (`newsletter_recipient_status`) and suppression.
  queued: 'default',
  delivered: 'success',
  opened: 'secondary',
  clicked: 'secondary',
  skipped: 'default',
  // Both are facts about the mailbox that stop us mailing it, and both are
  // genuinely bad news for the sending domain.
  bounced: 'error',
  complained: 'error',
  suppressed: 'error',
  // post-event settlement (`settlement_request_status`). `cancelled` is mapped
  // above and means the same thing here.
  //
  // The three in-flight states are amber rather than gold: each one is a
  // request sitting on somebody's desk with a vendor's money behind it, which
  // is "awaiting attention", not "healthy and progressing". `consented` turns
  // gold because the argument is over and only the payment is left.
  vendor_requested: 'warning',
  admin_forwarded: 'warning',
  awaiting_vendor_consent: 'warning',
  consented: 'secondary',
  released: 'success',
  contested: 'error',
};

export function statusColor(status: string): StatusChipColor {
  return MAP[status] ?? 'default';
}

/** `in_progress` → `In Progress`. Shared so status labels read alike everywhere. */
export function titleizeStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
