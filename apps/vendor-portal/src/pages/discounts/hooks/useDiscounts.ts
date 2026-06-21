import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDiscounts as useDiscountsQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useDiscounts(vendorId: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useDiscountsQuery(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from('discounts').insert({
      vendor_id: vendorId,
      code: String(form.get('code')) || null,
      type: String(form.get('type')),
      value: Number(form.get('value')),
      currency: String(form.get('type')) === 'fixed' ? 'UGX' : null,
      max_uses: form.get('max_uses') ? Number(form.get('max_uses')) : null,
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
    qc.invalidateQueries({ queryKey: ['v-discounts', vendorId] });
  }

  return { rows, isLoading, error, open, setOpen, busy, err, add };
}
