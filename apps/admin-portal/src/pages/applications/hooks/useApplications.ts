import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useApplications as useApplicationsQuery,
  useApplicationCounts,
  type IntakeAdminParams,
} from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { INTAKE_STATUSES } from '@/lib/status';
import { getStatusTabs, getEmptyMessage, type IntakeTabValue } from '../schema/tabs';

/**
 * State for the vendor application review queue: server-side search + status
 * filter + sort + pagination (via the `search_intake_admin` RPC), plus the
 * per-status counts behind the tab badges. Each concern owns its own state —
 * this hook composes them and shapes the query params.
 */
export function useApplications() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;

  // Any change to the query (tab or search) re-queries from page 1 — a later
  // page rarely survives a narrower result set and would strand an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);
  const status = useStatusFilter({ valid: INTAKE_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });

  const params = useMemo<IntakeAdminParams>(
    () => ({
      ...table.params,
      search: search.query,
      status: status.value === ALL_STATUSES ? undefined : status.value,
    }),
    [table.params, search.query, status.value],
  );

  const { data, isLoading, isFetching, error } = useApplicationsQuery(params);
  const { data: counts, isLoading: countsLoading } = useApplicationCounts(search.query);

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);

  // Distinguish "no applications" from "none match the search/tab".
  const filtered = Boolean(search.query) || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as IntakeTabValue, filtered);

  const viewApplication = useCallback((id: string) => navigate(`/applications/${id}`), [navigate]);

  return {
    viewApplication,
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    tabs,
    countsLoading,
    emptyMessage,
    status: status.value as IntakeTabValue,
    onStatusChange: status.setValue,
    search,
  };
}
