import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePayoutsAdmin } from '@/hooks/queries';
import { useTableState } from '@sinnapi/ui';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import type { PayoutModel } from '@/lib/types';
import { settlementError } from './useSettlementForm';

/**
 * The payout queue.
 *
 * Settlement is manual: Finance transfers the money out of band, records it
 * with a reference and proof, and a *different* Finance admin approves that
 * record — which is the step that closes the ledger and notifies the vendor.
 *
 * The previous version invoked a `psp-payout` edge function that disbursed
 * automatically and completed the payout in one call. That function is gone:
 * it bypassed the second pair of eyes and assumed a payout API Sinnapi does
 * not operate.
 */
export function usePayouts() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);
  // `?q=` — a payout id (what a reconciliation exception links with) or a
  // settlement reference. Mirrored into the URL so the link is shareable.
  const search = useSearchTerm({ onChange: resetPage });
  const { data, isLoading, isFetching, error } = usePayoutsAdmin(table.params, search.query);

  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** The payout whose settlement is being recorded, if any. */
  const [settling, setSettling] = useState<PayoutModel | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-payouts'] });
    qc.invalidateQueries({ queryKey: ['admin-escrow'] });
  }

  async function run(id: string, fn: string) {
    setBusy(id);
    setErr(null);
    const { error: rpcError } = await supabase.rpc(fn, { p_payout_id: id });
    setBusy(null);
    if (rpcError) {
      setErr(settlementError(rpcError));
      return;
    }
    refresh();
  }

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
    search,
    table,

    /** Optional pre-approval before the money is sent. */
    approve: (id: string) => run(id, 'approve_payout'),
    /** The checker step: closes the ledger and notifies the vendor. */
    approveSettlement: (id: string) => run(id, 'approve_payout_settlement'),

    settling,
    openSettlement: setSettling,
    closeSettlement: () => setSettling(null),
  };
}
