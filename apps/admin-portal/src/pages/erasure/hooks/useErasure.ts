import { useQueryClient } from '@tanstack/react-query';
import { useErasureRequests } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { supabase } from '@/lib/supabase';

export function useErasure() {
  const qc = useQueryClient();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useErasureRequests(table.params);

  async function setStatus(id: string, status: string) {
    await supabase.from('erasure_requests').update({ status }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['erasure'] });
  }

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    setStatus,
    table,
  };
}
