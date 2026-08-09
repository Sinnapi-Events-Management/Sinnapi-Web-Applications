import { useCallback, useEffect, useMemo } from 'react';
import { useBlockedAccounts as useBlockedAccountsQuery } from '@/hooks/queries';
import { useTableState } from '@sinnapi/ui';
import { useAdmin } from '@/admin/AdminProvider';
import { supabase } from '@/lib/supabase';
import { useBlockedFilters } from './useBlockedFilters';
import { useBlockedActions } from './useBlockedActions';
import { useIpReveal } from './useIpReveal';

/**
 * Composes paging, filtering, IP reveal and the three resolution actions for
 * the Blocked Accounts page. Keeps the page component declarative: read
 * `rows`/`total`, spread `table.controls`, hand the rest to their organisms.
 *
 * Sorting is deliberately not exposed. The RPC fixes the order — locked
 * accounts first, most recent first — because the ordering carries meaning
 * here: a lockout expires on its own, so the rows where acting promptly changes
 * anything belong at the top, and letting a user sort by email would bury them.
 */
export function useBlockedAccounts() {
  const { has } = useAdmin();
  const canManage = has('users.manage');

  const table = useTableState({ pageSize: 25 });
  const { onPageChange } = table.controls;
  const resetPage = useCallback(() => onPageChange(0), [onPageChange]);

  const filters = useBlockedFilters(resetPage);
  const actions = useBlockedActions();
  const ip = useIpReveal();

  const params = useMemo(
    () => ({
      ...table.params,
      kind: filters.kind || undefined,
      role: filters.role || undefined,
      search: filters.search.query,
    }),
    [table.params, filters.kind, filters.role, filters.search.query],
  );

  const { data, isLoading, isFetching, error } = useBlockedAccountsQuery(params);

  // Opening the page is itself access to other people's device and location
  // history, so it is recorded once per mount — not per query, or paginating
  // would bury the signal it exists to provide.
  useEffect(() => {
    void supabase
      .rpc('log_security_access', { p_action: 'view_blocked_accounts', p_subject: null })
      .then(({ error: logError }) => {
        if (logError) console.error('Failed to log security page access:', logError.message);
      });
  }, []);

  const pageError =
    actions.err ??
    (error ? (error instanceof Error ? error.message : 'Failed to load blocked accounts.') : null);

  const emptyMessage =
    filters.activeCount > 0
      ? 'No blocked accounts match these filters.'
      : 'No accounts are currently blocked.';

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    canManage,
    table,
    filters,
    actions,
    ip,
  };
}
