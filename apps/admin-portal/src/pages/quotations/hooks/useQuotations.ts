import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuotationsAdmin } from '@/hooks/queries';
import { useTableState } from '@sinnapi/ui';

/**
 * The quotations list: server-paginated page state over every quote on the
 * platform, and row navigation into the quote itself.
 *
 * The rows went nowhere until there was a detail page to send them to. A table
 * of references and totals is the whole of what `quotations.read` could see, so
 * an operator asked about one quote had no way to open it.
 */
export function useQuotations() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useQuotationsAdmin(table.params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    /** Row click target. The list is oversight; the detail page is the record. */
    viewQuotation: useCallback((id: string) => navigate(`/quotations/${id}`), [navigate]),
  };
}
