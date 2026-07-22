'use client';
import { useMemo } from 'react';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchPublicEvents, getEventFacetCounts, EVENT_PAGE_SIZE } from '@/lib/queries';
import type { EventSearchFilters } from '@/lib/types';
import { eventsKeys } from '../../../utils/eventsQueryKeys';

/**
 * The events grid's data. Owns every read the browsing experience makes, so the
 * components below it stay declarative.
 *
 * Two queries, deliberately separate:
 *
 *  - the paginated grid, as an infinite query whose cursor is the row offset —
 *    `total` comes back on every page, so "is there more" is a comparison, not a
 *    guess about whether a short page means the end;
 *  - the facet counts, keyed *without* sort, so re-ordering the grid reuses
 *    counts that by definition cannot have changed.
 *
 * `keepPreviousData` on both is what makes filtering feel instant rather than
 * flickery: switching a facet keeps the current results on screen (the caller
 * dims them via `isRefreshing`) instead of unmounting the grid into skeletons
 * and snapping the page height around. First load has no previous data, so it
 * still gets a proper skeleton.
 */
export function useEventsSearch({ filters }: { filters: EventSearchFilters }) {
  const grid = useInfiniteQuery({
    queryKey: eventsKeys.search(filters),
    queryFn: ({ pageParam }) =>
      searchPublicEvents(filters, { offset: pageParam, limit: EVENT_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.offset + lastPage.events.length;
      // A page that came back empty ends the list even if `total` disagrees, so
      // a count that shifts mid-scroll can't spin the sentinel forever.
      if (lastPage.events.length === 0 || loaded >= lastPage.total) return undefined;
      return loaded;
    },
    placeholderData: keepPreviousData,
  });

  const facets = useQuery({
    queryKey: eventsKeys.facets(filters),
    queryFn: () => getEventFacetCounts(filters),
    placeholderData: keepPreviousData,
  });

  const events = useMemo(() => grid.data?.pages.flatMap((page) => page.events) ?? [], [grid.data]);

  return {
    events,
    /** Size of the filtered set, not of this page — drives the "N of M" copy. */
    total: grid.data?.pages[0]?.total ?? 0,
    facetCounts: facets.data,
    /** No data at all yet: render skeletons. */
    isLoading: grid.isPending,
    /** Showing stale results for the previous filters while the new ones land. */
    isRefreshing: grid.isFetching && !grid.isFetchingNextPage && !grid.isPending,
    isError: grid.isError,
    refetch: grid.refetch,
    hasNextPage: grid.hasNextPage,
    isFetchingNextPage: grid.isFetchingNextPage,
    fetchNextPage: grid.fetchNextPage,
  };
}
