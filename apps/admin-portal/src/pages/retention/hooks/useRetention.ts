import { useRetention as useRetentionQuery } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';

export function useRetention() {
  const table = useTableState({ sort: { field: 'data_category', direction: 'asc' } });
  const { data, isLoading, isFetching, error } = useRetentionQuery(table.params);

  return { rows: data?.rows ?? [], total: data?.total ?? 0, isLoading, isFetching, error, table };
}
