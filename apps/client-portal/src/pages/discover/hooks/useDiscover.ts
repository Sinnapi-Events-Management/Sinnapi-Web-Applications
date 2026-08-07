import { useMemo } from 'react';
import { useVendorSearch, useVendorFacetCounts, useFilterRefData } from '@/hooks/queries';
import { useSearchTerm } from '@/hooks/useSearchTerm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { VendorSearchFilters } from '@/lib/types';
import { useVendorFilters } from './useVendorFilters';
import type { FilterOption } from '../schema/filters';

/**
 * How long a facet change waits before it reaches the server.
 *
 * Short by design, and applied to the *request* rather than the control: a
 * dropdown or a removed chip updates the URL and the toolbar instantly, so
 * nothing about the page feels delayed. What the window buys is coalescing a
 * burst — clearing three chips in a row, or setting a category and a price band
 * together — into one grid query and one facet-count query instead of six.
 *
 * A single, unhurried change is unaffected: the request is already in flight
 * before the client's hand leaves the mouse.
 */
const FILTER_DEBOUNCE_MS = 200;

/**
 * Discover's data and state, composed from the smaller hooks that each own one
 * concern: the debounced search term, the URL-mirrored facets, and the three
 * reads (grid page, facet counts, dropdown options).
 *
 * This stays a thin coordinator — its only real work is shaping the filter
 * object both queries share, so the grid and the counts can never be looking at
 * different filters.
 */
export function useDiscover() {
  const search = useSearchTerm();

  const refData = useFilterRefData();
  const categories = useMemo<FilterOption[]>(
    () => (refData.data?.categories ?? []).map((row) => ({ value: row.key, label: row.name })),
    [refData.data],
  );
  const regions = useMemo<FilterOption[]>(
    () => (refData.data?.regions ?? []).map((row) => ({ value: row.key, label: row.name })),
    [refData.data],
  );

  // Both lists are memoised above, so the filter hook's derived state — and the
  // query key built from it — stay stable between renders.
  const filters = useVendorFilters({ category: categories, region: regions });

  // The two debounces are applied separately, then combined — stacking them
  // would make a search wait out both windows for no reason. `search.query` is
  // already debounced by `useSearchTerm`; only the facets are delayed here.
  const debouncedFilters = useDebouncedValue(filters.query, FILTER_DEBOUNCE_MS);

  const query = useMemo<VendorSearchFilters>(
    () => ({ q: search.query, ...debouncedFilters }),
    [search.query, debouncedFilters],
  );

  const grid = useVendorSearch(query);
  const facets = useVendorFacetCounts(query);

  const vendors = useMemo(
    () => grid.data?.pages.flatMap((page) => page.vendors) ?? [],
    [grid.data],
  );

  // Size of the filtered set, not of this page — drives the "N of M" copy.
  const total = grid.data?.pages[0]?.total ?? 0;

  return {
    search,
    filters,
    options: { categories, regions },
    facetCounts: facets.data,
    vendors,
    total,
    error: grid.error,
    /** No page at all yet: render skeletons rather than an empty grid. */
    isLoading: grid.isPending,
    /**
     * Holding the previous filters' cards while the new ones land. Open debounce
     * windows count: the results on screen are already stale the moment a key is
     * pressed, and saying so then — rather than 300ms later when the request
     * finally leaves — is what keeps the grid from looking frozen mid-type.
     */
    isRefreshing:
      search.isPending ||
      filters.query !== debouncedFilters ||
      (grid.isFetching && !grid.isFetchingNextPage && !grid.isPending),
    hasMore: grid.hasNextPage,
    isLoadingMore: grid.isFetchingNextPage,
    loadMore: grid.fetchNextPage,
    /** Distinguishes "no vendors listed" from "none match your filters". */
    isFiltered: Boolean(search.query) || filters.isActive,
  };
}
