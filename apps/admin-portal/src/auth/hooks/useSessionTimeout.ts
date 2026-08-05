import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdleTimeout, type SessionTimeoutDialogProps } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { IDLE_CONFIG } from '@/auth/idleConfig';
import type { SignOutReason } from '@/auth/portalAccess';

/** Everything `SessionTimeoutGuard` renders — the dialog's own props. */
type SessionTimeout = Pick<
  SessionTimeoutDialogProps,
  'open' | 'remainingMs' | 'warningMs' | 'onKeepSession' | 'onSignOut'
>;

/**
 * Wires the shared idle timer to this portal's auth: what "signed out" means
 * here, where the user lands afterwards, and how the two ways a session can end
 * are told apart in the audit trail.
 *
 * The distinction matters when reading that trail — `idle_timeout` is the app
 * ending a session nobody was using, `user_initiated` is a person choosing to
 * leave — so the dialog's own "Log out" button is logged as the latter even
 * though it is reached from the idle warning.
 */
export function useSessionTimeout(): SessionTimeout {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const endSession = useCallback(
    async (reason: SignOutReason) => {
      await signOut(reason);
      navigate('/sign-in', { replace: true });
    },
    [signOut, navigate],
  );

  const handleTimeout = useCallback(() => void endSession('idle_timeout'), [endSession]);
  const handleSignOut = useCallback(() => void endSession('user_initiated'), [endSession]);

  const { warningRemainingMs, keepSession } = useIdleTimeout({
    enabled: !!session,
    config: IDLE_CONFIG,
    onTimeout: handleTimeout,
  });

  const handleKeepSession = useCallback(async () => {
    keepSession();
    // The user confirmed they are present — renew the access token explicitly.
    // Non-fatal if it fails: the idle timer is already reset and Supabase's own
    // auto-refresh is still running.
    try {
      await supabase.auth.refreshSession();
    } catch {
      /* ignore */
    }
  }, [keepSession]);

  return {
    open: warningRemainingMs !== null,
    remainingMs: warningRemainingMs ?? 0,
    warningMs: IDLE_CONFIG.warningMs,
    onKeepSession: handleKeepSession,
    onSignOut: handleSignOut,
  };
}
