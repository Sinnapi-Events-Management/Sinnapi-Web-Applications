import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invokeFunction } from '@/lib/functions';
import type { BlockedAccountModel } from '@/lib/types';

/** Which action a confirmation dialog is currently pending for. */
export type BlockedActionKind = 'unlock' | 'reset' | 'confirmation';

export type PendingBlockedAction = {
  kind: BlockedActionKind;
  email: string;
  name: string;
  portal: string | null;
  profileId: string | null;
};

const MESSAGES: Record<string, string> = {
  already_confirmed: 'This account has already confirmed its email, so there is nothing to resend.',
  account_not_found: 'This account no longer exists.',
  client_not_found: 'This account no longer exists.',
  no_email_on_file: 'This account has no email address on file.',
  reset_email_failed: "The reset email couldn't be sent. Try again shortly.",
  confirmation_email_failed: "The confirmation email couldn't be sent. Try again shortly.",
  forbidden: 'You do not have permission to perform this action.',
};

/**
 * The three ways an admin resolves a block, behind one confirm-then-act state
 * machine.
 *
 * They are grouped because they share every piece of surrounding state — one
 * pending row, one busy flag, one error, one success notice, one dialog — and
 * splitting them into three hooks would triple that bookkeeping in the page for
 * no gain. What differs is a single `switch` in `confirm`.
 *
 * The distinction that matters, and the reason "unlock" exists at all: a
 * password reset does NOT clear a lockout. The lock is a count of denied
 * attempts, and mailing someone a link changes that count by zero. An admin who
 * only sent a reset would watch the account stay blocked.
 */
export function useBlockedActions() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingBlockedAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback((row: BlockedAccountModel, kind: BlockedActionKind) => {
    setErr(null);
    setPending({
      kind,
      email: row.email,
      name: row.full_name ?? row.email,
      portal: row.portal,
      profileId: row.profile_id,
    });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);

    let failure: string | null = null;
    let success = '';

    switch (pending.kind) {
      case 'unlock': {
        const { data, error } = await supabase.rpc('clear_portal_lockout', {
          p_email: pending.email,
          p_portal: pending.portal,
        });
        failure = error?.message ?? null;
        success = `Lockout cleared for ${pending.email}. They can sign in again immediately (${Number(data ?? 0)} attempts cleared).`;
        break;
      }
      case 'reset': {
        // Guarded rather than assumed: a locked row can belong to an address
        // with no account at all, and there is nobody to send a reset to.
        if (!pending.profileId) {
          failure = 'This address has no Sinnapi account, so there is nothing to reset.';
          break;
        }
        const { error } = await invokeFunction('send-password-reset', {
          profileId: pending.profileId,
        });
        failure = error ? (MESSAGES[error] ?? error) : null;
        success = `A password reset link has been emailed to ${pending.email}.`;
        break;
      }
      case 'confirmation': {
        if (!pending.profileId) {
          failure = 'This address has no Sinnapi account, so there is nothing to confirm.';
          break;
        }
        const { error } = await invokeFunction('client-sign-up', {
          action: 'admin_resend',
          profileId: pending.profileId,
        });
        failure = error ? (MESSAGES[error] ?? error) : null;
        success = `A new confirmation link has been emailed to ${pending.email}.`;
        break;
      }
    }

    setBusy(false);
    if (failure) {
      setErr(failure);
      return;
    }

    setNotice(success);
    setPending(null);
    // Unlocking changes what the list contains; the two email actions don't,
    // but refetching is cheap and keeps the page honest either way.
    qc.invalidateQueries({ queryKey: ['blocked-accounts'] });
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
