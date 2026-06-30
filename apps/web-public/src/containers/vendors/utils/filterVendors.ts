import type { VendorCardModel } from '@/lib/types';
import { PRICE_RANGES, RATING_FLOORS } from './options';

/**
 * A vendor row enriched with the facet fields the public card model doesn't
 * carry (category + service regions live in join tables server-side). Mock rows
 * always set them; live `VendorCardModel` rows leave them undefined, in which
 * case the category/region facets are deferred to the server query rather than
 * applied in-memory — see `filterVendors`.
 */
export type VendorListItem = VendorCardModel & {
  category?: string;
  regions?: string[];
};

/** Query-string shape the vendors page reads/writes (server-side, URL-driven). */
export type VendorsSearchParams = {
  q?: string;
  category?: string;
  region?: string;
  price?: string;
  rating?: string;
};

/** The facet keys a user can narrow by — used to count/label active filters. */
const FACET_KEYS = ['category', 'region', 'price', 'rating'] as const;

/** True when the vendor's starting price falls within the selected [lo, hi] band. */
function matchesPrice(vendor: VendorListItem, [lo, hi]: [number, number]): boolean {
  const price = vendor.starting_price;
  if (price == null) return false; // unpriced → excluded once a band is chosen
  return price >= lo && price <= hi;
}

/**
 * Pure, server-side filtering for the vendors listing. Runs in-memory so it
 * works identically over live rows or the mock dataset. Search matches business
 * name, biography and base city; facets narrow by category, region, price band
 * and minimum rating.
 *
 * Category and region are presence-guarded: when a row carries the field (mock
 * data) it is filtered locally; when it doesn't (live rows, where those values
 * come from join tables) the facet is trusted to the server query, so live
 * results are never silently dropped.
 */
export function filterVendors(
  vendors: VendorListItem[],
  params: VendorsSearchParams,
): VendorListItem[] {
  const q = params.q?.trim().toLowerCase();
  const priceRange = params.price ? PRICE_RANGES[params.price] : undefined;
  const ratingFloor = params.rating ? RATING_FLOORS[params.rating] : undefined;

  return vendors.filter((vendor) => {
    if (q) {
      const haystack = [vendor.business_name, vendor.biography, vendor.base_city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (params.category && vendor.category && vendor.category !== params.category) return false;
    if (params.region && vendor.regions && !vendor.regions.includes(params.region)) return false;
    if (priceRange && !matchesPrice(vendor, priceRange)) return false;
    if (ratingFloor != null && vendor.avg_rating < ratingFloor) return false;
    return true;
  });
}

/** How many facets/search terms are currently applied — drives "Clear" UI + copy. */
export function countActiveFilters(params: VendorsSearchParams): number {
  let count = params.q?.trim() ? 1 : 0;
  for (const key of FACET_KEYS) if (params[key]) count += 1;
  return count;
}
