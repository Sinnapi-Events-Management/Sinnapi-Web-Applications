import { Rating, Stack, Typography } from '@sinnapi/ui';

type Props = {
  average: number;
  publishedCount: number;
};

/**
 * The number a client sees on the public profile, at display size.
 *
 * Shown to one decimal because that decimal is the whole signal: 4.6 and 4.4
 * sit either side of how a marketplace rounds a badge, and a rounded "5" would
 * flatter a vendor into ignoring the reviews that are dragging them down.
 *
 * The star row underneath is a `precision={0.1}` read-only mirror of the same
 * figure, so the vendor recognises it as what clients are looking at rather
 * than as an internal statistic.
 */
export default function ReviewScore({ average, publishedCount }: Props) {
  const hasScore = publishedCount > 0;

  return (
    <Stack alignItems="center" spacing={0.75} sx={{ py: { xs: 1, md: 2 } }}>
      <Typography
        variant="h1"
        sx={{ fontSize: { xs: '3rem', sm: '3.5rem' }, lineHeight: 1, fontWeight: 700 }}
      >
        {hasScore ? average.toFixed(1) : '—'}
      </Typography>

      <Rating value={average} precision={0.1} readOnly size="small" />

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {hasScore
          ? `from ${publishedCount.toLocaleString()} published ${publishedCount === 1 ? 'review' : 'reviews'}`
          : 'No published reviews yet'}
      </Typography>
    </Stack>
  );
}
