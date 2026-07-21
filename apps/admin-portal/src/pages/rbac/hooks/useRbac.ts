import { useCallback, useMemo, useState } from 'react';
import { useRoles, usePermissionsCatalog } from '@/hooks/queries';
import type { RoleModel } from '@/lib/types';

export type RbacSummaryCounts = {
  roles: number;
  /** Roles flagged `is_admin` — read-only in this editor. */
  adminRoles: number;
  permissions: number;
  /** Permissions held by the selected role; 0 when nothing is selected. */
  grantedToSelection: number;
};

/**
 * Page-level state for Roles & permissions: the two catalogs, which role is
 * open in the editor, the roles-list search, and the summary counts.
 *
 * The selected role is resolved by id on every render rather than snapshotted,
 * so the optimistic writes in `useRoleGrants` flow straight through to the open
 * pane. If a search or a refetch removes the selected role from the list, the
 * lookup simply yields undefined and the pane falls back to its placeholder —
 * no stale role can linger in the editor.
 */
export function useRbac() {
  const rolesQuery = useRoles();
  const permissionsQuery = usePermissionsCatalog();

  const [roleId, setRoleId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);

  const selectedRole: RoleModel | undefined = useMemo(
    () => roles.find((r) => r.id === roleId),
    [roles, roleId],
  );

  const query = searchInput.trim().toLowerCase();

  const visibleRoles = useMemo(() => {
    if (!query) return roles;
    return roles.filter(
      (r) => r.name.toLowerCase().includes(query) || r.key.toLowerCase().includes(query),
    );
  }, [roles, query]);

  const counts: RbacSummaryCounts = useMemo(
    () => ({
      roles: roles.length,
      adminRoles: roles.filter((r) => r.is_admin).length,
      permissions: permissions.length,
      grantedToSelection: (selectedRole?.role_permissions ?? []).length,
    }),
    [roles, permissions.length, selectedRole],
  );

  return {
    roles,
    visibleRoles,
    permissions,
    selectedRole,
    selectRole: useCallback((role: RoleModel) => setRoleId(role.id), []),
    clearSelection: useCallback(() => setRoleId(null), []),
    isSelected: useCallback((id: string) => id === roleId, [roleId]),
    roleSearch: {
      input: searchInput,
      setInput: setSearchInput,
      clear: useCallback(() => setSearchInput(''), []),
    },
    /** True when the search — not an empty table — emptied the roles list. */
    isFiltered: !!query,
    counts,
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    error: rolesQuery.error ?? permissionsQuery.error,
  };
}

export type RbacState = ReturnType<typeof useRbac>;
export type RoleSearchState = RbacState['roleSearch'];
