import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { safeReturnTo } from '@/auth/returnTo';

/** Where to land when the callback URL names no `returnTo`. */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * Exchanges the code, then hands off to `?returnTo` if the link carried one —
 * the same rule as the sign-in form and the forced password change, so every
 * way of acquiring a session in this console ends up at the route that was
 * being reached for rather than resetting to the dashboard.
 */
export function useAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    (async () => {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
      }
      navigate(safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION), { replace: true });
    })();
  }, [params, navigate]);

  return { error };
}
