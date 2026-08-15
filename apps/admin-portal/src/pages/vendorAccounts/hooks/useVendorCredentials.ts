import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { VendorAccountModel } from '@/lib/types';

export type PendingCredentials = { profileId: string; name: string; email: string | null };

const MESSAGES: Record<string, string> = {
  already_signed_in:
    'This vendor has already signed in, so they own a password of their own. Send a password reset link instead.',
  account_not_active:
    'This account cannot sign in while it is suspended, deactivated or blocked. Activate it first, then re-issue credentials.',
  vendor_account_not_found: 'This vendor account no longer exists.',
  not_a_vendor_account: 'This account is not a vendor account.',
  no_email_on_file: 'This vendor has no email address on file.',
  credentials_email_failed:
    "The credentials email couldn't be sent. The old password is no longer valid, so try again shortly.",
  forbidden: 'You do not have permission to issue vendor credentials.',
};

/**
 * Confirm-then-issue of fresh sign-in credentials for a vendor who has never
 * got into the portal.
 *
 * Exists because the one-time password from `promote-intake` is mailed once and
 * never stored: when that mail is lost, the vendor is approved, listed and
 * locked out, and no other console action can help them. This replaces the
 * password and mails the new one — which also revokes the old one, closing off
 * a credential that has been sitting in an unread inbox.
 *
 * The list itself does not change (the account was already active and still is),
 * but `last_login_at` is what gates the action, so the row is refetched to keep
 * the menu honest if the vendor signs in between the send and the next look.
 */
export function useVendorCredentials() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingCredentials | null>(null);
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

    const { error } = await invokeFunction('resend-vendor-credentials', {
      profileId: pending.profileId,
    });
    setBusy(false);

    if (error) {
      setErr(MESSAGES[error] ?? error);
      return;
    }

    setNotice(`New sign-in credentials have been emailed to ${pending.email ?? 'this vendor'}.`);
    setPending(null);
    qc.invalidateQueries({ queryKey: ['vendor-accounts'] });
  }, [pending, qc]);

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
