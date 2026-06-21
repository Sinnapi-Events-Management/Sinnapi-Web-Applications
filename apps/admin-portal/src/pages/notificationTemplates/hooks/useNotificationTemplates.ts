import { useQueryClient } from '@tanstack/react-query';
import { useNotificationTemplates as useNotificationTemplatesQuery } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';

export function useNotificationTemplates() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useNotificationTemplatesQuery();
  const rows = data ?? [];

  async function toggle(id: string, is_active: boolean) {
    await supabase.from('notification_templates').update({ is_active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['notification-templates'] });
  }

  return { rows, isLoading, error, toggle };
}
