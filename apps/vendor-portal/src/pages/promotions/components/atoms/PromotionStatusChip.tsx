import { Chip } from '@sinnapi/ui';
import { PROMOTION_STATUS_META, type PromotionStatus } from '../../schema';

/**
 * Where a campaign is in its life.
 *
 * Filled when the campaign is doing something — running, or waiting to run —
 * and outlined once it is over, so a grid reads as "what is working for me
 * right now" without the vendor parsing a word per card. Paused is `warning`
 * rather than `default` because it is the one state that is nobody's plan: a
 * campaign inside its window that clients cannot see is a mistake more often
 * than it is a decision.
 */
export default function PromotionStatusChip({ status }: { status: PromotionStatus }) {
  const { label, color } = PROMOTION_STATUS_META[status];
  return (
    <Chip
      size="small"
      color={color}
      variant={status === 'ended' ? 'outlined' : 'filled'}
      label={label}
    />
  );
}
