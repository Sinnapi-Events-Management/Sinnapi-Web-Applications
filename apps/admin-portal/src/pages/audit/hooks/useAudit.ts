import { useMemo } from 'react';
import { useAuditLogs } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useAuditFilters } from './useAuditFilters';
import { useAuditDetail } from './useAuditDetail';

/**
 * Composes pagination, filtering, and the detail drawer for the audit page.
 * Keeps the page component declarative: read `rows`/`total`, spread
 * `table.controls`, and hand `filters`/`detail` to their organisms.
 */
export function useAudit() {
  const table = useTableState({ sort: { field: 'occurred_at', direction: 'desc' } });
  const { onPageChange } = table.controls;
  // Any filter change returns to the first page so results stay in view.
  const filters = useAuditFilters(() => onPageChange(0));
  const detail = useAuditDetail();

  const params = useMemo(
    () => ({ ...table.params, filters: filters.filters }),
    [table.params, filters.filters],
  );

  const { data, isLoading, isFetching, error } = useAuditLogs(params);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    filters,
    detail,
  };
}
