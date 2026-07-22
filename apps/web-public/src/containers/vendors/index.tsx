import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import VendorsHero from './organisms/vendorsHero';
import VendorsFeatured from './organisms/vendorsFeatured';
import VendorsBrowser from './organisms/vendorsBrowser';
import { parseVendorsSearchParams, type VendorsSearchParams } from './utils/searchParams';
import { prefetchVendorsData } from './utils/prefetchVendorsData';

/**
 * Vendors page. Sequences the experience — search-led hero → featured spotlight
 * → toolbar → results grid — and nothing else.
 *
 * The data is deliberately split across the server/client boundary rather than
 * living on either side of it. The server resolves the *first* view of the grid
 * and dehydrates it into the payload, so the page ships with real vendors in its
 * HTML (indexable, no loading state, LCP unblocked by JS). From mount onward
 * `VendorsBrowser` owns it: searching, filtering, sorting and paging are
 * TanStack Query cache reads or single Supabase RPC calls, with no navigation
 * and no server round trip.
 *
 * The featured rail is server-rendered here and passed *down* as a slot, so it
 * keeps that treatment while the client still decides whether the current view
 * should show it.
 */
export default async function VendorsContainer({
  searchParams,
}: {
  searchParams: VendorsSearchParams;
}) {
  // Normalised once, here: an unrecognised facet from a stale link must not
  // reach the prefetch, or the server and the client would resolve different
  // query keys and the hydrated page would silently refetch everything.
  const params = parseVendorsSearchParams(searchParams);
  const { queryClient, featured } = await prefetchVendorsData(params);

  return (
    <>
      <VendorsHero />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <VendorsBrowser
          featuredCount={featured.length}
          featuredSlot={featured.length > 0 ? <VendorsFeatured vendors={featured} /> : null}
        />
      </HydrationBoundary>
      <MarketplaceCta
        title="Bring your whole event together"
        subtitle="You've found the vendors — now explore real events and inspiration to picture how it all comes together. Or, if you're a provider, join Sinnapi and get booked by clients searching right now."
        primary={{ label: 'Explore events', href: '/events' }}
        secondary={{ label: 'Become a vendor', href: '/apply' }}
      />
    </>
  );
}
