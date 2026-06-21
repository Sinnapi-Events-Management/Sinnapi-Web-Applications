import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlansAdmin } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import type { PlanModel } from '@/lib/types';

export function usePricingPlans() {
  const qc = useQueryClient();
  const { data, isLoading, error } = usePlansAdmin();
  const [edit, setEdit] = useState<PlanModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-plans'] });
  }

  async function toggle(id: string, is_active: boolean) {
    await supabase.from('pricing_plans').update({ is_active }).eq('id', id);
    refresh();
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase
      .from('pricing_plans')
      .update({
        price: Number(form.get('price')),
        trial_days: Number(form.get('trial_days')),
      })
      .eq('id', edit.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setEdit(null);
    refresh();
  }

  return { rows, isLoading, error, edit, setEdit, busy, err, toggle, save };
}
