'use client';
import { Box, Stack, Typography, Button, Skeleton } from '@sinnapi/ui/atoms';
import { Tune, Close } from '@mui/icons-material';

type ToolbarSummaryProps = {
  loaded: number;
  total: number;
  activeFilters: number;
  isLoading: boolean;
  onClear: () => void;
};

/**
 * The toolbar's heading row: what the visitor is looking at, and the escape
 * hatch out of it.
 *
 * The two readings are deliberately different. Unfiltered, there's nothing to
 * compare against, so it states the size of the feed. Filtered, it reports how
 * much of the matching set is on screen — the honest reading for an
 * infinitely-scrolling grid, where "24 of 112" tells you both that your filter
 * matched a lot and that you haven't seen it all yet.
 *
 * Renders a skeleton rather than "0 events" on first load: a real zero is
 * meaningful ("nothing matches") and must not be confused with "not counted yet".
 */
export default function ToolbarSummary({
  loaded,
  total,
  activeFilters,
  isLoading,
  onClear,
}: ToolbarSummaryProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={1}
      sx={{ mb: 2 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Tune fontSize="small" color="primary" />
        <Typography variant="subtitle1" fontWeight={700}>
          Filter events
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {isLoading ? (
            <Skeleton variant="text" width={110} />
          ) : activeFilters > 0 ? (
            <>
              Showing{' '}
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                {loaded}
              </Box>{' '}
              of {total} {total === 1 ? 'match' : 'matches'}
            </>
          ) : (
            <>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
                {total}
              </Box>{' '}
              {total === 1 ? 'event' : 'events'}
            </>
          )}
        </Typography>

        {activeFilters > 0 && (
          <Button
            size="small"
            startIcon={<Close sx={{ fontSize: 16 }} />}
            onClick={onClear}
            sx={{ fontWeight: 600 }}
          >
            Clear
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
