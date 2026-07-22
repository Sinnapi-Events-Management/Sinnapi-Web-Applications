'use client';
import { Box } from '@sinnapi/ui/atoms';
import type { EventCardModel } from '@/lib/types';
import { EVENT_PAGE_SIZE } from '@/lib/queries';
import { EventsGrid, EventsGridSkeleton } from './molecules/EventsGrid';
import { EventsEmpty, EventsError } from './molecules/EventsFallback';

type EventsResultsProps = {
  events: EventCardModel[];
  activeFilters: number;
  isLoading: boolean;
  /** Stale results are on screen while the new filters resolve. */
  isRefreshing: boolean;
  isError: boolean;
  onRetry: () => void;
  onClear: () => void;
};

/**
 * Picks the grid's state — skeletons, error, empty, or results — and nothing
 * else. Each branch lives in its own component so this stays a readable
 * decision, and the branch order matters: an error must win over "empty", or a
 * failed request reads to the visitor as a feed with no events in it.
 *
 * While refreshing, the previous results stay mounted and dim rather than
 * unmounting into skeletons. Pointer events are suppressed for the moment it
 * takes, so a click can't land on a card that's about to be replaced by a
 * different one under the same cursor.
 */
export default function EventsResults({
  events,
  activeFilters,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
  onClear,
}: EventsResultsProps) {
  if (isLoading) return <EventsGridSkeleton count={EVENT_PAGE_SIZE} />;
  if (isError && events.length === 0) return <EventsError onRetry={onRetry} />;
  if (events.length === 0) return <EventsEmpty activeFilters={activeFilters} onClear={onClear} />;

  return (
    <Box
      aria-busy={isRefreshing}
      sx={{
        transition: 'opacity .15s ease',
        opacity: isRefreshing ? 0.55 : 1,
        pointerEvents: isRefreshing ? 'none' : 'auto',
      }}
    >
      <EventsGrid events={events} />
    </Box>
  );
}
