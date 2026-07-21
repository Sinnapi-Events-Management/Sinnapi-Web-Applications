import type { PermissionModel } from '@/lib/types';
import type { PermissionGroup } from './categories';

/** Which slice of the catalog the permission pane shows. */
export type GrantFilter = 'all' | 'granted' | 'available';

export const GRANT_FILTERS: { value: GrantFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'granted', label: 'Granted' },
  { value: 'available', label: 'Not granted' },
];

/** Does a permission match the free-text query? Key and description only. */
function matches(permission: PermissionModel, query: string): boolean {
  if (!query) return true;
  return (
    permission.key.toLowerCase().includes(query) ||
    !!permission.description?.toLowerCase().includes(query)
  );
}

export type FilterCriteria = {
  /** Already lower-cased and trimmed by the caller. */
  query: string;
  grantFilter: GrantFilter;
  /** Permission ids the selected role holds. */
  granted: Set<string>;
};

/**
 * Narrow the grouped catalog to what the filters admit, dropping any category
 * left with nothing. Pure, so the hook can memoise it and the components can
 * stay ignorant of how a match is decided.
 *
 * Categories are filtered rather than merely dimmed: a section header claiming
 * "Finance" above an empty body reads as a loading state, and the grant counts
 * shown per section are always taken from the *unfiltered* group so they keep
 * describing the role, not the current search.
 */
export function filterGroups(
  groups: PermissionGroup[],
  { query, grantFilter, granted }: FilterCriteria,
): PermissionGroup[] {
  if (!query && grantFilter === 'all') return groups;

  return groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) => {
        if (!matches(permission, query)) return false;
        if (grantFilter === 'granted') return granted.has(permission.id);
        if (grantFilter === 'available') return !granted.has(permission.id);
        return true;
      }),
    }))
    .filter((group) => group.permissions.length > 0);
}

/** Copy for the permission pane's empty state, told apart by what emptied it. */
export function getPermissionsEmptyState(grantFilter: GrantFilter, isFiltered: boolean) {
  if (!isFiltered) {
    return {
      title: 'No permissions in the catalog',
      description: 'Nothing has been seeded into the permissions table yet.',
    };
  }
  if (grantFilter === 'granted') {
    return {
      title: 'No permissions granted',
      description: 'This role holds none of the permissions matching your search.',
    };
  }
  if (grantFilter === 'available') {
    return {
      title: 'Nothing left to grant',
      description: 'Every permission matching your search is already granted to this role.',
    };
  }
  return {
    title: 'No matching permissions',
    description: 'Try a different search term, or clear the filters to see the full catalog.',
  };
}

/** Copy for the roles list when a search hides every role. */
export const ROLES_EMPTY = {
  title: 'No matching roles',
  description: 'No role name or key matches your search.',
};
