'use client';
import { Chip, Tooltip } from '@mui/material';
import type { OfferLifecycle } from '../types';
import { OFFER_LIFECYCLE_COLORS, OFFER_LIFECYCLE_LABELS } from '../schema/offerCopy';

export type OfferLifecycleChipProps = {
  status: OfferLifecycle;
  /** Shown on hover for `suspended` — the operator's stated reason. */
  reason?: string | null;
  size?: 'small' | 'medium';
};

/**
 * The state of an offer, in the vendor's list and the console's table.
 *
 * One component for both audiences on purpose. A vendor reading "Withdrawn" and
 * an operator reading "Suspended" for the same row is how a support call starts
 * with two people describing different problems.
 *
 * The reason rides in the tooltip rather than the label: it is a sentence, and
 * a chip that grows to fit one breaks every table it sits in.
 */
export function OfferLifecycleChip({ status, reason, size = 'small' }: OfferLifecycleChipProps) {
  const chip = (
    <Chip
      size={size}
      variant={status === 'live' ? 'filled' : 'outlined'}
      color={OFFER_LIFECYCLE_COLORS[status]}
      label={OFFER_LIFECYCLE_LABELS[status]}
      sx={{ fontWeight: 600 }}
    />
  );

  if (!reason) return chip;
  return <Tooltip title={reason}>{chip}</Tooltip>;
}
