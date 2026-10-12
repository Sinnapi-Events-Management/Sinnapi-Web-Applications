import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { safeReturnTo } from '@/auth/returnTo';

/**
 * Minimum length for a self-chosen password. 8 is the platform-wide rule —
 * every portal's sign-up, reset and change flow enforces the same number.
 */
const MIN_LENGTH = 8;

/** Where to land when nothing was being reached for in the first place. */
const DEFAULT_DESTINATION = '/dashboard';

/**
 * Drives the forced first-sign-in password change. The user is already
 * authenticated (a session exists), so there's no recovery code to exchange —
 * we just set the new password and clear the one-time `must_change_password`
 * flag in a single write. That flag is what `ProtectedRoute` gates on, so the
 * resulting USER_UPDATED event releases the user to the app.
 *
 * Releases them onto `?returnTo` rather than always the dashboard:
 * `ProtectedRoute` puts the refused route on this screen's URL, so an operator
 * who arrived from an "Open in admin" email on a one-time password still lands
 * on the thread the mail was about once the password is their own.
 */
export function useChangePassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const { error } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(safeReturnTo(params.get('returnTo'), DEFAULT_DESTINATION), { replace: true });
  }

  return { error, submitting, submit, minLength: MIN_LENGTH };
}
