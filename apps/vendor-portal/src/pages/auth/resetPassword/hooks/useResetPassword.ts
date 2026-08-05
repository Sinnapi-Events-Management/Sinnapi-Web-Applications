import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const LINK_EXPIRED =
  'This reset link is invalid or has expired. Ask an administrator to resend it.';

/**
 * Establishes the recovery session from an emailed reset link.
 *
 * This portal had no reset route at all before: vendors are provisioned with a
 * one-time password and pushed through `/change-password`, so a vendor who
 * forgot their password later had nowhere to land. `send-password-reset` routes
 * vendor accounts here, which is the reason the page exists.
 *
 * The link carries `?token_hash=&type=recovery` rather than a PKCE `code` — it
 * was minted server-side, so this browser never stored a `code_verifier`. The
 * `code` branch is kept for a browser-initiated recovery, should this portal
 * grow a "forgot password" form.
 *
 * Only the session matters here — choosing and writing the new password is
 * `useResetPasswordForm`'s job. `ready` gates the form on a session actually
 * existing, so a dead link shows the expiry notice instead of a form whose
 * submit could never succeed.
 */
export function useResetPassword() {
  const [params] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const tokenHash = params.get('token_hash');
    (async () => {
      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (verifyError) {
          setError(LINK_EXPIRED);
          return;
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        // detectSessionInUrl may have already consumed the code; tolerate that
        // as long as a session actually exists.
        if (exchangeError) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError(LINK_EXPIRED);
            return;
          }
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError(LINK_EXPIRED);
        return;
      }
      setReady(true);
    })();
  }, [params]);

  return { ready, error };
}
