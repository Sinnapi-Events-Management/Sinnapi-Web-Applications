import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications as useNotificationsQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useNotifications() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useNotificationsQuery();
  const [busy, setBusy] = useState(false);
  const rows = data ?? [];

  async function markAll() {
    setBusy(true);
    await supabase.rpc('mark_all_notifications_read');
    setBusy(false);
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unread'] });
  }

  return { rows, isLoading, error, busy, markAll };
}
