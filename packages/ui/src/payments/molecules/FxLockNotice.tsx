'use client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { formatRemaining } from '../fxFormat';

export type FxLockNoticeProps = {
  /** Seconds left on the lock; zero means it has lapsed. */
  remaining: number;
};

/** Under a minute the countdown turns amber, so the lapse is never a surprise. */
const RUNNING_LOW_SECONDS = 60;

/**
 * The lock, stated as the promise it is.
 *
 * The quote is held for a fixed window and the charge is re-derived from it
 * server-side, so this figure is what will be taken. The countdown makes that
 * promise legible; when it lapses the payer is asked to re-quote rather than
 * being sent to PayPal against a stale figure.
 */
export function FxLockNotice({ remaining }: FxLockNoticeProps) {
  if (remaining <= 0) {
    return (
      <Alert severity="warning">
        This rate has expired. Get an updated amount before continuing.
      </Alert>
    );
  }

  const low = remaining <= RUNNING_LOW_SECONDS;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      role="timer"
      aria-live="off"
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: (t) => alpha(t.palette[low ? 'warning' : 'info'].main, 0.08),
        border: (t) => `1px solid ${alpha(t.palette[low ? 'warning' : 'info'].main, 0.25)}`,
      }}
    >
      <TimerOutlinedIcon sx={{ color: low ? 'warning.main' : 'info.main' }} />
      <Typography variant="caption" sx={{ flex: 1 }}>
        This amount is held for{' '}
        <Box component="strong" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatRemaining(remaining)}
        </Box>
        . You will be charged exactly this, whatever the rate does next.
      </Typography>
    </Stack>
  );
}
