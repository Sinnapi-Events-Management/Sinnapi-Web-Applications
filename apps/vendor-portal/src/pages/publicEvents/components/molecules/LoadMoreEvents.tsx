import { Box, Button, Typography, CircularProgress } from '@sinnapi/ui';

type LoadMoreEventsProps = {
  hasMore: boolean;
  isLoading: boolean;
  loaded: number;
  total: number;
  onLoadMore: () => void;
};

/**
 * The foot of the feed: how much of the result set is on screen, and the button
 * that fetches the next page.
 *
 * The running "N of M" is a progress cue, not decoration — a feed that grows by
 * eight with no sense of how much is left gives a vendor no way to decide
 * between paging on and narrowing their filters. It stays visible once the list
 * is exhausted, where it becomes the answer to "is that all of them?".
 *
 * `aria-live="polite"` announces the new count after each page, so the fetch
 * isn't a silent event for anyone not watching the feed reflow.
 */
export default function LoadMoreEvents({
  hasMore,
  isLoading,
  loaded,
  total,
  onLoadMore,
}: LoadMoreEventsProps) {
  if (loaded === 0) return null;

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 2 }}>
        Showing {loaded} of {total} {total === 1 ? 'event' : 'events'}
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
