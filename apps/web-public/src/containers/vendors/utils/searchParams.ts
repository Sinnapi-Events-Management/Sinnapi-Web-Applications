import type { VendorSearchFilters, VendorSortKey } from '@/lib/types';
import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  PRICE_OPTIONS,
  RATING_OPTIONS,
  PRICE_RANGES,
  RATING_FLOORS,
  SORT_OPTIONS,
  DEFAULT_SORT,
} from './options';

/**
 * The query-string shape `/vendors` reads and writes. The URL is the single
 * source of truth for the whole browsing experience — the hero's search box and
 * the toolbar's facets live in different subtrees and never talk to each other,
 * they just both read and write here. That also makes every filtered view
 * shareable, bookmarkable and correct under the back button, and gives TanStack
 * Query a cache key that falls out of the address bar for free.
 *
 * Values are the human-facing *band tokens* ('8m_plus', '4_5'), not the numbers
 * they resolve to — the URL stays readable and the bands can be re-cut in
 * `options.ts` without invalidating anyone's bookmarks.
 */
export type VendorsSearchParams = {
  q?: string;
  category?: string;
  region?: string;
  price?: string;
  rating?: string;
  sort?: string;
};

/** The facet keys a visitor can narrow by — used to count/label active filters. */
export const FACET_KEYS = ['category', 'region', 'price', 'rating'] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

/** Every value each facet legitimately accepts, so unknown input can be dropped. */
const ALLOWED: Record<FacetKey, Set<string>> = {
  category: new Set(CATEGORY_OPTIONS.map((option) => option.value)),
  region: new Set(REGION_OPTIONS.map((option) => option.value)),
  price: new Set(PRICE_OPTIONS.map((option) => option.value)),
  rating: new Set(RATING_OPTIONS.map((option) => option.value)),
};

const ALLOWED_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

/**
 * Normalises raw query-string input into the params the page trusts. Anything
 * unrecognised — a stale bookmark, a hand-edited URL, a retired category — is
 * dropped rather than passed down, so a bad value degrades to "no filter"
 * instead of a permanently empty grid the visitor can't explain.
 */
export function parseVendorsSearchParams(raw: VendorsSearchParams = {}): VendorsSearchParams {
  const params: VendorsSearchParams = {};
  const q = raw.q?.trim();
  if (q) params.q = q;
  for (const key of FACET_KEYS) {
    const value = raw[key]?.trim();
    if (value && ALLOWED[key].has(value)) params[key] = value;
  }
  const sort = raw.sort?.trim();
  if (sort && sort !== DEFAULT_SORT && ALLOWED_SORTS.has(sort)) params.sort = sort;
  return params;
}

/**
 * Resolves URL params into the numeric filter object `search_vendors_public`
 * takes. This is the one place band tokens become bounds, so the grid, the
 * facet counts and the prefetch can never disagree about what "UGX 3M – 8M"
 * means.
 */
export function toVendorFilters(params: VendorsSearchParams): VendorSearchFilters {
  const price = params.price ? PRICE_RANGES[params.price] : undefined;
  return {
    q: params.q || undefined,
    category: params.category || undefined,
    region: params.region || undefined,
    priceMin: price?.min,
    // `?? undefined` keeps an open-ended band ("8M +") from sending a max at all.
    priceMax: price?.max ?? undefined,
    minRating: params.rating ? RATING_FLOORS[params.rating] : undefined,
    sort: (params.sort as VendorSortKey) || DEFAULT_SORT,
  };
}

/** How many facets/search terms currently narrow the grid. Sort is not one: it reorders, it doesn't exclude. */
export function countActiveFilters(params: VendorsSearchParams): number {
  let count = params.q?.trim() ? 1 : 0;
  for (const key of FACET_KEYS) if (params[key]) count += 1;
  return count;
}

/**
 * True on the untouched view — nothing narrowed and nothing re-sorted. Only
 * then does the featured spotlight rail appear (and the grid below it exclude
 * those vendors, so they aren't shown twice). The moment a visitor searches,
 * filters *or* re-sorts, they've expressed an intent that a paid-placement rail
 * would talk over, so it steps aside and every match flows into the grid.
 */
export function isDefaultView(params: VendorsSearchParams): boolean {
  return countActiveFilters(params) === 0 && !params.sort;
}

/**
 * Serialises params back into a query string, omitting empties so a cleared
 * filter leaves no trace in the URL. Returns '' for the default view, which
 * callers render as a bare '/vendors'.
 */
export function toQueryString(params: VendorsSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}
