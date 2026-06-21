import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePayoutsAdmin } from '@/hooks/queries';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function usePayouts() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const { data, isLoading, error } = usePayoutsAdmin();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-payouts'] });
  }

  // maker-checker: approver must differ from the requester (enforced in the RPC)
  async function approve(id: string) {
    setBusy(id);
    setErr(null);
    const { error } = await supabase.rpc('approve_payout', { p_payout_id: id });
    setBusy(null);
    if (error) {
      setErr(error.message);
      return;
    }
    refresh();
  }

  // disbursement runs server-side in the psp-payout Edge Function (uses the
  // audited bank-decrypt RPC); we invoke it with the caller's JWT.
  async function process(id: string) {
    setBusy(id);
    setErr(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_FUNCTIONS_URL}/psp-payout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payoutId: id }),
    });
    setBusy(null);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({})))?.error ?? 'Payout failed');
      return;
    }
    refresh();
  }

  return { rows, isLoading, error, has, busy, err, approve, process };
}
