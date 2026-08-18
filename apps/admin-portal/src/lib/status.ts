// The status → chip-colour map is shared by all three portals and lives in
// @sinnapi/ui (see `statusColor`), so a `confirmed` booking cannot read teal in
// one portal and gold in another. Re-exported here so admin's existing
// `@/lib/status` call sites keep working. The enums below are admin-only.
export { statusColor, type StatusChipColor } from '@sinnapi/ui';

/**
 * The `profile_status` enum, in lifecycle order. Authoritative source for the
 * Users list' status tabs and their counts. `active` accounts can sign in,
 * `suspended` are blocked (login banned), `pending` are provisioned but not yet
 * activated.
 */
export const PROFILE_STATUSES = ['active', 'suspended', 'pending'] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

/**
 * The full `profile_status` enum after 0810a, in lifecycle order. Authoritative
 * source for the vendor accounts list' status tabs and their counts.
 *
 * Kept separate from `PROFILE_STATUSES` rather than replacing it: that constant
 * is the set of states the Users and Clients pages can produce, and it is also
 * what `create-staff` validates a new account's status against. Widening it
 * would give both of those pages two tabs they can never fill and would let a
 * staff account be provisioned straight into `blocked`.
 *
 * `deactivated` is off-by-request and reversible in one click; `blocked` is
 * punitive and indefinite; `suspended` always carries an end date and lifts
 * itself. See the 0810a migration header for why the distinction is stored
 * rather than left to a reason string.
 */
export const VENDOR_ACCOUNT_STATUSES = [
  'active',
  'pending',
  'suspended',
  'deactivated',
  'blocked',
] as const;

export type VendorAccountStatus = (typeof VENDOR_ACCOUNT_STATUSES)[number];

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
