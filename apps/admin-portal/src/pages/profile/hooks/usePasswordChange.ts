import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PasswordFormValues } from '../schema';

/**
 * Changes the signed-in admin's password.
 *
 * The current password is verified before anything is written. `updateUser` is
 * given `current_password` so GoTrue enforces it server-side wherever the
 * project has that requirement switched on, but that setting is off by default —
 * so the password is *also* re-checked here with a `signInWithPassword` against
 * the account's own email. Without that, an unattended session would be enough
 * to take an account over, which is precisely what this field exists to prevent.
 *
 * The re-check issues a fresh session for the same user (it does not disturb
 * sessions on other devices), which has the useful side effect of clearing
 * GoTrue's "recent login" requirement for the update that follows.
 */
export function usePasswordChange(onChanged?: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(
    async (values: PasswordFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) {
        setBusy(false);
        setErr('Your session has expired. Sign in again to change your password.');
        return false;
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: values.current_password,
      });
      if (reauthError) {
        setBusy(false);
        // Never echo GoTrue's message here — "Invalid login credentials" reads as
        // though the *account* is wrong rather than the one field that is.
        setErr('That current password is incorrect.');
        return false;
      }

      const { error } = await supabase.auth.updateUser({
        current_password: values.current_password,
        password: values.password,
        // Clears the one-time-password flag if this account still carries it, so
        // a voluntary change also satisfies the forced-change gate.
        data: { must_change_password: false },
      });

      setBusy(false);
      if (error) {
        setErr(error.message);
        return false;
      }

      onChanged?.('Your password has been changed.');
      return true;
    },
    [onChanged],
  );

  return { busy, err, clearError: useCallback(() => setErr(null), []), submit };
}
