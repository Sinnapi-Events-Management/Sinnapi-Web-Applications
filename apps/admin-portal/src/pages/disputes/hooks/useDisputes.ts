import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDisputesAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';

export function useDisputes() {
  const qc = useQueryClient();
  const { has } = useAdmin();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useDisputesAdmin(table.params);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.rpc('resolve_dispute', {
      p_dispute_id: active,
      p_resolution: String(form.get('resolution')),
      p_notes: String(form.get('notes')) || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setActive(null);
    qc.invalidateQueries({ queryKey: ['admin-disputes'] });
  }

  return {
    has,
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    active,
    setActive,
    busy,
    err,
    resolve,
    table,
  };
}
