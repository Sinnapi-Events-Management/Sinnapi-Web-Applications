'use client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { SessionCountdown } from './SessionCountdown';

export type SessionTimeoutDialogProps = {
  open: boolean;
  /** Milliseconds left before automatic sign-out. */
  remainingMs: number;
  /** Full length of the countdown, for the progress bar. */
  warningMs: number;
  /** "I'm still here" — dismiss and restart the idle timer. */
  onKeepSession: () => void;
  /** Leave now, deliberately. */
  onSignOut: () => void;
  title?: string;
  description?: string;
  keepLabel?: string;
  signOutLabel?: string;
};

/**
 * Presentational warning shown when a session is about to expire from
 * inactivity. It knows nothing about auth or timers — the portal that mounts it
 * owns both — so the same dialog serves the client, vendor and admin portals at
 * their own timeouts.
 */
export function SessionTimeoutDialog({
  open,
  remainingMs,
  warningMs,
  onKeepSession,
  onSignOut,
  title = 'Session about to expire',
  description = 'You’ve been inactive for a while. For your security, you’ll be signed out automatically.',
  keepLabel = 'Keep session',
  signOutLabel = 'Log out',
}: SessionTimeoutDialogProps) {
  return (
    <Dialog
      open={open}
      // Force an explicit choice — no backdrop-click / Escape dismissal.
      onClose={() => {}}
      maxWidth="xs"
      fullWidth
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-description"
    >
      <DialogTitle id="session-timeout-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="session-timeout-description">{description}</DialogContentText>
        <SessionCountdown remainingMs={remainingMs} warningMs={warningMs} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onSignOut} color="inherit">
          {signOutLabel}
        </Button>
        <Button onClick={onKeepSession} variant="contained" autoFocus>
          {keepLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
