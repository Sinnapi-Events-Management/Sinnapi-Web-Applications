import { useTableState } from '@sinnapi/ui';
import { usePayments as usePaymentsQuery } from '@/hooks/queries';

/** The payment history list: server-paginated page state, newest first. */
export function usePayments() {
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = usePaymentsQuery(table.params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
  };
}
