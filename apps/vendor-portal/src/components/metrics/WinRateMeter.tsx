import { Box, LinearProgress, Skeleton, Stack, Typography } from '@sinnapi/ui';

type Props = {
  /** Accepted ÷ answered, or null when no quote was answered in the window. */
  winRate: number | null;
  accepted: number;
  answered: number;
  loading?: boolean;
};

/**
 * Quote win rate as a single proportion plus its raw counts.
 *
 * A meter rather than a donut: this is one share of one total, which a bar reads
 * more precisely than two arcs — and it survives the narrow column the card sits
 * in, where a ring's side legend would be squeezed.
 */
export default function WinRateMeter({ winRate, accepted, answered, loading }: Props) {
  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width="50%" height={48} />
        <Skeleton variant="rounded" height={10} sx={{ my: 1.5 }} />
        <Skeleton variant="text" width="80%" height={16} />
      </Box>
    );
  }

  // Nothing was answered in this window, so there is no rate to state. Saying
  // "0%" here would report a collapse that has not happened.
  if (winRate === null) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No quotes were answered in this period.
        </Typography>
      </Box>
    );
  }

  const pct = Math.round(winRate * 100);

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="h3" sx={{ fontSize: '2.1rem', lineHeight: 1 }}>
          {pct}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          of answered quotes won
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={pct}
        color={pct >= 50 ? 'success' : pct >= 25 ? 'warning' : 'error'}
        sx={{ height: 10, borderRadius: 5, my: 1.75 }}
        aria-label="Quote win rate"
      />

      <Typography variant="body2" color="text.secondary">
        {accepted.toLocaleString()} of {answered.toLocaleString()} answered quotes became a booking.
      </Typography>
    </Box>
  );
}
