import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

// Establishes the recovery session from the email link's PKCE `code`, then lets
// the user set a new password via updateUser.
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
            setError('This reset link is invalid or has expired. Request a new one.');
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
