import { useQueryClient } from '@tanstack/react-query';
import { useNotificationTemplates as useNotificationTemplatesQuery } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { supabase } from '@/lib/supabase';

export function useNotificationTemplates() {
  const qc = useQueryClient();
  const table = useTableState({ sort: { field: 'trigger_key', direction: 'asc' } });
  const { data, isLoading, isFetching, error } = useNotificationTemplatesQuery(table.params);

  async function toggle(id: string, is_active: boolean) {
    await supabase.from('notification_templates').update({ is_active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['notification-templates'] });
  }

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    toggle,
    table,
  };
}
