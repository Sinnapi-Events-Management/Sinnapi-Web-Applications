import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTableState } from '@sinnapi/ui';
import { useReconciliationExceptions } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import type { ReconciliationExceptionModel } from '@/lib/types';

export type ResolutionStatus = 'investigating' | 'resolved' | 'ignored';

/**
 * The reconciliation exception queue.
 *
 * Everything here was *filed* by the nightly sweeps, never corrected by them —
 * no automated job is allowed to move money to make the books agree. Working
 * an item means a human decided what happened and recorded that decision.
 */
export function useReconciliation() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'last_seen_at', direction: 'desc' } });

  const [openOnly, setOpenOnly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ReconciliationExceptionModel | null>(null);

  const { data, isLoading, isFetching, error } = useReconciliationExceptions(
    table.params,
    openOnly,
  );

  const resolve = useCallback(
    async (id: string, status: ResolutionStatus, notes: string) => {
      setBusy(id);
      setErr(null);
      const { error: rpcError } = await supabase.rpc('resolve_reconciliation_exception', {
        p_id: id,
        p_status: status,
        p_notes: notes.trim() || null,
      });
      setBusy(null);
      if (rpcError) {
        setErr(
          rpcError.message.includes('forbidden')
            ? 'You do not have permission to work the reconciliation queue.'
            : rpcError.message,
        );
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin-reconciliation'] });
      setResolving(null);
    },
    [qc],
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
    openOnly,
    setOpenOnly,
    resolving,
    openResolve: setResolving,
    closeResolve: () => setResolving(null),
    resolve,
    table,
  };
}
