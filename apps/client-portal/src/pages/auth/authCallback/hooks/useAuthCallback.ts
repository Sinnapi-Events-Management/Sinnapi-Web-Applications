import { useEffect, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const LINK_DEAD =
  'This link has expired or has already been used. Request a new one from the sign-in page.';

/** The emailed link types this callback is willing to complete. */
const OTP_TYPES: EmailOtpType[] = ['signup', 'magiclink', 'invite', 'email_change'];

function toOtpType(raw: string | null): EmailOtpType | null {
  return OTP_TYPES.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null;
}

/**
 * Completes an emailed auth link and routes into the app.
 *
 * Two shapes arrive here, and they are not interchangeable:
 *
 *   * `?token_hash=…&type=…` — confirmation and resend links minted by
 *     `client-sign-up` through `admin.generateLink`. There is no PKCE code
 *     because this browser never started that flow, so no `code_verifier` was
 *     ever stored for it. `verifyOtp` redeems these and is flow-agnostic.
 *   * `?code=…` — a genuine PKCE exchange, still what password recovery and any
 *     browser-initiated flow produce.
 *
 * Handling only the second was the bug waiting to happen: a confirmation link
 * would have landed here, matched nothing, and dropped the visitor on the
 * dashboard with no session, where `ProtectedRoute` bounces them to sign-in —
 * with an account still `pending`, i.e. a signup that could never finish.
 *
 * On success the session is live, so `AuthProvider` re-checks the portal gate
 * before anything renders. The account is `active` by then: redeeming the link
 * sets `email_confirmed_at`, and the trigger added in the 0802b migration
 * promotes the profile out of `pending`.
 */
export function useAuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = params.get('token_hash');
    const otpType = toOtpType(params.get('type'));
    const code = params.get('code');

    (async () => {
      if (tokenHash && otpType) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        // Expired, already used, or superseded by a newer link. All ordinary,
        // and none of them something the user can fix from this screen — so the
        // message points at where a fresh link comes from.
        if (verifyError) {
          setError(LINK_DEAD);
          return;
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }

      navigate('/dashboard', { replace: true });
    })();
  }, [params, navigate]);

  return { error };
}
