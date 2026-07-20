import { Stack, Box, Typography } from '@sinnapi/ui';
import SearchField from '@/components/ui/SearchField';

type Props = {
  search: { input: string; setInput: (v: string) => void; clear: () => void };
  /** Number of flags currently visible (post filter + search). */
  resultCount: number;
};

/**
 * Search + result-count row for the queue. Presentational: search state is owned
 * by the page's hook. Collapses to a single column on narrow screens.
 */
export default function ModerationToolbar({ search, resultCount }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      sx={{ mb: 2 }}
    >
      <Box sx={{ flex: 1, minWidth: { sm: 240 } }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search message text or reason…"
          ariaLabel="Search flagged messages"
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </Typography>
    </Stack>
  );
}
