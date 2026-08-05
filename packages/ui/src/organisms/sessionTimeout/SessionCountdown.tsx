'use client';
import { Box, LinearProgress, Typography } from '@mui/material';

export type SessionCountdownProps = {
  /** Milliseconds left before automatic sign-out. */
  remainingMs: number;
  /** Full length of the countdown — the 100% mark for the progress bar. */
  warningMs: number;
};

/**
 * The countdown half of the timeout warning: seconds remaining, plus a bar
 * draining towards zero. Split out so the dialog stays pure composition, and
 * so the same readout can be reused wherever a session countdown belongs.
 */
export function SessionCountdown({ remainingMs, warningMs }: SessionCountdownProps) {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const progress = Math.max(0, Math.min(100, warningMs > 0 ? (remainingMs / warningMs) * 100 : 0));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="h4"
        component="p"
        align="center"
        aria-live="polite"
        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
      >
        {seconds}s
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mt: 1.5, height: 8, borderRadius: 1 }}
      />
    </Box>
  );
}
