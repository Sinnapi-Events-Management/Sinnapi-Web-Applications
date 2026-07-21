import { useCallback, useMemo, useState } from 'react';
import type { PermissionModel, RoleModel } from '@/lib/types';
import { filterGroups, groupByCategory, type GrantFilter, type PermissionGroup } from '../schema';
import { useRoleGrants } from './useRoleGrants';

/** A category group paired with how much of it the selected role holds. */
export type CategoryView = PermissionGroup & {
  /** Granted count across the *whole* category, ignoring the active filters. */
  grantedCount: number;
  totalCount: number;
  allGranted: boolean;
  noneGranted: boolean;
  /** Every id in the category — what the grant-all / revoke-all control writes. */
  permissionIds: string[];
};

/**
 * Everything the permission pane needs for the selected role: the catalog
 * grouped by category, the search and grant filters narrowing it, and the write
 * surface from `useRoleGrants`.
 *
 * Counts are deliberately computed from the unfiltered catalog while the
 * rendered sections come from the filtered one, so "8 of 11 granted" keeps
 * describing the role even while a search is hiding most of the rows.
 */
export function useRolePermissions(
  role: RoleModel | undefined,
  catalog: PermissionModel[] | undefined,
) {
  const grants = useRoleGrants(role);
  const [searchInput, setSearchInput] = useState('');
  const [grantFilter, setGrantFilter] = useState<GrantFilter>('all');

  const permissions = useMemo(() => catalog ?? [], [catalog]);
  const allGroups = useMemo(() => groupByCategory(permissions), [permissions]);

  const query = searchInput.trim().toLowerCase();
  const isFiltered = !!query || grantFilter !== 'all';

  const visibleGroups = useMemo(
    () => filterGroups(allGroups, { query, grantFilter, granted: grants.granted }),
    [allGroups, query, grantFilter, grants.granted],
  );

  // Counts ride on the unfiltered groups, keyed by category, so a filtered
  // section still reports the role's real standing in that category.
  const totalsByCategory = useMemo(() => {
    const totals = new Map<string, { grantedCount: number; permissionIds: string[] }>();
    for (const group of allGroups) {
      const permissionIds = group.permissions.map((p) => p.id);
      totals.set(group.category.key, {
        permissionIds,
        grantedCount: permissionIds.filter((id) => grants.granted.has(id)).length,
      });
    }
    return totals;
  }, [allGroups, grants.granted]);

  const categories: CategoryView[] = useMemo(
    () =>
      visibleGroups.map((group) => {
        const totals = totalsByCategory.get(group.category.key);
        const permissionIds = totals?.permissionIds ?? [];
        const grantedCount = totals?.grantedCount ?? 0;
        return {
          ...group,
          permissionIds,
          grantedCount,
          totalCount: permissionIds.length,
          allGranted: permissionIds.length > 0 && grantedCount === permissionIds.length,
          noneGranted: grantedCount === 0,
        };
      }),
    [visibleGroups, totalsByCategory],
  );

  const totalGranted = useMemo(
    () => permissions.filter((p) => grants.granted.has(p.id)).length,
    [permissions, grants.granted],
  );

  const setCategoryGrants = useCallback(
    (category: CategoryView, on: boolean) => void grants.setMany(category.permissionIds, on),
    [grants],
  );

  return {
    ...grants,
    setCategoryGrants,
    categories,
    /** Rows surviving the filters — drives the "N shown" hint. */
    visibleCount: visibleGroups.reduce((sum, g) => sum + g.permissions.length, 0),
    totalGranted,
    /** Size of the catalog, not of the filtered view. */
    totalPermissions: permissions.length,
    search: {
      input: searchInput,
      setInput: setSearchInput,
      clear: useCallback(() => setSearchInput(''), []),
    },
    grantFilter,
    setGrantFilter,
    isFiltered,
    /** Sections force themselves open under a search — a collapsed hit is a lost hit. */
    forceExpanded: !!query,
    clearFilters: useCallback(() => {
      setSearchInput('');
      setGrantFilter('all');
    }, []),
  };
}

export type RolePermissionsState = ReturnType<typeof useRolePermissions>;
export type PermissionSearchState = RolePermissionsState['search'];
