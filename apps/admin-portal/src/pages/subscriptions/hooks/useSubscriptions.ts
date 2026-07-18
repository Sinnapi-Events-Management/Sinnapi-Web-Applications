import { useCallback, useMemo } from 'react';
import {
  useSubscriptionsAdmin,
  useSubscriptionAdminStatusCounts,
  usePricingPlanOptions,
  type SubscriptionAdminFilters,
  type SubscriptionAdminParams,
} from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { SUBSCRIPTION_STATUSES } from '@/lib/status';
import { useSubscriptionFilters } from './useSubscriptionFilters';
import { getStatusTabs, getEmptyMessage, type SubscriptionTabValue } from '../schema';

// Subscriptions list: server-side search (vendor name) + plan/expiring filters +
// status tab + sort + pagination, plus per-status count badges. A read-only
// monitoring view, so there are no row-action flows — this hook only composes
// the smaller hooks and shapes the query params, each concern owning its own
// URL-mirrored state elsewhere so this stays a thin coordinator.
export function useSubscriptions() {
  const table = useTableState({ sort: { field: 'current_period_end', direction: 'asc' } });
  const { onPageChange } = table.controls;

  // Any change to the query (tab, search, filter) re-queries from page 1 — a
  // later page rarely exists once the result set shrinks, which would otherwise
  // strand the user on an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: SUBSCRIPTION_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });
  const filters = useSubscriptionFilters({ onChange: resetPage });

  // Non-status filters, shared by the list query and the count badges.
  const listFilters = useMemo<SubscriptionAdminFilters>(
    () => ({ search: search.query, ...filters.query }),
    [search.query, filters.query],
  );

  const params = useMemo<SubscriptionAdminParams>(
    () => ({
      ...table.params,
      ...listFilters,
      status: status.value === ALL_STATUSES ? undefined : status.value,
    }),
    [table.params, listFilters, status.value],
  );

  const { data, isLoading, isFetching, error } = useSubscriptionsAdmin(params);
  const { data: counts, isLoading: countsLoading } = useSubscriptionAdminStatusCounts(listFilters);
  const { data: planOptions = [] } = usePricingPlanOptions();

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);

  // Drives the empty-state copy: distinguish "no subscriptions" from "none match".
  const filtered = Boolean(search.query) || filters.isActive || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as SubscriptionTabValue, filtered);

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
    tab: status.value as SubscriptionTabValue,
    onTabChange: status.setValue,
    search,
    filters,
    planOptions,
    table,
  };
}
