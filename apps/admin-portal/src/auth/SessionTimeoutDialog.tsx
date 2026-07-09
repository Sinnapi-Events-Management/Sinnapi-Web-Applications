import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Typography,
} from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { useIdleTimeout } from '@/auth/hooks/useIdleTimeout';
import { WARNING_DURATION_MS } from '@/auth/idleConfig';

/**
 * Watches for idle sessions and, after 5 minutes of inactivity, shows a
 * 60-second countdown before signing the user out. Mounted once inside the
 * authenticated shell so it covers every admin page.
 */
export default function SessionTimeoutDialog() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const signOutToLogin = useCallback(async () => {
    await signOut();
    navigate('/sign-in', { replace: true });
  }, [signOut, navigate]);

  const { warningRemainingMs, keepSession } = useIdleTimeout(!!session, signOutToLogin);

  const handleKeep = useCallback(async () => {
    keepSession();
    // User confirmed presence — renew the access token explicitly. Non-fatal if
    // it fails: the idle timer is already reset and Supabase auto-refresh runs.
    try {
      await supabase.auth.refreshSession();
    } catch {
      /* ignore */
    }
  }, [keepSession]);

  const open = warningRemainingMs !== null;
  const seconds = Math.max(0, Math.ceil((warningRemainingMs ?? 0) / 1000));
  const progress = Math.max(
    0,
    Math.min(100, ((warningRemainingMs ?? 0) / WARNING_DURATION_MS) * 100),
  );

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
      <DialogTitle id="session-timeout-title">Session about to expire</DialogTitle>
      <DialogContent>
        <DialogContentText id="session-timeout-description">
          You’ve been inactive for a while. For your security, you’ll be signed out automatically.
        </DialogContentText>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={signOutToLogin} color="inherit">
          Log out
        </Button>
        <Button onClick={handleKeep} variant="contained" autoFocus>
          Keep session
        </Button>
      </DialogActions>
    </Dialog>
  );
}
