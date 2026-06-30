import { titleize } from '@/lib/config/site';

export type FilterOption = { value: string; label: string };

/**
 * Single source of truth for the events page facets. Kept in the container's
 * `data/` layer (not the toolbar organism) so both the presentational filter
 * bar and the pure `filterEvents` logic read the same option/range definitions.
 */

/** Event-type tokens shown in the filter (snake_case to match the DB `event_type`). */
export const EVENT_TYPE_OPTIONS: FilterOption[] = [
  'wedding',
  'birthday',
  'corporate',
  'graduation',
  'baby_shower',
  'anniversary',
  'concert',
  'conference',
  'product_launch',
].map((value) => ({ value, label: titleize(value) }));

/** Where an event came from — maps the `event_source` enum to friendly labels. */
export const SOURCE_OPTIONS: FilterOption[] = [
  { value: 'admin', label: 'Inspiration' },
  { value: 'client', label: 'Open event' },
];

/** Locations used by the mock events (towns/cities across Uganda + nationwide). */
export const LOCATION_OPTIONS: FilterOption[] = [
  'kampala',
  'entebbe',
  'jinja',
  'mukono',
  'wakiso',
  'mbarara',
  'gulu',
  'nationwide',
].map((value) => ({ value, label: titleize(value) }));

/** Budget bands (UGX). Each maps to an inclusive [min, max] range below. */
export const BUDGET_OPTIONS: FilterOption[] = [
  { value: 'lt_2m', label: 'Under UGX 2M' },
  { value: '2m_5m', label: 'UGX 2M – 5M' },
  { value: '5m_15m', label: 'UGX 5M – 15M' },
  { value: '15m_plus', label: 'UGX 15M +' },
];

/** Numeric ranges backing each budget band, keyed by `BUDGET_OPTIONS.value`. */
export const BUDGET_RANGES: Record<string, [number, number]> = {
  lt_2m: [0, 2_000_000],
  '2m_5m': [2_000_000, 5_000_000],
  '5m_15m': [5_000_000, 15_000_000],
  '15m_plus': [15_000_000, Number.POSITIVE_INFINITY],
};
