import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { UserModel } from '@/lib/types';

export type PendingDelete = { id: string; name: string };

/**
 * Confirm-then-remove for a client: soft-deletes the profile and permanently
 * bans the auth login via the `manage-staff` Edge Function. The row leaves the
 * list because `useClients` filters `deleted_at is null`.
 */
export function useClientDelete() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((client: UserModel) => {
    setErr(null);
    setPending({ id: client.id, name: client.full_name ?? client.email ?? 'this client' });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async (): Promise<boolean> => {
    if (!pending) return false;
    setBusy(true);
    setErr(null);
    const { error } = await invokeFunction('manage-staff', {
      userId: pending.id,
      action: 'remove',
    });
    setBusy(false);
    if (error) {
      setErr(error);
      return false;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['clients'] });
    qc.invalidateQueries({ queryKey: ['client-status-counts'] });
    return true;
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
