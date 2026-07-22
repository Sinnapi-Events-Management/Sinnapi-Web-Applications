import { VENDOR_CATEGORIES, SERVICE_REGIONS, titleize } from '@/lib/config/site';
import type { FilterOption, VendorSortKey } from '@/lib/types';

/**
 * Single source of truth for the vendors page facets. The category/region
 * `value`s are the same keys `service_categories.key` / `service_regions.key`
 * carry in the database, because they are passed straight through to
 * `search_vendors_public` — a label change here is safe, a value change is not.
 */

/** Service-category tokens (snake_case to match the DB category slugs). */
export const CATEGORY_OPTIONS: FilterOption[] = VENDOR_CATEGORIES.map((value) => ({
  value,
  label: titleize(value),
}));

/** Service-region tokens (snake_case to match the DB region slugs). */
export const REGION_OPTIONS: FilterOption[] = SERVICE_REGIONS.map((value) => ({
  value,
  label: titleize(value),
}));

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
 * Sort orders offered above the grid. Values must stay inside the whitelist
 * `search_vendors_public` recognises — anything else falls back to
 * 'recommended' server-side rather than erroring.
 *
 * 'recommended' leads because it is the only order that respects paid placement
 * (`is_featured`, then editorial `search_weight`); the rest are the visitor
 * taking control, which is exactly when placement should stop applying.
 */
export const SORT_OPTIONS: { value: VendorSortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

/** The order applied when the visitor hasn't chosen one. */
export const DEFAULT_SORT: VendorSortKey = 'recommended';
