import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServices as useServicesQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useServices(vendorId: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useServicesQuery(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('vendor_services').insert({
      vendor_id: vendorId,
      title: String(form.get('title')),
      description: String(form.get('description')) || null,
      base_price: form.get('base_price') ? Number(form.get('base_price')) : null,
      currency: 'UGX',
      is_active: true,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['v-services', vendorId] });
  }

  return { rows, isLoading, error, open, setOpen, busy, err, add };
}
