import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRefundsAdmin } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function useRefunds() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data, isLoading, error } = useRefundsAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

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
    isLoading,
    error,
    busy,
    err,
    rows,
    approve,
  };
}
