import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/lib/functions';
import type { ProfileStatus } from '@/lib/status';
import type { UserModel } from '@/lib/types';

export type PendingStatusChange = {
  id: string;
  name: string;
  /** The status being moved TO. */
  status: Extract<ProfileStatus, 'active' | 'suspended'>;
};

/**
 * Owns the confirm-then-block/activate flow. Blocking is more than a status
 * flip: the `manage-staff` Edge Function also bans the auth login, so a
 * suspended user can't sign in anywhere. Cells only signal intent; this hook
 * owns confirmation and the write.
 */
export function useUserStatus() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<PendingStatusChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const request = useCallback((user: UserModel, status: 'active' | 'suspended') => {
    setErr(null);
    setPending({ id: user.id, name: user.full_name ?? user.email ?? 'this user', status });
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
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['user-status-counts'] });
  }, [pending, qc]);

  return { pending, busy, err, request, cancel, confirm };
}
