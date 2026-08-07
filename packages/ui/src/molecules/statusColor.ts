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
  // escrow
  initiated: 'default',
  funded: 'info',
  held: 'info',
  release_requested: 'warning',
  admin_review: 'warning',
  payout_approved: 'secondary',
  paid_out: 'success',
  disputed: 'error',
  refunded: 'error',
  partially_refunded: 'warning',
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
};

export function statusColor(status: string): StatusChipColor {
  return MAP[status] ?? 'default';
}

/** `in_progress` → `In Progress`. Shared so status labels read alike everywhere. */
export function titleizeStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
