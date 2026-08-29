import { Box, Typography } from '@sinnapi/ui';
import { formatIsoDateLong } from '@sinnapi/ui';

/**
 * What hovering or focusing a closed day says.
 *
 * A tint tells you a day is gone; it does not tell you *which* day, and on a
 * grid of small squares that is a real question — misreading the row is how
 * somebody ends up requesting the wrong date. Naming the day in full removes
 * the guess, and `enterTouchDelay: 0` in the design system means a tap gets the
 * same answer a hover does.
 */
export default function AvailabilityDayTooltip({ date }: { date: string }) {
  return (
    <Box sx={{ py: 0.25 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
        Unavailable
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', opacity: 0.85 }}>
        {formatIsoDateLong(date)}
      </Typography>
    </Box>
  );
}
