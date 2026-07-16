import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplications as useApplicationsQuery, useApplicationCounts } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter } from '@/hooks/useStatusFilter';
import { INTAKE_STATUSES } from '@/lib/status';
import { getStatusTabs, type IntakeTabValue } from '../schema/tabs';

/**
 * State for the vendor application review queue: server pagination/sorting, the
 * URL-backed status tab, and the per-status counts behind the tab badges.
 */
export function useApplications() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;

  // A tab switch re-queries from page 1 — page 3 of "All" rarely exists within
  // a single status, which would otherwise land on an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);
  const status = useStatusFilter({ valid: INTAKE_STATUSES, onChange: resetPage });

  const params = useMemo(
    () => ({ ...table.params, filters: status.filters }),
    [table.params, status.filters],
  );

  const { data, isLoading, isFetching, error } = useApplicationsQuery(params);
  const { data: counts, isLoading: countsLoading } = useApplicationCounts();

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);

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
    status: status.value as IntakeTabValue,
    onStatusChange: status.setValue,
  };
}
