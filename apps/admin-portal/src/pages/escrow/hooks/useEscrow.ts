import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTableState } from '@sinnapi/ui';
import { useRealtimeRefresh } from '@sinnapi/ui/data';
import { useEscrowAdmin } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { settlementError } from '@/pages/payouts/hooks/useSettlementForm';

/**
 * The escrow register.
 *
 * Subscribed rather than polled: funding webhooks and the lifecycle cron move
 * escrows without anyone in this portal doing anything, and a release console
 * showing stale state is how two admins end up approving the same thing.
 */
export function useEscrow() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useEscrowAdmin(table.params);

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-escrow'] });
    qc.invalidateQueries({ queryKey: ['admin-payouts'] });
  }, [qc]);

  useRealtimeRefresh({
    client: supabase,
    channel: 'admin-escrow-register',
    onChange: refresh,
    watch: ESCROW_WATCH,
  });

  /**
   * The checker half of the release: the client (or the auto-release timer)
   * has already made the request, and this splits the held pool into the
   * vendor's balance, commission and the processing fee, then raises the
   * balance payout.
   */
  const approveRelease = useCallback(
    async (escrowId: string) => {
      setBusy(escrowId);
      setErr(null);
      const { error: rpcError } = await supabase.rpc('approve_escrow_release', {
        p_escrow_id: escrowId,
      });
      setBusy(null);
      if (rpcError) {
        setErr(settlementError(rpcError));
        return;
      }
      refresh();
    },
    [refresh],
  );

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    has,
    busy,
    err,
    clearError: () => setErr(null),
    approveRelease,
    table,
  };
}

// Module-level so the identity is stable across renders.
const ESCROW_WATCH = [{ table: 'escrow_transactions' }, { table: 'payouts' }];
