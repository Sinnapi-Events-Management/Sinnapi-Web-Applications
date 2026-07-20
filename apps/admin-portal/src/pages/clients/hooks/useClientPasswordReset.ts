import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserModel } from '@/lib/types';

export type PendingReset = { id: string; name: string; email: string | null };

// Where the recovery link lands: the client sets their new password in the
// client portal (admins never see it). Must be on the project's Auth redirect
// allowlist. Falls back to a sensible default if the env isn't set.
const CLIENT_PORTAL_URL =
  (import.meta.env.VITE_CLIENT_PORTAL_URL as string | undefined) ?? 'https://app.sinnapi.com';

/**
 * Confirm-then-reset for a client. Uses Supabase's standard recovery email so
 * the client chooses their own password via a secure link — a better fit than a
 * temporary password, since the client portal has no forced-change guard.
 */
export function useClientPasswordReset() {
  const [pending, setPending] = useState<PendingReset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback((client: UserModel) => {
    setErr(null);
    setPending({
      id: client.id,
      name: client.full_name ?? client.email ?? 'this client',
      email: client.email,
    });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending?.email) {
      setErr('This client has no email on file.');
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(pending.email, {
      redirectTo: `${CLIENT_PORTAL_URL}/reset-password`,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setNotice(`A password reset link has been emailed to ${pending.email}.`);
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
