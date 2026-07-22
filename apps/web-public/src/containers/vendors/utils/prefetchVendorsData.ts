import {
  listFeaturedVendors,
  searchPublicVendors,
  getVendorFacetCounts,
  VENDOR_PAGE_SIZE,
} from '@/lib/queries';
import { getQueryClient } from '@/lib/queryClient';
import { toVendorFilters, isDefaultView, type VendorsSearchParams } from './searchParams';
import { vendorsKeys } from './vendorsQueryKeys';
import { shuffleFeatured } from './shuffleFeatured';

/** Upper bound on the featured spotlight rail. The rail scrolls; the RPC clamps. */
const FEATURED_LIMIT = 24;

/**
 * Warms the server's QueryClient with everything the vendors grid needs for its
 * first paint, and loads the featured rail.
 *
 * This is what keeps a client-fetched grid indexable: the same functions the
 * browser will call are called here first, dehydrated into the RSC payload, and
 * adopted by `useInfiniteQuery` on mount. The visitor gets vendors in the HTML
 * and a crawler gets a populated page — but every filter, sort and page after
 * that never touches the server again.
 *
 * The three reads are independent, so they run concurrently: the page pays for
 * one round trip, not three. Only page 0 is prefetched; "load more" is by
 * definition an interaction, and prefetching pages nobody asked for would
 * inflate the payload for the majority who never scroll that far.
 *
 * There is no mock fallback. An empty marketplace and a filter that matches
 * nothing are real states with real empty copy, and substituting fake vendors
 * for either one means a search for something we don't carry returns vendors
 * that don't exist.
 */
export async function prefetchVendorsData(params: VendorsSearchParams) {
  const queryClient = getQueryClient();
  const filters = toVendorFilters(params);
  // The rail owns the featured vendors on the default view, so the grid beneath
  // it must not repeat them. Any filter or sort retires the rail — and with it
  // the exclusion, so nothing relevant is hidden.
  const excludeFeatured = isDefaultView(params);

  const [featured] = await Promise.all([
    excludeFeatured ? listFeaturedVendors(FEATURED_LIMIT) : Promise.resolve([]),

    queryClient.prefetchInfiniteQuery({
      queryKey: vendorsKeys.search(filters, excludeFeatured),
      queryFn: () =>
        searchPublicVendors(filters, { offset: 0, excludeFeatured, limit: VENDOR_PAGE_SIZE }),
      initialPageParam: 0,
    }),

    queryClient.prefetchQuery({
      queryKey: vendorsKeys.facets(filters),
      queryFn: () => getVendorFacetCounts(filters),
    }),
  ]);

  return {
    queryClient,
    // Shuffled per rotation window so every paying vendor rotates through the
    // prominent leading positions instead of the same best-rated few.
    featured: shuffleFeatured(featured),
  };
}
