import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import EventTips from '@/components/organisms/eventTips';
import EventsHero from './organisms/eventsHero';
import EventsBrowser from './organisms/eventsBrowser';
import { parseEventsSearchParams, type EventsSearchParams } from './utils/searchParams';
import { prefetchEventsData } from './utils/prefetchEventsData';

/**
 * Events page. Sequences the experience — search-led hero → toolbar → results
 * grid → tips → CTA — and nothing else.
 *
 * The data is deliberately split across the server/client boundary rather than
 * living on either side of it. The server resolves the *first* view of the grid
 * and dehydrates it into the payload, so the page ships with real events in its
 * HTML (indexable, no loading state, LCP unblocked by JS). From mount onward
 * `EventsBrowser` owns it: searching, filtering, sorting and paging are TanStack
 * Query cache reads or single Supabase RPC calls, with no navigation and no
 * server round trip.
 *
 * This replaces a page that fetched 24 rows and narrowed them in JavaScript —
 * which meant search and every facet only ever looked at those 24, and the
 * headline count described the fetch rather than the feed.
 */
export default async function EventsContainer({
  searchParams,
}: {
  searchParams: EventsSearchParams;
}) {
  // Normalised once, here: an unrecognised facet from a stale link must not
  // reach the prefetch, or the server and the client would resolve different
  // query keys and the hydrated page would silently refetch everything.
  const params = parseEventsSearchParams(searchParams);
  const queryClient = await prefetchEventsData(params);

  return (
    <>
      <EventsHero />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventsBrowser />
      </HydrationBoundary>
      <EventTips />
      <MarketplaceCta
        title="Find the right vendors for your event"
        subtitle="Browse verified, vetted providers for every part of your event — or join Sinnapi as a vendor and reach clients planning theirs."
        primary={{ label: 'Browse vendors', href: '/vendors' }}
        secondary={{ label: 'Become a vendor', href: '/apply' }}
      />
    </>
  );
}
