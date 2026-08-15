import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useComparableQuotations } from '@/hooks/queries';

/**
 * The comparison list. Defaults to cheapest-first, which is the question the
 * page exists to answer; the status narrowing to live quotes happens in the
 * query so the row count matches what is on screen.
 *
 * Rows open the quote itself. Comparing totals is what narrows the field, but
 * nobody picks a vendor on a number alone — the next question is always what
 * that number buys, and the answer is one row-click away.
 */
export function useCompareQuotes() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'total', direction: 'asc' } });
  const { data, isLoading, isFetching, error } = useComparableQuotations(table.params);

  function openQuotation(id: string) {
    navigate(`/quotations/${id}`);
  }

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    openQuotation,
  };
}
