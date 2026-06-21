import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings as useSettingsQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import type { SettingModel } from '@/lib/types';

export function useSettings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useSettingsQuery();
  const [edit, setEdit] = useState<SettingModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const rows = data ?? [];

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    setErr(null);
    const raw = String(new FormData(e.currentTarget).get('value'));
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      setBusy(false);
      setErr('Value must be valid JSON (e.g. 10, "UGX", true)');
      return;
    }
    const { error } = await supabase.from('platform_settings').update({ value }).eq('id', edit.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setEdit(null);
    qc.invalidateQueries({ queryKey: ['settings'] });
  }

  return {
    rows,
    isLoading,
    error,
    edit,
    setEdit,
    busy,
    err,
    save,
  };
}
