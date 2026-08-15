import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import {
  useVendorAccounts as useVendorAccountsQuery,
  useVendorAccountCounts,
  type VendorAccountParams,
} from '@/hooks/queries';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useAdmin } from '@/admin/AdminProvider';
import { VENDOR_ACCOUNT_STATUSES } from '@/lib/status';
import { useVendorLifecycle } from './useVendorLifecycle';
import { useVendorCredentials } from './useVendorCredentials';
import { useVendorPasswordReset } from './useVendorPasswordReset';
import { getStatusTabs, getEmptyMessage, type VendorAccountTabValue } from '../schema/tabs';

/**
 * State for the vendor accounts list: server-side search + status tab + sort +
 * pagination, the count badges, and the three action flows.
 *
 * A thin coordinator on purpose — each concern owns its own state elsewhere and
 * this hook only composes them and shapes the query params. The alternative,
 * one hook holding four dialogs' worth of state, is the shape that makes a list
 * page unmaintainable.
 */
export function useVendorAccounts() {
  const navigate = useNavigate();
  const { has } = useAdmin();
  const canManage = has('users.manage');

  const table = useTableState({ sort: { field: 'created_at', direction: 'desc' } });
  const { onPageChange } = table.controls;

  // Any change to the query re-queries from page 1: a later page rarely
  // survives a narrower result set and would strand an empty table.
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const status = useStatusFilter({ valid: VENDOR_ACCOUNT_STATUSES, onChange: resetPage });
  const search = useSearchTerm({ onChange: resetPage });

  const params = useMemo<VendorAccountParams>(
    () => ({
      ...table.params,
      search: search.query,
      status: status.value === ALL_STATUSES ? undefined : status.value,
    }),
    [table.params, search.query, status.value],
  );

  const { data, isLoading, isFetching, error } = useVendorAccountsQuery(params);
  const { data: counts, isLoading: countsLoading } = useVendorAccountCounts(search.query);

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);
  const filtered = Boolean(search.query) || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as VendorAccountTabValue, filtered);

  const lifecycle = useVendorLifecycle();
  const credentials = useVendorCredentials();
  const passwordReset = useVendorPasswordReset();

  // Load failures and action failures share the page-level alert. Only one
  // dialog can be open at a time, so at most one action error exists.
  const pageError =
    lifecycle.err ??
    credentials.err ??
    passwordReset.err ??
    (error ? (error instanceof Error ? error.message : 'Failed to load vendor accounts.') : null);

  const notice = lifecycle.notice ?? credentials.notice ?? passwordReset.notice;
  const clearNotice = useCallback(() => {
    lifecycle.clearNotice();
    credentials.clearNotice();
    passwordReset.clearNotice();
    // The three clears are stable callbacks; re-creating this on every render
    // would re-close the snackbar mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewListing = useCallback(
    (vendorId: string | null) => {
      if (vendorId) navigate(`/vendors/${vendorId}`);
    },
    [navigate],
  );

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
    tab: status.value as VendorAccountTabValue,
    onTabChange: status.setValue,
    search,
    lifecycle,
    credentials,
    passwordReset,
    notice,
    clearNotice,
    viewListing,
    table,
  };
}
