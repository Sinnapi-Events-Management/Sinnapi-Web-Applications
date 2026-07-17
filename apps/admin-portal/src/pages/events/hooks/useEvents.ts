import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEventsAdmin,
  useEventAdminStatusCounts,
  type EventAdminFilters,
  type EventAdminParams,
} from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { EVENT_STATUSES } from '@/lib/status';
import { useEventFilters } from './useEventFilters';
import { useEventCreate } from './useEventCreate';
import { useEventEdit } from './useEventEdit';
import { useEventDelete } from './useEventDelete';
import { useEventStatus } from './useEventStatus';
import { getStatusTabs, getEmptyMessage, type EventTabValue } from '../schema/tabs';

// Events list: server-side search + filter + status tab + sort + pagination
// (all via the `search_events_admin` RPC), plus per-status count badges and
// the create/edit/status/delete flows. This hook only composes the smaller
// hooks and shapes the query params — each concern owns its own state elsewhere
// so this stays a thin coordinator.
export function useEvents() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;

  // Any change to the query (tab, search, filter) re-queries from page 1 — a
  // later page rarely exists once the result set shrinks, which would otherwise
  // strand the user on an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: EVENT_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });
  const filters = useEventFilters({ onChange: resetPage });

  // Non-status filters, shared by the list query and the count badges.
  const listFilters = useMemo<EventAdminFilters>(
    () => ({ search: search.query, ...filters.query }),
    [search.query, filters.query],
  );

  const params = useMemo<EventAdminParams>(
    () => ({
      ...table.params,
      ...listFilters,
      status: status.value === ALL_STATUSES ? undefined : status.value,
    }),
    [table.params, listFilters, status.value],
  );

  const { data, isLoading, isFetching, error } = useEventsAdmin(params);
  const { data: counts, isLoading: countsLoading } = useEventAdminStatusCounts(listFilters);

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);

  // Drives the empty-state copy: distinguish "no events" from "none match".
  const filtered = Boolean(search.query) || filters.isActive || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as EventTabValue, filtered);

  const create = useEventCreate();
  const edit = useEventEdit();
  const remove = useEventDelete();
  const eventStatus = useEventStatus();

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    // Filtering surface for the toolbar + tabs.
    tabs,
    countsLoading,
    tab: status.value as EventTabValue,
    onTabChange: status.setValue,
    search,
    filters,
    // Row-action + create flows.
    create,
    edit,
    remove,
    status: eventStatus,
    navigate,
    table,
  };
}
