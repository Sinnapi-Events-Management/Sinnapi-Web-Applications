import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/** Minimum length for a self-chosen password. */
const MIN_LENGTH = 10;

// Establishes the recovery session from the email link's PKCE `code`, then lets
// the client set a new password via updateUser. Mirrors the admin-portal flow;
// the reset link is sent from the admin portal's "Trigger password reset".
export function useResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const code = params.get('code');
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        // detectSessionInUrl may have already consumed the code; tolerate that
        // as long as a session actually exists.
        if (error) {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            setError(
              'This reset link is invalid or has expired. Ask an administrator to resend it.',
            );
            return;
          }
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('This reset link is invalid or has expired. Ask an administrator to resend it.');
        return;
      }
      setReady(true);
    })();
  }, [params]);

  async function submit(password: string, confirm: string) {
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  return { ready, error, submitting, submit, minLength: MIN_LENGTH };
}
