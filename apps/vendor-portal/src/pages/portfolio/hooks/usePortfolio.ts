import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMedia } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function usePortfolio(vendorId: string) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useMedia(vendorId);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  // NOTE: real uploads go to Supabase Storage; here we register a media URL.
  // The DB trigger enforces plan limits (Starter ≤10 images, video on Pro/Elite).
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const url = String(form.get('url'));
    const { error } = await supabase.from('vendor_media').insert({
      vendor_id: vendorId,
      media_type: String(form.get('media_type')),
      storage_path: url,
      url,
      caption: String(form.get('caption')) || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
  }

  async function remove(id: string) {
    await supabase.from('vendor_media').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
  }

  return { rows, isLoading, error, open, setOpen, busy, err, add, remove };
}
