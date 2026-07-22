'use client';
import { Box, Button, Typography, CircularProgress } from '@sinnapi/ui/atoms';
import { useLoadMoreSentinel } from '@/hooks/useLoadMoreSentinel';

type VendorsLoadMoreProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loaded: number;
  total: number;
  onLoadMore: () => void;
};

/**
 * The bottom of the grid: a real button, with an invisible sentinel above it
 * that usually presses it first.
 *
 * Keeping both is the point. The sentinel makes scrolling feel endless for
 * anyone who scrolls; the button is what keyboard and screen-reader users
 * actually operate, and what everyone falls back to if the observer never fires
 * (short lists, reduced-data modes, a browser without IntersectionObserver).
 *
 * The running "N of M" is a progress cue, not decoration — an infinite grid with
 * no sense of how much is left is how visitors decide to stop scrolling.
 */
export default function VendorsLoadMore({
  hasNextPage,
  isFetchingNextPage,
  loaded,
  total,
  onLoadMore,
}: VendorsLoadMoreProps) {
  // Disabled while a page is in flight, or the observer would queue up several
  // fetches for the same offset as the sentinel sits in view.
  const sentinelRef = useLoadMoreSentinel({
    enabled: hasNextPage && !isFetchingNextPage,
    onIntersect: onLoadMore,
  });

  if (loaded === 0) return null;

  return (
    <Box sx={{ textAlign: 'center', mt: { xs: 4, md: 6 } }}>
      <Box ref={sentinelRef} aria-hidden sx={{ height: 1 }} />

      {/* Only while there's more to come. Once the grid is exhausted this is
          both redundant (the toolbar already states the count) and easy to
          misread against it, since that headline also counts the featured rail. */}
      {hasNextPage && (
        <Typography variant="body2" color="text.secondary" aria-live="polite" sx={{ mb: 2 }}>
          Showing {loaded} of {total} {total === 1 ? 'vendor' : 'vendors'}
        </Typography>
      )}

      {hasNextPage && (
        <Button
          variant="outlined"
          size="large"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
          startIcon={isFetchingNextPage ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more vendors'}
        </Button>
      )}
    </Box>
  );
}
