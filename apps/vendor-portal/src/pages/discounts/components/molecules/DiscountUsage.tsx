import { Box, LinearProgress, Stack, Typography } from '@sinnapi/ui';
import { discountUsage, type DiscountRow } from '../../schema';

/** Amber once a code is nearly spent, so the last few are visible as few. */
const NEARLY_SPENT = 80;

/**
 * How much of a code has been redeemed — the only outcome on the card.
 *
 * A capped code gets the bar, because a cap makes redemptions a fraction and a
 * fraction is what tells a vendor whether to raise it. The bar turns amber past
 * four fifths and stays amber when full: "41 of 50" and "50 of 50" are the same
 * green at a glance, and the second one is the one that needs a decision today.
 *
 * An uncapped code gets the count and no bar. There is no denominator, so a
 * full bar would claim a limit it does not have and an empty one would claim
 * it has gone unused — both are inventions, and the number is the whole truth.
 *
 * The remaining figure is spelled out rather than left to be subtracted. A
 * vendor deciding whether to extend an offer is asking "how many are left",
 * and making them do arithmetic across a dozen cards is how that question
 * stops being asked.
 */
export default function DiscountUsage({ discount }: { discount: DiscountRow }) {
  const usage = discountUsage(discount);

  if (!usage) {
    return (
      <Typography variant="body2" color="text.secondary">
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {discount.used_count}
        </Box>{' '}
        {discount.used_count === 1 ? 'redemption' : 'redemptions'} · no limit
      </Typography>
    );
  }

  const tight = usage.percent >= NEARLY_SPENT;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {usage.used}
          </Box>{' '}
          of {usage.max} redeemed
        </Typography>
        <Typography
          variant="caption"
          sx={{ flexShrink: 0, fontWeight: 600, color: tight ? 'warning.main' : 'text.secondary' }}
        >
          {usage.remaining === 0 ? 'None left' : `${usage.remaining} left`}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={usage.percent}
        color={tight ? 'warning' : 'success'}
        aria-label={`${usage.used} of ${usage.max} redemptions used`}
        sx={{
          mt: 0.75,
          height: 6,
          borderRadius: 3,
          // Tinted from the foreground rather than a fixed grey, so the
          // unfilled half stays visible on the warm dark canvas.
          bgcolor: 'action.hover',
        }}
      />
    </Box>
  );
}
