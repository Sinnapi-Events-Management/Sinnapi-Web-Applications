type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

const MAP: Record<string, ChipColor> = {
  requested: 'info',
  confirmed: 'primary',
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
  payout_approved: 'primary',
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
