import { useAuditLogs } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';

export function useAudit() {
  const table = useTableState({ sort: { field: 'occurred_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useAuditLogs(table.params);

  return { rows: data?.rows ?? [], total: data?.total ?? 0, isLoading, isFetching, error, table };
}
