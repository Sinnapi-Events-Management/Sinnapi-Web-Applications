import { useCallback, useState } from 'react';
import { invokeFunction } from '@/lib/functions';
import type { VendorAccountModel } from '@/lib/types';

export type PendingReset = { profileId: string; name: string; email: string | null };

const MESSAGES: Record<string, string> = {
  account_not_found: 'This vendor account no longer exists.',
  no_email_on_file: 'This vendor has no email address on file.',
  reset_email_failed: "The reset email couldn't be sent. Try again shortly.",
  forbidden: 'You do not have permission to reset passwords.',
};

/**
 * Confirm-then-send of a password reset link for a vendor.
 *
 * Reuses `send-password-reset`, which picks the destination portal from the
 * account's own roles — a vendor is sent into the vendor portal, not the client
 * one. That mattered enough to build: the portal gates refuse cross-portal
 * sessions, so a link aimed at the wrong app fails only AFTER the vendor has
 * already chosen a new password.
 *
 * Distinct from re-issuing credentials: this leaves the vendor in control of
 * their own password and their current one keeps working until they act, which
 * is the right instrument for anyone who has already signed in at least once.
 */
export function useVendorPasswordReset() {
  const [pending, setPending] = useState<PendingReset | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback((row: VendorAccountModel) => {
    setErr(null);
    setPending({
      profileId: row.profile_id,
      name: row.full_name ?? row.business_name ?? row.email ?? 'this vendor',
      email: row.email,
    });
  }, []);

  const cancel = useCallback(() => {
    setErr(null);
    setPending(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);

    const { error } = await invokeFunction('send-password-reset', { profileId: pending.profileId });
    setBusy(false);

    if (error) {
      setErr(MESSAGES[error] ?? error);
      return;
    }

    setNotice(`A password reset link has been emailed to ${pending.email ?? 'this vendor'}.`);
    setPending(null);
  }, [pending]);

  return {
    pending,
    busy,
    err,
    notice,
    clearNotice: useCallback(() => setNotice(null), []),
    request,
    cancel,
    confirm,
  };
}
