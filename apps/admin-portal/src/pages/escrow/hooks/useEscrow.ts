import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEscrowAdmin } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function useEscrow() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data, isLoading, error } = useEscrowAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

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
    rows,
    isLoading,
    error,
    has,
    busy,
    err,
    approveRelease,
  };
}
