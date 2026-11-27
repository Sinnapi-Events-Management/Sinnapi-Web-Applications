import { useCallback, useState } from 'react';
import { updateOwnPassword } from '@sinnapi/utils/passwordWrite';
import { supabase } from '@/lib/supabase';
import { invokeFunction } from '@/lib/functions';
import type { PasswordFormValues } from '../schema';

/**
 * Changes the signed-in admin's password.
 *
 * The current password is verified on the server first (`confirm-password`),
 * which records a confirmation for this session; that confirmation is what lets
 * `updateOwnPassword` obtain the ticket the auth.users guard demands. Without
 * it, an unattended session would be enough to take an account over.
 *
 * This used to re-check with `signInWithPassword` in the browser. That now
 * fails by design — the Custom Access Token hook refuses password grants our
 * own endpoints did not announce — and it also replaced the admin's session
 * as a side effect of typing into a form.
 */
export function usePasswordChange(onChanged?: (message: string) => void) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(
    async (values: PasswordFormValues): Promise<boolean> => {
      setBusy(true);
      setErr(null);

      const { error: confirmError } = await invokeFunction('confirm-password', {
        password: values.current_password,
      });
      if (confirmError) {
        setBusy(false);
        setErr(
          confirmError === 'wrong_password'
            ? 'That current password is incorrect.'
            : confirmError === 'too_many_attempts'
              ? 'Too many wrong attempts. Wait 15 minutes and try again.'
              : 'We could not check your password. Please try again.',
        );
        return false;
      }

      const failure = await updateOwnPassword(supabase, {
        current_password: values.current_password,
        password: values.password,
        // Clears the one-time-password flag if this account still carries it, so
        // a voluntary change also satisfies the forced-change gate.
        data: { must_change_password: false },
      });

      setBusy(false);
      if (failure) {
        setErr(failure);
        return false;
      }

      onChanged?.('Your password has been changed.');
      return true;
    },
    [onChanged],
  );

  return { busy, err, clearError: useCallback(() => setErr(null), []), submit };
}
