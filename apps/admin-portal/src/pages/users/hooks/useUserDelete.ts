import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { UserModel } from '@/lib/types';

/** The user awaiting remove confirmation. */
export type PendingDelete = {
  id: string;
  name: string;
};

/**
 * Owns the confirm-then-remove flow. Removal is a soft delete of the profile
 * (retained for audit, email freed for reuse) plus a permanent auth-login ban,
 * both performed by the `manage-staff` Edge Function. The row leaves the list
 * because `useUsers` filters `deleted_at is null`.
 */
export function useUserDelete() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((user: UserModel) => {
    setErr(null);
    setPending({ id: user.id, name: user.full_name ?? user.email ?? 'this user' });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const { error } = await invokeFunction('manage-staff', {
      userId: pending.id,
      action: 'remove',
    });
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['user-status-counts'] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
