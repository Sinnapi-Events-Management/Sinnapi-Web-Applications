import { Stack, Box, Typography } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';
import TypeFilterChips from '../molecules/TypeFilterChips';
import type { SearchState, TypeFilter } from '../../hooks/useMessages';

type Props = {
  search: SearchState;
  typeFilter: TypeFilter;
  /** Number of conversations currently visible (post tab + type + search). */
  resultCount: number;
};

/**
 * Search, type chips and the result count for the master column. Presentational:
 * every piece of filter state is owned by the page's hook.
 *
 * The search input owns its own row and fills the column: the master pane is
 * only ~440px wide, so pairing the input with a nowrap count on one line left
 * neither enough room. The count rides with the chips instead, where it can
 * wrap.
 */
export default function InboxToolbar({ search, typeFilter, resultCount }: Props) {
  return (
    <Stack spacing={1.25}>
      <SearchField
        value={search.input}
        onChange={search.setInput}
        onClear={search.clear}
        placeholder="Search name, subject or message…"
        ariaLabel="Search conversations"
      />
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ flexWrap: 'wrap', rowGap: 0.75 }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TypeFilterChips filter={typeFilter} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {resultCount} {resultCount === 1 ? 'conversation' : 'conversations'}
        </Typography>
      </Stack>
    </Stack>
  );
}
