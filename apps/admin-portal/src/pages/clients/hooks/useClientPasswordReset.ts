import { useCallback, useState } from 'react';
import { invokeFunction } from '@/lib/functions';
import type { UserModel } from '@/lib/types';

export type PendingReset = { id: string; name: string; email: string | null };

const MESSAGES: Record<string, string> = {
  account_not_found: 'This client no longer exists.',
  no_email_on_file: 'This client has no email address on file.',
  reset_email_failed: "The reset email couldn't be sent. Try again shortly.",
  forbidden: 'You do not have permission to reset passwords.',
};

/**
 * Confirm-then-reset for a client. The client chooses their own password via a
 * secure link — a better fit than a temporary password, since the client portal
 * has no forced-change guard.
 *
 * Goes through the `send-password-reset` Edge Function rather than
 * `supabase.auth.resetPasswordForEmail`, which is what this used to call. That
 * sent GoTrue's built-in template — the last Sinnapi email that didn't use the
 * branded shell — and always aimed the link at the client portal, which is
 * wrong for the vendor and staff accounts this same flow can now target. The
 * function picks the destination from the account's own roles and logs the
 * send, so an admin causing a credential email to reach someone else leaves a
 * trace.
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
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await invokeFunction('send-password-reset', { profileId: pending.id });
    setBusy(false);
    if (error) {
      setErr(MESSAGES[error] ?? error);
      return;
    }
    setNotice(`A password reset link has been emailed to ${pending.email ?? 'this client'}.`);
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
