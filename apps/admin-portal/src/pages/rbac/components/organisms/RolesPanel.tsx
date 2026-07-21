import { Stack, Alert, Typography } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';
import EmptyState from '@/components/ui/EmptyState';
import type { RoleModel } from '@/lib/types';
import { ROLES_EMPTY } from '../../schema';
import type { RoleSearchState } from '../../hooks/useRbac';
import RoleListItem from '../molecules/RoleListItem';
import RoleListItemSkeleton from '../molecules/RoleListItemSkeleton';

type Props = {
  roles: RoleModel[];
  totalPermissions: number;
  isLoading: boolean;
  error: unknown;
  /** True when the search, not an empty table, emptied the list. */
  isFiltered: boolean;
  search: RoleSearchState;
  isSelected: (id: string) => boolean;
  onSelect: (role: RoleModel) => void;
};

/**
 * The master column: search over the roles plus the selectable role cards, with
 * its own loading / error / empty states. Presentational — selection and the
 * search term are owned by the page's hook.
 */
export default function RolesPanel({
  roles,
  totalPermissions,
  isLoading,
  error,
  isFiltered,
  search,
  isSelected,
  onSelect,
}: Props) {
  return (
    <Stack spacing={1.5}>
      <SearchField
        value={search.input}
        onChange={search.setInput}
        onClear={search.clear}
        placeholder="Search roles…"
        ariaLabel="Search roles"
      />

      {isLoading ? (
        <Stack spacing={1.25}>
          {Array.from({ length: 5 }).map((_, i) => (
            <RoleListItemSkeleton key={i} />
          ))}
        </Stack>
      ) : error ? (
        <Alert severity="error">
          {error instanceof Error ? error.message : 'Could not load roles.'}
        </Alert>
      ) : roles.length === 0 ? (
        <EmptyState
          title={isFiltered ? ROLES_EMPTY.title : 'No roles yet'}
          description={
            isFiltered ? ROLES_EMPTY.description : 'No roles have been created on the platform.'
          }
        />
      ) : (
        <>
          <Typography variant="caption" color="text.secondary">
            {roles.length} {roles.length === 1 ? 'role' : 'roles'}
          </Typography>
          <Stack spacing={1.25}>
            {roles.map((role) => (
              <RoleListItem
                key={role.id}
                role={role}
                totalPermissions={totalPermissions}
                selected={isSelected(role.id)}
                onSelect={onSelect}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
