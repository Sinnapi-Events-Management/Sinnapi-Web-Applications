import { Box } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';
import type { SearchTerm } from '@/hooks/useSearchTerm';

type ApplicationsToolbarProps = {
  search: SearchTerm;
};

/**
 * Search toolbar for the Applications queue. Presentational: it renders the
 * debounced search field and delegates state to the `search` hook the page hook
 * owns. Kept as its own component so future filters have a home alongside it.
 */
export default function ApplicationsToolbar({ search }: ApplicationsToolbarProps) {
  return (
    <Box sx={{ mb: 2, maxWidth: { sm: 420 } }}>
      <SearchField
        value={search.input}
        onChange={search.setInput}
        onClear={search.clear}
        placeholder="Search by business, owner or email…"
        ariaLabel="Search applications"
      />
    </Box>
  );
}
