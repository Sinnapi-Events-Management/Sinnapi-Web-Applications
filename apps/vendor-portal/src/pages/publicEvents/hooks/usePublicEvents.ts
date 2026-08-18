import { useMemo } from 'react';
import { usePublicEventSearch, usePublicEventFacetCounts, useMyInterests } from '@/hooks/queries';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { EventSearchFilters } from '@/lib/types';
import { useEventFilters } from './useEventFilters';
import { useEventTypeFacetOptions } from './useEventTypeFacetOptions';
import { LOCATION_OPTIONS } from '../schema/filters';

/** The curated towns the facet counts are computed over — see `count_event_facets_public`. */
const LOCATION_TOKENS = LOCATION_OPTIONS.map((option) => option.value);

/**
 * How long a facet change waits before it reaches the server.
 *
 * Short by design, and applied to the *request* rather than the control: a
 * dropdown or a removed chip updates the URL and the toolbar instantly, so
 * nothing about the page feels delayed. What the window buys is coalescing a
 * burst — clearing three chips in a row, or setting an occasion and a date band
 * together — into one feed query and one facet-count query instead of six.
 *
 * It matters more here than on the vendor grid: this toolbar carries six
 * controls, so multi-filter bursts are the normal way it gets used.
 */
const FILTER_DEBOUNCE_MS = 200;

/**
 * The public-events feed's data and state, composed from the hooks that each
 * own one concern: the debounced search term, the URL-mirrored facets, the
 * paginated feed, the facet counts, and this vendor's existing interests.
 *
 * A thin coordinator by design — its only real work is shaping the filter
 * object the feed and the counts share, so the two can never be looking at
 * different filters.
 */
export function usePublicEvents(vendorId: string) {
  const search = useSearchTerm();
  // The occasion vocabulary is fetched, so it has to reach the filter hook
  // (which validates the URL against it) and the toolbar (which renders it).
  const typeOptions = useEventTypeFacetOptions();
  const filters = useEventFilters(typeOptions);

  // The two debounces are applied separately, then combined — stacking them
  // would make a search wait out both windows for no reason. `search.query` is
  // already debounced by `useSearchTerm`; only the facets are delayed here.
  const debouncedFilters = useDebouncedValue(filters.query, FILTER_DEBOUNCE_MS);

  const query = useMemo<EventSearchFilters>(
    () => ({ q: search.query, ...debouncedFilters }),
    [search.query, debouncedFilters],
  );

  const feed = usePublicEventSearch(query);
  const facets = usePublicEventFacetCounts(query, LOCATION_TOKENS);
  const interests = useMyInterests(vendorId);

  const events = useMemo(() => feed.data?.pages.flatMap((page) => page.events) ?? [], [feed.data]);

  const interestedIds = useMemo(
    () => new Set((interests.data ?? []).map((interest) => interest.event_id)),
    [interests.data],
  );

  return {
    search,
    filters,
    /** Occasions for the facet dropdown and the active-filter chips. */
    typeOptions,
    facetCounts: facets.data,
    events,
    interestedIds,
    // Size of the filtered set, not of this page — drives the "N of M" copy.
    total: feed.data?.pages[0]?.total ?? 0,
    error: feed.error,
    /** No page at all yet: render skeletons rather than an empty feed. */
    isLoading: feed.isPending,
    /**
     * Holding the previous filters' cards while the new ones land. Open debounce
     * windows count: the results on screen are already stale the moment a key is
     * pressed, and saying so then — rather than 300ms later when the request
     * finally leaves — is what keeps the feed from looking frozen mid-type.
     */
    isRefreshing:
      search.isPending ||
      filters.query !== debouncedFilters ||
      (feed.isFetching && !feed.isFetchingNextPage && !feed.isPending),
    hasMore: feed.hasNextPage,
    isLoadingMore: feed.isFetchingNextPage,
    loadMore: feed.fetchNextPage,
    /** Distinguishes "no public events" from "none match your filters". */
    isFiltered: Boolean(search.query) || filters.isActive,
  };
}
