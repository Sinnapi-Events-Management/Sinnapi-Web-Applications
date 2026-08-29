import { Typography } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { DiscountRow } from '../../schema';

/**
 * What the code takes off, as the headline of the card.
 *
 * Rendered against its own type, because a percentage and a fixed amount are
 * different units and "10" would be ambiguous between a tenth off and ten
 * shillings off. The word "off" is carried rather than left implied: `15%` on
 * its own is a figure, `15% off` is an offer, and this is the line a vendor
 * scans a grid of codes by.
 *
 * The number and the unit are one string in one element rather than two sized
 * spans — a wrapped "off" under a lone "15%" is worse than a slightly smaller
 * figure, and cards in a row must agree on their baseline.
 */
export default function DiscountValue({ discount }: { discount: DiscountRow }) {
  const amount =
    discount.type === 'percentage'
      ? `${discount.value}%`
      : formatMoney(discount.value, discount.currency);

  return (
    <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
      {amount}{' '}
      <Typography component="span" variant="body2" color="text.secondary">
        off
      </Typography>
    </Typography>
  );
}
