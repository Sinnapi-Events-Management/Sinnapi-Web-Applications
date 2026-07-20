type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

const MAP: Record<string, ChipColor> = {
  requested: 'info',
  confirmed: 'secondary',
  in_progress: 'secondary',
  completed: 'success',
  cancelled: 'error',
  declined: 'error',
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  revised: 'warning',
  expired: 'default',
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
  failed: 'error',
  pending: 'warning',
  processing: 'info',
  succeeded: 'success',
  trialing: 'info',
  active: 'success',
  grace: 'warning',
  suspended: 'error',
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

export function statusColor(status: string): ChipColor {
  return MAP[status] ?? 'default';
}

/**
 * The `profile_status` enum, in lifecycle order. Authoritative source for the
 * Users list' status tabs and their counts. `active` accounts can sign in,
 * `suspended` are blocked (login banned), `pending` are provisioned but not yet
 * activated.
 */
export const PROFILE_STATUSES = ['active', 'suspended', 'pending'] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/**
 * The vendor application intake lifecycle, in workflow order. This is the
 * authoritative list of `vendor_application_intake.status` values — the review
 * queue's tabs and status counts are both derived from it.
 */
export const INTAKE_STATUSES = ['submitted', 'reviewing', 'approved', 'rejected'] as const;

export type IntakeStatus = (typeof INTAKE_STATUSES)[number];

/**
 * The `vendor_status` enum, in lifecycle order. Authoritative source for the
 * Vendors list' status tabs and their counts. `active` vendors are live,
 * `suspended` are temporarily disabled, `hidden` are delisted.
 */
export const VENDOR_STATUSES = ['active', 'suspended', 'hidden'] as const;

export type VendorAdminStatus = (typeof VENDOR_STATUSES)[number];

/** The `vendor_visibility` enum — whether a listing is publicly discoverable. */
export const VENDOR_VISIBILITIES = ['public', 'hidden'] as const;

export type VendorVisibility = (typeof VENDOR_VISIBILITIES)[number];

/**
 * The `event_status` enum, in lifecycle order. Authoritative source for the
 * Events list' status tabs and their counts. `draft` events are unpublished,
 * `published` are live, `closed` are no longer accepting interest, `archived`
 * are retired.
 */
export const EVENT_STATUSES = ['draft', 'published', 'closed', 'archived'] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/** The `event_source` enum — who authored the event. */
export const EVENT_SOURCES = ['admin', 'client'] as const;

export type EventSource = (typeof EVENT_SOURCES)[number];

/**
 * The `subscription_status` enum, in lifecycle order. Authoritative source for
 * the Subscriptions list' status tabs and their counts. `trialing` is inside the
 * free trial, `active` is paid and current, `past_due` has a failed renewal,
 * `grace` is in the post-expiry grace window, `suspended` is disabled for
 * non-payment, `expired` has lapsed, `cancelled` was ended by the vendor.
 */
export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'grace',
  'suspended',
  'expired',
  'cancelled',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
