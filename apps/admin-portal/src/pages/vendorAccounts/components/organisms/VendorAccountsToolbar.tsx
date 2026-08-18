import { Box, Stack, SearchField } from '@sinnapi/ui';
import type { SearchTerm } from '@/hooks/useSearchTerm';

type Props = {
  search: SearchTerm;
};

/** Search control for the vendor accounts list. Presentational only. */
export default function VendorAccountsToolbar({ search }: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
      <Box sx={{ flex: 1, minWidth: { sm: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by name, email, phone or business…"
          ariaLabel="Search vendor accounts"
        />
      </Box>
    </Stack>
  );
}
