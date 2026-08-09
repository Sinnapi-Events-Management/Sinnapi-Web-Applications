import { useTableState } from '@sinnapi/ui';
import { useQuotations as useQuotationsQuery } from '@/hooks/queries';

/** The quotations list: server-paginated page state over the client's quotes. */
export function useQuotations() {
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useQuotationsQuery(table.params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
  };
}
