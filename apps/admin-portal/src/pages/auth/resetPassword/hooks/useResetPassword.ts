import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const LINK_EXPIRED = 'This reset link is invalid or has expired. Request a new one.';

/**
 * Establishes the recovery session from an emailed reset link, then lets the
 * user set a new password via `updateUser`.
 *
 * Two link shapes arrive: `?token_hash=&type=recovery` from the
 * `send-password-reset` Edge Function, and `?code=` from the browser-initiated
 * PKCE flow behind "Forgot password". The first carries no code — it was minted
 * server-side, so this browser holds no `code_verifier` — and handling only the
 * second would leave every admin-sent reset link on a page that cannot open.
 */
export function useResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // detectSessionInUrl may have already consumed the code; tolerate that
        // as long as a session actually exists.
        if (error) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError(LINK_EXPIRED);
            return;
          }
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('This reset link is invalid or has expired. Request a new one.');
        return;
      }
      setReady(true);
    })();
  }, [params]);

  async function submit(password: string) {
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  return { ready, error, submitting, submit };
}
