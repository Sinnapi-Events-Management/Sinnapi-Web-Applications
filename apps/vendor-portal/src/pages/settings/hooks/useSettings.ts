import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useSettings() {
  const qc = useQueryClient();
  const { data: profile, isLoading, error } = useProfile();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    await supabase
      .from('profiles')
      .update({
        full_name: String(form.get('full_name')),
        phone: String(form.get('phone')) || null,
      })
      .eq('id', profile.id);
    setBusy(false);
    setToast(true);
    qc.invalidateQueries({ queryKey: ['profile'] });
  }

  return { profile, isLoading, error, busy, toast, setToast, save };
}
