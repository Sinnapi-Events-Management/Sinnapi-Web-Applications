import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const LINK_EXPIRED =
  'This reset link is invalid or has expired. Ask an administrator to resend it.';

/**
 * Establishes the recovery session from the email link's PKCE `code`. Mirrors
 * the admin-portal flow; the link itself is sent from the admin portal's
 * "Trigger password reset".
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
    (async () => {
      if (code) {
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
