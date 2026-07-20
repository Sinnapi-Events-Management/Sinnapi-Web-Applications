import { useCallback, useState } from 'react';
import { invokeFunction } from '@/lib/functions';
import type { UserModel } from '@/lib/types';

/** The user awaiting password-reset confirmation. */
export type PendingReset = {
  id: string;
  name: string;
  email: string | null;
};

/**
 * Owns the confirm-then-reset flow. The `reset-staff-password` Edge Function
 * generates a fresh one-time password, re-flags `must_change_password`, and
 * emails the credentials — nothing is shown in the UI, since the password only
 * ever travels by email. `notice` carries the success/warning toast.
 */
export function useUserPasswordReset() {
  const [pending, setPending] = useState<PendingReset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback((user: UserModel) => {
    setErr(null);
    setPending({
      id: user.id,
      name: user.full_name ?? user.email ?? 'this user',
      email: user.email,
    });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await invokeFunction<{ emailSent?: boolean }>('reset-staff-password', {
      userId: pending.id,
    });
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setNotice(
      data?.emailSent === false
        ? 'Password reset, but the email could not be sent. Try again shortly.'
        : `A new temporary password has been emailed to ${pending.name}.`,
    );
    setPending(null);
  }, [pending]);

  return {
    pending,
    busy,
    err,
    notice,
    clearNotice: () => setNotice(null),
    request,
    cancel,
    confirm,
  };
}
