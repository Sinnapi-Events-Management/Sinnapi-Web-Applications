import { useQuotationsAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';

export function useQuotations() {
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useQuotationsAdmin(table.params);

  return { rows: data?.rows ?? [], total: data?.total ?? 0, isLoading, isFetching, error, table };
}
