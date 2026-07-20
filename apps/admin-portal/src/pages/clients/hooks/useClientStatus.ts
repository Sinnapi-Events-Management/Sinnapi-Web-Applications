import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { UserModel } from '@/lib/types';

export type PendingStatusChange = {
  id: string;
  name: string;
  /** The status being moved TO. */
  status: 'active' | 'suspended';
};

/**
 * Confirm-then-block/activate for a client. Reuses the `manage-staff` Edge
 * Function — it acts on any profile (gated by `users.manage`) and, on suspend,
 * bans the auth login so the client can't sign in to the client portal.
 */
export function useClientStatus() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingStatusChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((client: UserModel, status: 'active' | 'suspended') => {
    setErr(null);
    setPending({ id: client.id, name: client.full_name ?? client.email ?? 'this client', status });
  }, []);

  const cancel = useCallback(() => setPending(null), []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    setBusy(true);
    setErr(null);
    const action = pending.status === 'suspended' ? 'suspend' : 'activate';
    const { error } = await invokeFunction('manage-staff', { userId: pending.id, action });
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setPending(null);
    qc.invalidateQueries({ queryKey: ['clients'] });
    qc.invalidateQueries({ queryKey: ['client-status-counts'] });
    qc.invalidateQueries({ queryKey: ['client', pending.id] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
