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
};

export function statusColor(status: string): ChipColor {
  return MAP[status] ?? 'default';
}
