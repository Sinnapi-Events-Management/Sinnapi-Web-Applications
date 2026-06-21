import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTemplates as useTemplatesQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useTemplates(vendorId: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useTemplatesQuery(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('quote_templates').insert({
      vendor_id: vendorId,
      name: String(form.get('name')),
      notes: String(form.get('notes')) || null,
      currency: 'UGX',
      is_active: true,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['v-templates', vendorId] });
  }

  return { rows, isLoading, error, open, setOpen, busy, err, add };
}
