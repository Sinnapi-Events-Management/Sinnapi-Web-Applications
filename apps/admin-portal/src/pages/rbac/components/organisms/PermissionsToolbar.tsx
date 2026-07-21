import { Stack, Box, Typography, Button } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';
import type { GrantFilter } from '../../schema';
import type { PermissionSearchState } from '../../hooks/useRolePermissions';
import GrantFilterChips from '../molecules/GrantFilterChips';

type Props = {
  search: PermissionSearchState;
  grantFilter: GrantFilter;
  onGrantFilterChange: (next: GrantFilter) => void;
  /** Permissions surviving the filters. */
  visibleCount: number;
  isFiltered: boolean;
  onClearFilters: () => void;
};

/**
 * Search, grant filter and result count for the permission pane.
 *
 * The search takes its own row and the chips share the next with the count: the
 * pane is only half the workspace on desktop and the whole of a drawer on
 * mobile, and one line could not hold all three at either width.
 */
export default function PermissionsToolbar({
  search,
  grantFilter,
  onGrantFilterChange,
  visibleCount,
  isFiltered,
  onClearFilters,
}: Props) {
  return (
    <Stack spacing={1.25}>
      <SearchField
        value={search.input}
        onChange={search.setInput}
        onClear={search.clear}
        placeholder="Search permission key or description…"
        ariaLabel="Search permissions"
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <GrantFilterChips value={grantFilter} onChange={onGrantFilterChange} />
        </Box>
        {isFiltered && (
          <Button size="small" color="inherit" onClick={onClearFilters}>
            Clear
          </Button>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {visibleCount} shown
        </Typography>
      </Stack>
    </Stack>
  );
}
