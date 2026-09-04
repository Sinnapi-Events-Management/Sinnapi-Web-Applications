import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTableState } from '@sinnapi/ui';
import { useReconciliationException, useReconciliationExceptions } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import type { ReconciliationExceptionModel } from '@/lib/types';

export type ResolutionStatus = 'investigating' | 'resolved' | 'ignored';

/** The URL param a payment page uses to land on one item with it already open. */
const ITEM_PARAM = 'item';

const OPEN = new Set(['open', 'investigating']);

/**
 * The reconciliation exception queue.
 *
 * Everything here was *filed* by the nightly sweeps, never corrected by them —
 * no automated job is allowed to move money to make the books agree. Working
 * an item means a human decided what happened and recorded that decision.
 *
 * `?item=<id>` is the way in from a payment's exceptions tab: the item is read
 * on its own (it may sit on any page of the list, or on none once resolved),
 * opened in the dialog for an admin who may work it, and the parameter is then
 * dropped so a refresh does not reopen it. A resolved item switches the list
 * to "all" so the row the link pointed at is actually on screen.
 */
export function useReconciliation() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'last_seen_at', direction: 'desc' } });
  const [searchParams, setSearchParams] = useSearchParams();

  const [openOnly, setOpenOnly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ReconciliationExceptionModel | null>(null);

  const { data, isLoading, isFetching, error } = useReconciliationExceptions(
    table.params,
    openOnly,
  );

  const item = searchParams.get(ITEM_PARAM) ?? undefined;
  const { data: linked } = useReconciliationException(item);

  useEffect(() => {
    if (!item || linked === undefined) return;
    if (linked) {
      if (!OPEN.has(linked.status)) setOpenOnly(false);
      if (has('finance.reconcile') && OPEN.has(linked.status)) setResolving(linked);
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(ITEM_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [item, linked, has, setSearchParams]);

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
      // The payment page shows the same items; a fresh open there must not
      // read a status this dialog has just changed.
      qc.invalidateQueries({ queryKey: ['admin-payment'] });
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
