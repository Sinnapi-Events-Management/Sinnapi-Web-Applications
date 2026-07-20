import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/** Minimum length for a self-chosen password. Kept in step with the copy below. */
const MIN_LENGTH = 10;

/**
 * Drives the forced first-sign-in password change. The user is already
 * authenticated (a session exists), so there's no recovery code to exchange —
 * we just set the new password and clear the one-time `must_change_password`
 * flag in a single write. That flag is what `ProtectedRoute` gates on, so the
 * resulting USER_UPDATED event releases the user to the app.
 */
export function useChangePassword() {
  const navigate = useNavigate();
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
    navigate('/dashboard', { replace: true });
  }

  return { error, submitting, submit, minLength: MIN_LENGTH };
}
