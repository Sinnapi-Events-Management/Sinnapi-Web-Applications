import { Grid, Box, Alert, LoadMoreResults } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import type { PublicEventModel } from '@/lib/types';
import PublicEventCard from '../molecules/PublicEventCard';
import EventCardSkeleton from '../atoms/EventCardSkeleton';
import ResultsSummary from '../molecules/ResultsSummary';

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
  /** Clears every filter from the "no matches" state. */
  onClearFilters: () => void;
};

/** One skeleton row, matching the page size the feed actually fetches. */
const SKELETON_COUNT = 8;

/**
 * Column counts cut against the width the grid actually gets, not the viewport:
 * from `md` up the shell's 256px drawer is permanent, so an `md` screen leaves
 * roughly 650px here — two cards, not three. Four only at `xl`, where a card
 * still clears ~300px and its cover stays a photo rather than a strip.
 */
const GRID_ITEM = { xs: 12, sm: 6, md: 6, lg: 4, xl: 3 } as const;

/**
 * The feed itself, plus the three states around it: first load, error, and no
 * matches.
 *
 * `isRefreshing` dims the current cards rather than replacing them with
 * skeletons. Changing a filter re-queries the server, and swapping a full feed
 * for placeholders on every keystroke makes the page jump and reads as though
 * the results were lost; keeping the stale cards visible and slightly faded
 * says "these are about to change" without the collapse.
 *
 * The dimmed grid is also inert. Cards reflow the moment the new page lands, so
 * a click aimed at one card during that window can land on another — a few
 * hundred milliseconds of not-clickable is a smaller cost than an expression of
 * interest sent on the wrong brief. `ResultsSummary` states the refresh in
 * words at the same time, so the dimming is never the only explanation.
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
  onClearFilters,
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
        ctaLabel="Clear all filters"
        onCta={onClearFilters}
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
      <ResultsSummary total={total} isRefreshing={isRefreshing} isFiltered={isFiltered} />

      <Box
        sx={{
          opacity: isRefreshing ? 0.5 : 1,
          pointerEvents: isRefreshing ? 'none' : 'auto',
          transition: 'opacity .15s ease',
        }}
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

      <LoadMoreResults
        hasMore={hasMore}
        isLoading={isLoadingMore}
        loaded={events.length}
        total={total}
        onLoadMore={onLoadMore}
        noun="event"
      />
    </>
  );
}
