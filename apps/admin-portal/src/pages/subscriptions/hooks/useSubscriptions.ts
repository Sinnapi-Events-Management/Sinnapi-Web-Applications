import { useSubscriptionsAdmin } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';

export function useSubscriptions() {
  const table = useTableState({ sort: { field: 'current_period_end', direction: 'asc' } });
  const { data, isLoading, isFetching, error } = useSubscriptionsAdmin(table.params);

  return { rows: data?.rows ?? [], total: data?.total ?? 0, isLoading, isFetching, error, table };
}
