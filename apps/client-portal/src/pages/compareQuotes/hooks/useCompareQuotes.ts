import { useTableState } from '@sinnapi/ui';
import { useComparableQuotations } from '@/hooks/queries';

/**
 * The comparison list. Defaults to cheapest-first, which is the question the
 * page exists to answer; the status narrowing to live quotes happens in the
 * query so the row count matches what is on screen.
 */
export function useCompareQuotes() {
  const table = useTableState({ sort: { field: 'total', direction: 'asc' } });
  const { data, isLoading, isFetching, error } = useComparableQuotations(table.params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
  };
}
