import { Box, Stack } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';
import type { SearchTerm } from '@/hooks/useSearchTerm';

type Props = {
  search: SearchTerm;
};

/** Search control for the Clients list. Presentational only. */
export default function ClientsToolbar({ search }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <Box sx={{ flex: 1, minWidth: { sm: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by name or email…"
          ariaLabel="Search clients"
        />
      </Box>
    </Stack>
  );
}
