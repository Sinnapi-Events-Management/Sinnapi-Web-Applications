import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePromotions as usePromotionsQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function usePromotions(vendorId: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = usePromotionsQuery(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('promotions').insert({
      vendor_id: vendorId,
      title: String(form.get('title')),
      description: String(form.get('description')) || null,
      starts_at: String(form.get('starts_at')),
      ends_at: String(form.get('ends_at')),
      is_active: true,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['v-promotions', vendorId] });
  }

  return { rows, isLoading, error, open, setOpen, busy, err, add };
}
