import { searchPublicEvents, getEventFacetCounts, EVENT_PAGE_SIZE } from '@/lib/queries';
import { getQueryClient } from '@/lib/queryClient';
import { toEventFilters, type EventsSearchParams } from './searchParams';
import { eventsKeys } from './eventsQueryKeys';

/**
 * Warms the server's QueryClient with everything the events grid needs for its
 * first paint.
 *
 * This is what keeps a client-fetched grid indexable: the same functions the
 * browser will call are called here first, dehydrated into the RSC payload, and
 * adopted by `useInfiniteQuery` on mount. The visitor gets events in the HTML
 * and a crawler gets a populated page — but every filter, sort and page after
 * that never touches the server again.
 *
 * The two reads are independent, so they run concurrently: the page pays for one
 * round trip, not two. Only page 0 is prefetched; "load more" is by definition
 * an interaction, and prefetching pages nobody asked for would inflate the
 * payload for the majority who never scroll that far.
 *
 * There is no mock fallback. An empty feed and a filter that matches nothing are
 * real states with real empty copy, and substituting fake events for either one
 * means a search for something we don't have returns events that don't exist —
 * with links to detail pages for them.
 *
 * `prefetchQuery`/`prefetchInfiniteQuery` swallow errors by design, so a
 * Supabase outage during SSR does not fail the render: the query is simply
 * absent from the dehydrated cache, and the client refetches it and shows the
 * grid's error state with a retry.
 */
export async function prefetchEventsData(params: EventsSearchParams) {
  const queryClient = getQueryClient();
  const filters = toEventFilters(params);

  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: eventsKeys.search(filters),
      queryFn: () => searchPublicEvents(filters, { offset: 0, limit: EVENT_PAGE_SIZE }),
      initialPageParam: 0,
    }),

    queryClient.prefetchQuery({
      queryKey: eventsKeys.facets(filters),
      queryFn: () => getEventFacetCounts(filters),
    }),
  ]);

  return queryClient;
}
