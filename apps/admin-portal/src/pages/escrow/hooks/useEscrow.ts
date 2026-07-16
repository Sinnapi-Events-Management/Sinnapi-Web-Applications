import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEscrowAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function useEscrow() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useEscrowAdmin(table.params);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function approveRelease(escrowId: string) {
    setBusy(escrowId);
    setErr(null);
    // maker-checker: client must have confirmed first; this is the admin approval
    const { error } = await supabase.rpc('approve_escrow_release', { p_escrow_id: escrowId });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-escrow'] });
    qc.invalidateQueries({ queryKey: ['admin-payouts'] });
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
    approveRelease,
    table,
  };
}
