import { Box, Button, Typography, CircularProgress } from '@sinnapi/ui';

type LoadMoreVendorsProps = {
  hasMore: boolean;
  isLoading: boolean;
  loaded: number;
  total: number;
  onLoadMore: () => void;
};

/**
 * The foot of the grid: how much of the result set is on screen, and the button
 * that fetches the next page.
 *
 * The running "N of M" is a progress cue, not decoration — a grid that grows by
 * eight with no sense of how much is left gives a client no way to decide
 * between paging on and narrowing their filters. It stays visible once the list
 * is exhausted, where it becomes the answer to "is that all of them?".
 *
 * `aria-live="polite"` announces the new count after each page, so the fetch
 * isn't a silent event for anyone not watching the grid reflow.
 */
export default function LoadMoreVendors({
  hasMore,
  isLoading,
  loaded,
  total,
  onLoadMore,
}: LoadMoreVendorsProps) {
  if (loaded === 0) return null;

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 2 }}>
        Showing {loaded} of {total} {total === 1 ? 'vendor' : 'vendors'}
      </Typography>

      {hasMore && (
        <Button
          variant="outlined"
          onClick={onLoadMore}
          // Disabled while a page is in flight, or an impatient double press
          // queues two fetches for the same offset.
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {isLoading ? 'Loading…' : 'View more'}
        </Button>
      )}
    </Box>
  );
}
