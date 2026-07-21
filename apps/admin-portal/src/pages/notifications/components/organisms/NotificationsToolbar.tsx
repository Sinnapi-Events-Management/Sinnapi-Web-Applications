import { Stack, Box, Typography } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';
import DomainFilterChips from '../molecules/DomainFilterChips';
import type { DomainFilter, SearchState } from '../../hooks/useNotifications';

type Props = {
  search: SearchState;
  domainFilter: DomainFilter;
  /** Domain keys present in the loaded feed. */
  availableDomains: Set<string>;
  /** Notifications currently visible (post tab + domain + search). */
  resultCount: number;
};

/**
 * Search, domain chips and the result count for the master column.
 * Presentational: every piece of filter state is owned by the page's hook.
 *
 * The search input takes its own row and fills the column — the master pane is
 * only ~440px wide, so pairing it with a nowrap count on one line leaves neither
 * enough room. The count rides with the chips, where it can wrap.
 */
export default function NotificationsToolbar({
  search,
  domainFilter,
  availableDomains,
  resultCount,
}: Props) {
  return (
    <Stack spacing={1.25}>
      <SearchField
        value={search.input}
        onChange={search.setInput}
        onClear={search.clear}
        placeholder="Search title, detail or trigger…"
        ariaLabel="Search notifications"
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DomainFilterChips filter={domainFilter} available={availableDomains} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {resultCount} shown
        </Typography>
      </Stack>
    </Stack>
  );
}
