import { VENDOR_VISIBILITIES } from '@/lib/status';
import { titleize } from '@/lib/config';

export type FilterOption = { value: string; label: string };

/** `vendor_visibility` values as dropdown options (public / hidden). */
export const VISIBILITY_OPTIONS: FilterOption[] = VENDOR_VISIBILITIES.map((visibility) => ({
  value: visibility,
  label: titleize(visibility),
}));

/**
 * Minimum-rating thresholds. Values are the numeric floor passed to the query;
 * labels read as "and up" so it's clear the filter is inclusive downward.
 */
export const RATING_OPTIONS: FilterOption[] = [
  { value: '4', label: '4★ & up' },
  { value: '3', label: '3★ & up' },
  { value: '2', label: '2★ & up' },
  { value: '1', label: '1★ & up' },
];

/** Rating values the query will accept; anything else is treated as "any". */
const VALID_RATINGS = new Set(RATING_OPTIONS.map((option) => option.value));

export function isValidRating(value: string): boolean {
  return VALID_RATINGS.has(value);
}
