import { useCallback, useMemo } from 'react';
import { useUsers as useUsersQuery, useUserStatusCounts, useRoles } from '@/hooks/queries';
import { useTableState } from '@/hooks/useTableState';
import { useStatusFilter, ALL_STATUSES } from '@/hooks/useStatusFilter';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useAdmin } from '@/admin/AdminProvider';
import { PROFILE_STATUSES } from '@/lib/status';
import type { PageFilters } from '@/lib/table';
import { useUserCreate } from './useUserCreate';
import { useUserEdit } from './useUserEdit';
import { useUserStatus } from './useUserStatus';
import { useUserDelete } from './useUserDelete';
import { useUserPasswordReset } from './useUserPasswordReset';
import { getStatusTabs, getEmptyMessage, type UserTabValue } from '../schema';
import type { SelectOption } from '../schema';

// Staff users list: server-side search + status tab + sort + pagination over
// `profiles` (scoped to staff), per-status count badges, plus the create / edit /
// reset / block / remove flows. This hook only composes the smaller hooks and
// shapes the query params — each concern owns its own state elsewhere so this
// stays a thin coordinator.
export function useUsers() {
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

  const { data, isLoading, isFetching, error } = useUsersQuery(params);
  const { data: counts, isLoading: countsLoading } = useUserStatusCounts(search.query);
  const roles = useRoles();

  // Only staff (is_admin) roles are assignable here — this page never creates
  // client/vendor accounts.
  const roleOptions = useMemo<SelectOption[]>(
    () => (roles.data ?? []).filter((r) => r.is_admin).map((r) => ({ value: r.id, label: r.name })),
    [roles.data],
  );

  const tabs = useMemo(() => getStatusTabs(counts), [counts]);
  const filtered = Boolean(search.query) || status.value !== ALL_STATUSES;
  const emptyMessage = getEmptyMessage(status.value as UserTabValue, filtered);

  const create = useUserCreate();
  const edit = useUserEdit();
  const userStatus = useUserStatus();
  const remove = useUserDelete();
  const passwordReset = useUserPasswordReset();

  // Load + list-level failures belong to the page banner; per-flow failures are
  // rendered inside their own drawer/dialog.
  const pageError =
    userStatus.err ??
    remove.err ??
    passwordReset.err ??
    (error ? (error instanceof Error ? error.message : 'Failed to load users.') : null);

  // Success toasts from the flows that email credentials.
  const notice = create.notice ?? passwordReset.notice;
  const clearNotice = useCallback(() => {
    create.clearNotice();
    passwordReset.clearNotice();
  }, [create, passwordReset]);

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    pageError,
    emptyMessage,
    canManage,
    roleOptions,
    // Filtering surface.
    tabs,
    countsLoading,
    tab: status.value as UserTabValue,
    onTabChange: status.setValue,
    search,
    // Row-action + create flows.
    create,
    edit,
    status: userStatus,
    remove,
    passwordReset,
    notice,
    clearNotice,
    table,
  };
}
