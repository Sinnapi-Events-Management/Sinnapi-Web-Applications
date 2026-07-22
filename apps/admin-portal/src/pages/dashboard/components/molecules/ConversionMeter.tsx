import { Box, LinearProgress, Skeleton, Stack, Typography } from '@sinnapi/ui';
import type { TrialsRow } from '../../schema';

type Props = {
  trials: TrialsRow | undefined;
  /** Converted ÷ ended, or null when no trial finished in the window. */
  conversion: number | null;
  loading?: boolean;
};

/**
 * Trial conversion as a single rate plus its raw counts.
 *
 * A meter rather than a donut: this is one proportion of one total, which a bar
 * reads more precisely than two arcs — and it survives the narrow column the
 * card sits in, where a donut's side legend would be squeezed.
 */
export default function ConversionMeter({ trials, conversion, loading }: Props) {
  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width="50%" height={48} />
        <Skeleton variant="rounded" height={10} sx={{ my: 1.5 }} />
        <Skeleton variant="text" width="80%" height={16} />
      </Box>
    );
  }

  // No trial has finished in this window, so there is no rate to state.
  if (conversion === null || !trials) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No trials ended in this period.
        </Typography>
        {trials && trials.ongoing > 0 && (
          <Typography variant="caption" color="text.secondary">
            {trials.ongoing.toLocaleString()} still running
          </Typography>
        )}
      </Box>
    );
  }

  const pct = Math.round(conversion * 100);

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={1}>
        <Typography variant="h3" sx={{ fontSize: '2.1rem', lineHeight: 1 }}>
          {pct}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          converted
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={pct}
        color={pct >= 50 ? 'success' : pct >= 25 ? 'warning' : 'error'}
        sx={{ height: 10, borderRadius: 5, my: 1.75 }}
        aria-label="Trial conversion rate"
      />

      <Typography variant="body2" color="text.secondary">
        {trials.converted.toLocaleString()} of {trials.ended.toLocaleString()} ended trials moved to
        a paying plan.
      </Typography>
      {trials.ongoing > 0 && (
        <Typography variant="caption" color="text.secondary">
          {trials.ongoing.toLocaleString()} still running
        </Typography>
      )}
    </Box>
  );
}
