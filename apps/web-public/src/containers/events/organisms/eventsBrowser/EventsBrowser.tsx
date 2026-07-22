'use client';
import { Container } from '@sinnapi/ui/atoms';
import EventsToolbar from '../eventsToolbar';
import EventsResults from '../eventsResults';
import { useEventsFilters } from '../../hooks/useEventsFilters';
import { RESULTS_ANCHOR_ID } from '../../hooks/useEventsSearchInput';
import { useEventsSearch } from './hooks/useEventsSearch';
import EventsLoadMore from './molecules/EventsLoadMore';

/**
 * The interactive half of the events page: toolbar, grid, paging.
 *
 * It takes no props. Every piece of state it needs is in the URL, which the
 * hero's search box writes to as well — so this and the hero stay in sync
 * without a shared parent, a context or a store between them.
 *
 * All it does is wire the two hooks together and hand the results down: filter
 * state from `useEventsFilters`, data from `useEventsSearch`, presentation to
 * the toolbar and the grid. There is no business logic in this file on purpose —
 * if something here starts making a decision, it belongs in a hook.
 */
export default function EventsBrowser() {
  const { filters, activeFilters, clearAll } = useEventsFilters();

  const {
    events,
    total,
    facetCounts,
    isLoading,
    isRefreshing,
    isError,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useEventsSearch({ filters });

  return (
    <Container id={RESULTS_ANCHOR_ID} sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 24 }}>
      <EventsToolbar
        loaded={events.length}
        total={total}
        facetCounts={facetCounts}
        isLoading={isLoading}
      />

      <EventsResults
        events={events}
        activeFilters={activeFilters}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        isError={isError}
        // Wrapped, not passed through: both are click handlers downstream, and
        // TanStack reads its first argument as an options bag — handing it a
        // React event would silently apply whatever properties happen to collide.
        onRetry={() => refetch()}
        onClear={clearAll}
      />

      <EventsLoadMore
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loaded={events.length}
        total={total}
        onLoadMore={() => fetchNextPage()}
      />
    </Container>
  );
}
