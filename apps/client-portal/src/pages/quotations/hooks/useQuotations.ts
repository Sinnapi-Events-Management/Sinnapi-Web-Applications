import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useQuotations as useQuotationsQuery } from '@/hooks/queries';

/**
 * The quotations list: server-paginated page state over the client's quotes,
 * plus row navigation into the quote itself.
 */
export function useQuotations() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useQuotationsQuery(table.params);

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
