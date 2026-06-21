import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEventsAdmin } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useEvents() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useEventsAdmin();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function post(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const form = new FormData(e.currentTarget);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from('events').insert({
      posted_by: user?.id,
      source: 'admin',
      title: String(form.get('title')),
      description: String(form.get('description')) || null,
      event_type: String(form.get('event_type')) || null,
      event_date: String(form.get('event_date')) || null,
      location: String(form.get('location')) || null,
      status: 'published',
      is_public: true,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['admin-events'] });
  }

  return {
    rows,
    isLoading,
    error,
    open,
    setOpen,
    busy,
    err,
    post,
  };
}
