import { Box, Rating, Skeleton, Stack, Typography } from '@sinnapi/ui';

type Props = {
  avgRating: number;
  reviewCount: number;
  loading?: boolean;
};

/**
 * The score clients actually see on the public profile, shown at display size
 * with its star row underneath. Read beside the rating distribution it answers
 * "is this average carried by a few reviews or by many?".
 */
export default function RatingSummary({ avgRating, reviewCount, loading }: Props) {
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Skeleton variant="text" width="45%" height={64} sx={{ mx: 'auto' }} />
        <Skeleton variant="text" width="70%" sx={{ mx: 'auto' }} />
      </Box>
    );
  }

  return (
    <Stack alignItems="center" spacing={0.75} sx={{ py: 1 }}>
      <Typography variant="h1" sx={{ fontSize: { xs: '2.75rem', sm: '3.25rem' }, lineHeight: 1 }}>
        {avgRating > 0 ? avgRating.toFixed(1) : '—'}
      </Typography>
      <Rating value={avgRating} precision={0.1} readOnly size="small" />
      <Typography variant="body2" color="text.secondary">
        {reviewCount === 0
          ? 'No published reviews yet'
          : `${reviewCount.toLocaleString()} published ${reviewCount === 1 ? 'review' : 'reviews'}`}
      </Typography>
    </Stack>
  );
}
