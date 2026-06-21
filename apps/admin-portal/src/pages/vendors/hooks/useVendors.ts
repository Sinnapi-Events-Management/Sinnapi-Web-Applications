import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useVendorsAdmin } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useVendors() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useVendorsAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function setStatus(id: string, status: 'active' | 'suspended') {
    setBusy(id);
    setErr(null);
    const { error } = await supabase
      .from('vendors')
      .update({ status, visibility: status === 'active' ? 'public' : 'hidden' })
      .eq('id', id);
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['admin-vendors'] });
  }

  return {
    rows,
    isLoading,
    error,
    busy,
    err,
    setStatus,
  };
}
