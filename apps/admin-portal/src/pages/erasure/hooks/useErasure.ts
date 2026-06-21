import { useQueryClient } from '@tanstack/react-query';
import { useErasureRequests } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useErasure() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useErasureRequests();
  const rows = data ?? [];

  async function setStatus(id: string, status: string) {
    await supabase.from('erasure_requests').update({ status }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['erasure'] });
  }

  return {
    rows,
    isLoading,
    error,
    setStatus,
  };
}
