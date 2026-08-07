import type { VendorSortKey } from '@/lib/types';

export type FilterOption = { value: string; label: string };

/**
 * The facets a client can narrow Discover by, beyond free text. Category and
 * region options are not here: they come from `service_categories` /
 * `service_regions` at runtime (see `useFilterRefData`), so the dropdowns stay
 * in step with whatever the admin portal has published.
 *
 * Price and rating *are* here, because they are editorial bands rather than
 * reference data — the numbers backing "UGX 1M – 3M" are a product decision,
 * and the URL carries the readable token so a re-cut band never invalidates a
 * shared link.
 */

/** Starting-price bands (UGX). Each maps to a `PRICE_RANGES` entry below. */
export const PRICE_OPTIONS: FilterOption[] = [
  { value: 'lt_1m', label: 'Under UGX 1M' },
  { value: '1m_3m', label: 'UGX 1M – 3M' },
  { value: '3m_8m', label: 'UGX 3M – 8M' },
  { value: '8m_plus', label: 'UGX 8M +' },
];

/**
 * Numeric bounds backing each price band, keyed by `PRICE_OPTIONS.value`.
 *
 * `max: null` means open-ended. It is null rather than `Infinity` because these
 * bounds are serialised into an RPC call and `Infinity` has no JSON form — it
 * would reach Postgres as null regardless, so the type says so up front.
 */
export const PRICE_RANGES: Record<string, { min: number; max: number | null }> = {
  lt_1m: { min: 0, max: 1_000_000 },
  '1m_3m': { min: 1_000_000, max: 3_000_000 },
  '3m_8m': { min: 3_000_000, max: 8_000_000 },
  '8m_plus': { min: 8_000_000, max: null },
};

/** Minimum-rating bands. Each maps to a numeric floor on `avg_rating`. */
export const RATING_OPTIONS: FilterOption[] = [
  { value: '4_5', label: '4.5 ★ & up' },
  { value: '4', label: '4.0 ★ & up' },
  { value: '3_5', label: '3.5 ★ & up' },
];

/** Numeric floor backing each rating band, keyed by `RATING_OPTIONS.value`. */
export const RATING_FLOORS: Record<string, number> = {
  '4_5': 4.5,
  '4': 4,
  '3_5': 3.5,
};

/**
 * Orderings offered above the grid. Values must stay inside the whitelist
 * `search_vendors_public` recognises — anything else falls back to
 * 'recommended' server-side rather than erroring.
 */
export const SORT_OPTIONS: { value: VendorSortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

/** The order applied when the client hasn't chosen one. */
export const DEFAULT_SORT: VendorSortKey = 'recommended';

/** The facet keys the URL carries. Sort is excluded: it reorders, it doesn't narrow. */
export const FACET_KEYS = ['category', 'region', 'price', 'rating'] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

/** The URL param name each facet is stored under. Kept 1:1 for a readable address bar. */
export type FacetValues = Record<FacetKey, string>;

export const EMPTY_FACETS: FacetValues = { category: '', region: '', price: '', rating: '' };

/** Human labels for the active-filter chips, resolved per facet. */
export const FACET_LABELS: Record<FacetKey, string> = {
  category: 'Category',
  region: 'Location',
  price: 'Price',
  rating: 'Rating',
};
