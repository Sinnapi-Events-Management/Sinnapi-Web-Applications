import type { DeletionRequestStatus } from '../types';

/** The word the user must type to arm the deletion request. */
export const DELETION_CONFIRM_PHRASE = 'DELETE';

export const DELETION_REASON_MAX = 500;

/**
 * How each erasure status reads to the person who asked for it, and which
 * palette carries it.
 *
 * The database's vocabulary is written for the compliance operator working the
 * queue; this is the same state told to the subject. `partially_fulfilled` is
 * the one worth spelling out — it means records under a legal or financial hold
 * survived the erasure, and a user who is not told that will reasonably assume
 * everything is gone.
 */
export const DELETION_STATUS_COPY: Record<
  DeletionRequestStatus,
  { label: string; detail: string; accent: 'info' | 'warning' | 'success' | 'error' }
> = {
  requested: {
    label: 'Deletion requested',
    detail: 'We have your request and will begin reviewing it shortly.',
    accent: 'info',
  },
  reviewing: {
    label: 'Under review',
    detail: 'Our compliance team is checking which records can be erased.',
    accent: 'info',
  },
  approved: {
    label: 'Approved',
    detail: 'Your request was approved and erasure is being carried out.',
    accent: 'warning',
  },
  partially_fulfilled: {
    label: 'Partially completed',
    detail:
      'Most of your data has been erased. Some records are held under legal or financial retention rules and cannot be removed yet.',
    accent: 'warning',
  },
  rejected: {
    label: 'Not approved',
    detail: 'We could not action this request. Contact support if you would like to discuss it.',
    accent: 'error',
  },
  completed: {
    label: 'Completed',
    detail: 'Your erasure request has been fulfilled.',
    accent: 'success',
  },
};

/**
 * Statuses that still have somewhere to go. While one is in flight the page
 * shows its state instead of the request button — a second identical request
 * gives the user nothing and gives the compliance queue a duplicate to close.
 */
const OPEN_STATUSES: DeletionRequestStatus[] = [
  'requested',
  'reviewing',
  'approved',
  'partially_fulfilled',
];

export function isDeletionRequestOpen(status: DeletionRequestStatus): boolean {
  return OPEN_STATUSES.includes(status);
}
