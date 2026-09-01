'use client';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

export type LoadMoreResultsProps = {
  hasMore: boolean;
  isLoading: boolean;
  loaded: number;
  total: number;
  onLoadMore: () => void;
  /** Singular noun for the count line, e.g. "event". */
  noun?: string;
  /** Plural, when it isn't simply `${noun}s`. */
  nounPlural?: string;
  /** Copy for the button. */
  moreLabel?: string;
};

/**
 * The foot of a paged list: how much of the result set is on screen, and the
 * button that fetches the next page.
 *
 * The running "N of M" is a progress cue, not decoration — a list that grows by
 * eight with no sense of how much is left gives no way to decide between paging
 * on and narrowing the filters. It stays visible once the list is exhausted,
 * where it becomes the answer to "is that all of them?".
 *
 * `aria-live="polite"` announces the new count after each page, so the fetch
 * isn't a silent event for anyone not watching the list reflow.
 */
export function LoadMoreResults({
  hasMore,
  isLoading,
  loaded,
  total,
  onLoadMore,
  noun = 'result',
  nounPlural,
  moreLabel = 'View more',
}: LoadMoreResultsProps) {
  if (loaded === 0) return null;

  const plural = nounPlural ?? `${noun}s`;

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 2 }}>
        Showing {loaded} of {total} {total === 1 ? noun : plural}
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
          {isLoading ? 'Loading…' : moreLabel}
        </Button>
      )}
    </Box>
  );
}
