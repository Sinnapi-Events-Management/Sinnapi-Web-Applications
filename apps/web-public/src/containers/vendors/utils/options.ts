import { VENDOR_CATEGORIES, SERVICE_REGIONS, titleize } from '@/lib/config/site';

export type FilterOption = { value: string; label: string };

/**
 * Single source of truth for the vendors page facets. Kept in the container's
 * `data/` layer (mirrors the events page) so both the presentational toolbar /
 * hero and the pure `filterVendors` logic read the same option/range definitions.
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

/** Starting-price bands (UGX). Each maps to an inclusive [min, max] range below. */
export const PRICE_OPTIONS: FilterOption[] = [
  { value: 'lt_1m', label: 'Under UGX 1M' },
  { value: '1m_3m', label: 'UGX 1M – 3M' },
  { value: '3m_8m', label: 'UGX 3M – 8M' },
  { value: '8m_plus', label: 'UGX 8M +' },
];

/** Numeric ranges backing each price band, keyed by `PRICE_OPTIONS.value`. */
export const PRICE_RANGES: Record<string, [number, number]> = {
  lt_1m: [0, 1_000_000],
  '1m_3m': [1_000_000, 3_000_000],
  '3m_8m': [3_000_000, 8_000_000],
  '8m_plus': [8_000_000, Number.POSITIVE_INFINITY],
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
