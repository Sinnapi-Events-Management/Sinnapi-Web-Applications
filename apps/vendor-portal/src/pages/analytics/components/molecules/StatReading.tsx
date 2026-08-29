import { Box, Skeleton, Stack, Typography } from '@sinnapi/ui';

type Props = {
  /** The figure, already formatted — "4h", "6 weeks ahead", "38%". */
  value: string;
  /** What it measures, above the figure. */
  label: string;
  /** The sample or qualifier beneath, e.g. "across 14 quotes". */
  caption?: string;
  loading?: boolean;
  /** Shown instead of the figure when there was nothing to measure. */
  empty?: boolean;
  emptyMessage?: string;
};

/**
 * A single non-comparable reading at display size — a median duration, a
 * horizon, a rate.
 *
 * Deliberately not a `KpiTile`: these have no period-over-period delta to
 * badge (a median has no meaningful previous value here) and several are not
 * numbers at all but phrases. Dropping them into a KPI row would promise a
 * comparison the data cannot make.
 */
export default function StatReading({
  value,
  label,
  caption,
  loading,
  empty,
  emptyMessage = 'Not enough data yet',
}: Props) {
  if (loading) {
    return (
      <Box sx={{ py: 1 }}>
        <Skeleton variant="text" width="55%" height={18} />
        <Skeleton variant="text" width="70%" height={48} />
        <Skeleton variant="text" width="45%" height={16} />
      </Box>
    );
  }

  return (
    <Stack spacing={0.25} sx={{ py: 1 }}>
      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        {label}
      </Typography>

      {empty ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {emptyMessage}
        </Typography>
      ) : (
        <>
          <Typography
            variant="h3"
            sx={{ fontSize: { xs: '1.9rem', sm: '2.15rem' }, lineHeight: 1.1 }}
          >
            {value}
          </Typography>
          {caption && (
            <Typography variant="body2" color="text.secondary">
              {caption}
            </Typography>
          )}
        </>
      )}
    </Stack>
  );
}
