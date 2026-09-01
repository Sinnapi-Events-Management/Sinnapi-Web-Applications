import { Paper, Rating, Stack, Typography } from '@sinnapi/ui';
import type { VendorDetailModel } from '@/lib/types';

/**
 * The aggregate score, as a figure a visitor can weigh rather than a lone star
 * row: the number, the stars, and how many bookings it was averaged over.
 *
 * The count matters as much as the score — 4.9 from three clients and 4.9 from
 * ninety are different claims, and a rating shown without its denominator lets
 * the reader assume the flattering one.
 */
export default function VendorRatingSummary({ vendor }: { vendor: VendorDetailModel }) {
  const rating = Number(vendor.avg_rating);
  const count = vendor.review_count;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 3 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h3" sx={{ lineHeight: 1 }}>
            {count > 0 ? rating.toFixed(1) : '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            / 5
          </Typography>
        </Stack>

        <Stack spacing={0.5}>
          <Rating value={rating} precision={0.5} size="small" readOnly />
          <Typography variant="body2" color="text.secondary">
            {count > 0
              ? `Averaged over ${count} completed ${count === 1 ? 'booking' : 'bookings'}`
              : 'No completed bookings rated yet'}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
