import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { UserModel } from '@/lib/types';

export type PendingConfirmationResend = { id: string; name: string; email: string | null };

const MESSAGES: Record<string, string> = {
  already_confirmed:
    'This client has already confirmed their email. If they cannot sign in, the cause is something else.',
  client_not_found: 'This client no longer exists.',
  confirmation_email_failed:
    "The confirmation email couldn't be sent. Check the address on file and try again.",
  forbidden: 'You do not have permission to resend confirmation emails.',
};

/**
 * Confirm-then-resend of a client's email confirmation link.
 *
 * Exists because the link expires after 24 hours: a client who signs up on a
 * Friday and opens the mail on Monday is stuck as `pending` with no way through
 * on their own beyond attempting a sign-in. This is the staffed route back —
 * support can put a fresh link in their inbox.
 *
 * Unlike the public resend, this one gives real answers: an admin is already
 * trusted with this client's record, and a silent no-op would leave them
 * clicking a button that appears to do nothing. It also skips the rate limits,
 * so a bot that burned the hourly quota for an address cannot also block support
 * from helping its owner.
 */
export function useClientConfirmationResend() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingConfirmationResend | null>(null);
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

    const { error } = await invokeFunction('client-sign-up', {
      action: 'admin_resend',
      profileId: pending.id,
    });
    setBusy(false);

    if (error) {
      setErr(MESSAGES[error] ?? error);
      return;
    }

    setNotice(`A new confirmation link has been emailed to ${pending.email ?? 'this client'}.`);
    setPending(null);
    // The client stays `pending` until they click it, so the list itself does
    // not change — but the detail view surfaces when the last link was sent.
    qc.invalidateQueries({ queryKey: ['client', pending.id] });
  }, [pending, qc]);

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
