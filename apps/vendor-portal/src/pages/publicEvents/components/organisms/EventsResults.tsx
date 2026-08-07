import { Grid, Box, Alert } from '@sinnapi/ui';
import type { PublicEventModel } from '@/lib/types';
import PublicEventCard from '../molecules/PublicEventCard';
import EventCardSkeleton from '../atoms/EventCardSkeleton';
import LoadMoreEvents from '../molecules/LoadMoreEvents';
import { EmptyState } from '@sinnapi/ui/router';

type EventsResultsProps = {
  events: PublicEventModel[];
  vendorId: string;
  interestedIds: Set<string>;
  total: number;
  error: unknown;
  isLoading: boolean;
  isRefreshing: boolean;
  isFiltered: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

/** One skeleton row, matching the page size the feed actually fetches. */
const SKELETON_COUNT = 8;

const GRID_ITEM = { xs: 12, sm: 6, md: 4 } as const;

/**
 * The feed itself, plus the three states around it: first load, error, and no
 * matches.
 *
 * `isRefreshing` dims the current cards rather than replacing them with
 * skeletons. Changing a filter re-queries the server, and swapping a full feed
 * for placeholders on every keystroke makes the page jump and reads as though
 * the results were lost; keeping the stale cards visible and slightly faded
 * says "these are about to change" without the collapse.
 */
export default function EventsResults({
  events,
  vendorId,
  interestedIds,
  total,
  error,
  isLoading,
  isRefreshing,
  isFiltered,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: EventsResultsProps) {
  if (error) {
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Could not load events.'}
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
          <Grid item {...GRID_ITEM} key={index}>
            <EventCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (events.length === 0) {
    return isFiltered ? (
      <EmptyState
        title="No events match those filters"
        description="Try a different search term, or widen the occasion, location or date filters."
      />
    ) : (
      <EmptyState
        title="No public events"
        description="Open events posted by clients and admins appear here."
      />
    );
  }

  return (
    <>
      <Box
        sx={{ opacity: isRefreshing ? 0.55 : 1, transition: 'opacity .15s ease' }}
        aria-busy={isRefreshing}
      >
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item {...GRID_ITEM} key={event.id}>
              <PublicEventCard
                event={event}
                vendorId={vendorId}
                interested={interestedIds.has(event.id)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      <LoadMoreEvents
        hasMore={hasMore}
        isLoading={isLoadingMore}
        loaded={events.length}
        total={total}
        onLoadMore={onLoadMore}
      />
    </>
  );
}
