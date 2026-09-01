import { Chip } from '@sinnapi/ui';
import { DISCOUNT_STATUS_META, type DiscountStatus } from '../../schema';

/**
 * Where a code is in its life.
 *
 * Filled while the code is doing something — redeemable, waiting to be, or
 * sold out — and outlined once it is over, so a grid reads as "what is working
 * for me right now" without the vendor parsing a word per card.
 *
 * The sibling of `PromotionStatusChip`, deliberately: the two screens describe
 * the same four moments in the same colours, and a vendor moving between them
 * should not have to relearn what amber means.
 */
export default function DiscountStatusChip({ status }: { status: DiscountStatus }) {
  const { label, color } = DISCOUNT_STATUS_META[status];
  return (
    <Chip
      size="small"
      color={color}
      variant={status === 'ended' ? 'outlined' : 'filled'}
      label={label}
    />
  );
}
