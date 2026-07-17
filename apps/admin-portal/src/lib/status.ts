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
