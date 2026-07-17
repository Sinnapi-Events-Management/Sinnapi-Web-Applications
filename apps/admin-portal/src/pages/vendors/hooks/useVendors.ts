import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useVendorsAdmin,
  useVendorAdminStatusCounts,
  type VendorAdminFilters,
  type VendorAdminParams,
} from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useVendorStatus } from '@/hooks/useVendorStatus';
import { VENDOR_STATUSES } from '@/lib/status';
import { useVendorEdit } from './useVendorEdit';
import { useVendorDelete } from './useVendorDelete';
import { useVendorFilters } from './useVendorFilters';
import { getStatusTabs, getEmptyMessage, type VendorTabValue } from '../schema/tabs';

// Vendors list: server-side search + filter + status tab + sort + pagination
// (all via the `search_vendors_admin` RPC), plus per-status count badges and
// row-action flows. This hook only composes the smaller hooks and shapes the
// query params — each concern (search, filters, status, edit, delete, status
// change) owns its own state elsewhere so this stays a thin coordinator.
export function useVendors() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;

  // Any change to the query (tab, search, filter) re-queries from page 1 — a
  // later page rarely exists once the result set shrinks, which would otherwise
  // strand the user on an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: VENDOR_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });
  const filters = useVendorFilters({ onChange: resetPage });

  // Non-status filters, shared by the list query and the count badges.
  const listFilters = useMemo<VendorAdminFilters>(
    () => ({ search: search.query, ...filters.query }),
    [search.query, filters.query],
  );

  const params = useMemo<VendorAdminParams>(
    () => ({
      ...table.params,
      ...listFilters,
      status: status.value === ALL_STATUSES ? undefined : status.value,
    }),
    [table.params, listFilters, status.value],
  );

  const { data, isLoading, isFetching, error } = useVendorsAdmin(params);
  const { data: counts, isLoading: countsLoading } = useVendorAdminStatusCounts(listFilters);

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);

  // Drives the empty-state copy: distinguish "no vendors" from "none match".
  const filtered = Boolean(search.query) || filters.isActive || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as VendorTabValue, filtered);

  const vendorStatus = useVendorStatus();
  const edit = useVendorEdit();
  const remove = useVendorDelete();

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
    tab: status.value as VendorTabValue,
    onTabChange: status.setValue,
    search,
    filters,
    // Row-action flows.
    status: vendorStatus,
    edit,
    remove,
    navigate,
    table,
  };
}
