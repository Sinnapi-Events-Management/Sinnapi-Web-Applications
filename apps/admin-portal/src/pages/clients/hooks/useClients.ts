import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients as useClientsQuery, useClientStatusCounts } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useAdmin } from '@/admin/AdminProvider';
import { PROFILE_STATUSES } from '@/lib/status';
import type { PageFilters } from '@/lib/table';
import { useClientStatus } from './useClientStatus';
import { useClientDelete } from './useClientDelete';
import { useClientPasswordReset } from './useClientPasswordReset';
import { getStatusTabs, getEmptyMessage, type ClientTabValue } from '../schema';

// Clients list (client + event_planner profiles): server-side search + status
// tab + sort + pagination, count badges, and the view / reset / block / remove
// row flows. Thin coordinator — each concern owns its own state elsewhere.
export function useClients() {
  const navigate = useNavigate();
  const { has } = useAdmin();
  const canManage = has('users.manage');

  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: PROFILE_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });

  const params = useMemo(() => {
    const filters: PageFilters = {};
    if (status.value !== ALL_STATUSES) filters.status = status.value;
    if (search.query) filters.search = search.query;
    return { ...table.params, filters: Object.keys(filters).length ? filters : undefined };
  }, [table.params, status.value, search.query]);

  const { data, isLoading, isFetching, error } = useClientsQuery(params);
  const { data: counts, isLoading: countsLoading } = useClientStatusCounts(search.query);

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);
  const filtered = Boolean(search.query) || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as ClientTabValue, filtered);

  const clientStatus = useClientStatus();
  const remove = useClientDelete();
  const passwordReset = useClientPasswordReset();

  const pageError =
    clientStatus.err ??
    remove.err ??
    passwordReset.err ??
    (error ? (error instanceof Error ? error.message : 'Failed to load clients.') : null);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    canManage,
    tabs,
    countsLoading,
    tab: status.value as ClientTabValue,
    onTabChange: status.setValue,
    search,
    status: clientStatus,
    remove,
    passwordReset,
    notice: passwordReset.notice,
    clearNotice: passwordReset.clearNotice,
    navigate,
    table,
  };
}
