import { Box, Stack, Typography, LinearProgress } from '@sinnapi/ui';

type Props = {
  granted: number;
  total: number;
  /** Hides the "x of y granted" caption when the caller states it elsewhere. */
  hideCaption?: boolean;
  /** Tint of the filled track. */
  accent?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
};

/**
 * How much of a permission set a role holds, as a bar plus a plain count.
 * Presentational — both figures are computed by the caller's hook.
 *
 * The bar is `determinate` even at zero so an empty role reads as "none of 25",
 * not as something still loading.
 */
export default function GrantMeter({ granted, total, hideCaption, accent = 'secondary' }: Props) {
  // Clamped: LinearProgress throws a console error outside 0–100, and the two
  // figures arrive from separate queries that can briefly disagree on load.
  const pct = total > 0 ? Math.min(100, Math.round((granted / total) * 100)) : 0;

  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={accent}
        aria-label={`${granted} of ${total} permissions granted`}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
      />
      {!hideCaption && (
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {granted} of {total} granted
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {pct}%
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
