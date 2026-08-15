import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { VendorAccountModel } from '@/lib/types';
import { lifecycleSpec, type LifecycleAction } from '../schema/actions';

export type PendingLifecycle = {
  profileId: string;
  name: string;
  action: LifecycleAction;
  /** Current status, so the dialog can say what is being changed FROM. */
  fromStatus: string;
};

export type LifecycleSubmission = {
  reason: string;
  /** ISO instant; only meaningful for `suspend`. */
  suspendedUntil?: string;
};

/**
 * Server refusals, translated. The Edge Function's codes are stable strings
 * meant for this map — surfacing them raw would put `not_a_vendor_account` in
 * front of an operator, which names the check rather than the problem.
 */
const MESSAGES: Record<string, string> = {
  vendor_account_not_found: 'This vendor account no longer exists.',
  not_a_vendor_account: 'This account is not a vendor account.',
  staff_account:
    'This is a staff account. Staff are managed from People → Users, so that the action lands in the right audit trail.',
  cannot_modify_self: 'You cannot change the state of your own account.',
  reason_required: 'A reason is required before this account can be switched off.',
  reason_too_long: 'That reason is too long — keep it under 500 characters.',
  suspension_too_short: 'A suspension must run for at least 15 minutes.',
  suspension_too_long:
    'A suspension cannot run longer than a year. If the vendor should be off indefinitely, block or deactivate the account instead.',
  'invalid:suspendedUntil': 'Choose a valid end date for the suspension.',
  forbidden: 'You do not have permission to change vendor account access.',
};

/**
 * Confirm-then-act for the four vendor account lifecycle transitions.
 *
 * One hook for all four rather than one per action: they differ only in the
 * payload they submit and the copy they show, both of which come from the
 * action spec. Four near-identical hooks would be four places to forget an
 * invalidation.
 *
 * The mutation goes through `manage-vendor-account` because each transition has
 * to move `profiles.status` AND ban or unban the auth login — the second is
 * service_role-only and cannot be done from the browser.
 */
export function useVendorLifecycle() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingLifecycle | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useCallback((row: VendorAccountModel, action: LifecycleAction) => {
    setErr(null);
    setPending({
      profileId: row.profile_id,
      name: row.full_name ?? row.business_name ?? row.email ?? 'this vendor',
      action,
      fromStatus: row.account_status,
    });
  }, []);

  const cancel = useCallback(() => {
    setErr(null);
    setPending(null);
  }, []);

  const confirm = useCallback(
    async ({ reason, suspendedUntil }: LifecycleSubmission) => {
      if (!pending) return;
      setBusy(true);
      setErr(null);

      const { error } = await invokeFunction('manage-vendor-account', {
        profileId: pending.profileId,
        action: pending.action,
        reason,
        ...(suspendedUntil ? { suspendedUntil } : {}),
      });
      setBusy(false);

      if (error) {
        setErr(MESSAGES[error] ?? error);
        return;
      }

      setNotice(
        `${pending.name} — ${lifecycleSpec(pending.action).confirmLabel.toLowerCase()} done.`,
      );
      setPending(null);
      // One prefix covers the list and the tab badges; both change together
      // because a transition moves the row from one tab to another.
      qc.invalidateQueries({ queryKey: ['vendor-accounts'] });
      // The Blocked Accounts page reads the same profile rows through a
      // different RPC, so it would otherwise keep showing an account that was
      // just restored — or miss one that was just blocked.
      qc.invalidateQueries({ queryKey: ['blocked-accounts'] });
    },
    [pending, qc],
  );

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
