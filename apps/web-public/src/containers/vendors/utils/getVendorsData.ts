import { getVendors, getFeaturedVendors } from '@/lib/queries';
import { MOCK_VENDORS } from '../data/mockVendors';
import {
  filterVendors,
  countActiveFilters,
  type VendorListItem,
  type VendorsSearchParams,
} from './filterVendors';
import { RATING_FLOORS } from './options';
import { shuffleFeatured } from './shuffleFeatured';

/** Upper bound on featured vendors fetched for the spotlight rail (it scrolls). */
const FEATURED_FETCH_LIMIT = 50;

/**
 * Resolves the vendors grid for the current URL. Pulls live, public vendors;
 * while the table is empty (development) it falls back to the mock dataset so
 * the page is always populated. Search + facet narrowing is applied in-memory
 * via `filterVendors`, so the same code path serves live and mock data.
 *
 * On the default (unfiltered) view we surface every paid/featured vendor
 * (`is_featured`) in a scrollable spotlight and remove them from the main grid
 * to avoid duplication. Featured vendors come from a dedicated query
 * (`getFeaturedVendors`) so the rail isn't capped by the grid's page size — it
 * scales past any number of paid vendors. The spotlight order is shuffled (see
 * `shuffleFeatured`) so every paying vendor rotates through prominent positions
 * rather than the same best-rated few always leading. As soon as the user
 * searches or filters, the spotlight is dropped and every match — featured or
 * not — flows into the grid so nothing relevant is hidden.
 *
 * Returns the `featured` spotlight list, the grid `vendors`, the unfiltered
 * `total` (for "N of M" copy), and the count of active filters (drives the
 * empty-state + "clear" affordances).
 */
export async function getVendorsData(searchParams: VendorsSearchParams) {
  const live = await getVendors({
    q: searchParams.q,
    category: searchParams.category,
    region: searchParams.region,
    minRating: searchParams.rating ? RATING_FLOORS[searchParams.rating] : undefined,
  });
  const usingMock = live.length === 0;
  const all: VendorListItem[] = usingMock ? MOCK_VENDORS : live;
  const activeFilters = countActiveFilters(searchParams);
  const filtered = filterVendors(all, searchParams);

  // Featured spotlight only on the default view; otherwise results stay focused.
  let featured: VendorListItem[] = [];
  let vendors = filtered;
  if (activeFilters === 0) {
    // Dedicated query for the rail (mock fallback while the table is empty), so
    // it isn't truncated by the grid's fetch size.
    const featuredPool: VendorListItem[] = usingMock
      ? MOCK_VENDORS.filter((vendor) => vendor.is_featured)
      : await getFeaturedVendors(FEATURED_FETCH_LIMIT);
    featured = shuffleFeatured(featuredPool);
    const featuredIds = new Set(featured.map((vendor) => vendor.id));
    vendors = filtered.filter((vendor) => !featuredIds.has(vendor.id));
  }

  return {
    featured,
    vendors,
    total: all.length,
    activeFilters,
  };
}
