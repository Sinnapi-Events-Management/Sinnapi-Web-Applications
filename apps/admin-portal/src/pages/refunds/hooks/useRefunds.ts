import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRefundsAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function useRefunds() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useRefundsAdmin(table.params);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    setErr(null);
    const { error } = await supabase.rpc('approve_refund', { p_refund_id: id });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-refunds'] });
  }

  return {
    has,
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    busy,
    err,
    approve,
    table,
  };
}
