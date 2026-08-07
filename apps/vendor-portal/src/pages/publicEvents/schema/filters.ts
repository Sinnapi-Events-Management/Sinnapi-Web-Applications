import { titleize } from '@/lib/config';
import type { EventSortKey } from '@/lib/types';

export type FilterOption = { value: string; label: string };

/**
 * The facets a vendor can narrow the public-events feed by. Every `value` here
 * is passed straight through to `search_events_public` — a label change is
 * safe, a value change is not.
 */

/**
 * Occasion tokens, matched exactly against `events.event_type`. Snake_case and
 * in step with what the admin portal writes; kept in the same order the public
 * site lists them so a vendor sees one vocabulary across both surfaces.
 */
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

/**
 * Town tokens. Matched by containment rather than equality, because
 * `events.location` is free text a poster typed — "kampala" must still match
 * "Kampala, Uganda".
 */
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

/**
 * Where an event came from. This is the one facet that changes what a vendor
 * can *do* with the result: only client-posted events accept an expression of
 * interest, admin ones are inspiration.
 */
export const SOURCE_OPTIONS: FilterOption[] = [
  { value: 'client', label: 'Open events' },
  { value: 'admin', label: 'Inspiration' },
];

/**
 * Date bands. Unlike the budget bands these are *not* resolved to values before
 * the call — the token travels into the RPC and is compared against
 * `current_date` there, so "this month" means the database's month.
 *
 * They deliberately overlap ("This month" sits inside "Upcoming"): picking a
 * band narrows, it doesn't partition, and the facet counts are computed the
 * same way.
 */
export const WHEN_OPTIONS: FilterOption[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'this_month', label: 'This month' },
  { value: 'next_3_months', label: 'Next 3 months' },
  { value: 'past', label: 'Past events' },
];

/** Budget bands (UGX). Each maps to a `BUDGET_RANGES` entry below. */
export const BUDGET_OPTIONS: FilterOption[] = [
  { value: 'lt_2m', label: 'Under UGX 2M' },
  { value: '2m_5m', label: 'UGX 2M – 5M' },
  { value: '5m_15m', label: 'UGX 5M – 15M' },
  { value: '15m_plus', label: 'UGX 15M +' },
];

/**
 * Numeric bounds backing each budget band, keyed by `BUDGET_OPTIONS.value`.
 *
 * `max: null` means open-ended. It is null rather than `Infinity` because these
 * bounds are serialised into an RPC call and `Infinity` has no JSON form.
 */
export const BUDGET_RANGES: Record<string, { min: number; max: number | null }> = {
  lt_2m: { min: 0, max: 2_000_000 },
  '2m_5m': { min: 2_000_000, max: 5_000_000 },
  '5m_15m': { min: 5_000_000, max: 15_000_000 },
  '15m_plus': { min: 15_000_000, max: null },
};

/**
 * Orderings offered above the feed. Values must stay inside the whitelist
 * `search_events_public` recognises — anything else falls back to 'soonest'
 * server-side rather than erroring.
 */
export const SORT_OPTIONS: { value: EventSortKey; label: string }[] = [
  { value: 'soonest', label: 'Happening soonest' },
  { value: 'newest', label: 'Recently posted' },
  { value: 'budget_asc', label: 'Budget: low to high' },
  { value: 'budget_desc', label: 'Budget: high to low' },
];

/** The order applied when the vendor hasn't chosen one. */
export const DEFAULT_SORT: EventSortKey = 'soonest';

/** The facet keys the URL carries. Sort is excluded: it reorders, it doesn't narrow. */
export const FACET_KEYS = ['type', 'location', 'when', 'budget', 'source'] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

export type FacetValues = Record<FacetKey, string>;

export const EMPTY_FACETS: FacetValues = {
  type: '',
  location: '',
  when: '',
  budget: '',
  source: '',
};

/** Human labels for the active-filter chips, resolved per facet. */
export const FACET_LABELS: Record<FacetKey, string> = {
  type: 'Occasion',
  location: 'Location',
  when: 'Date',
  budget: 'Budget',
  source: 'Type',
};

/** Option lists per facet, for turning a stored token back into its label. */
export const FACET_OPTIONS: Record<FacetKey, FilterOption[]> = {
  type: EVENT_TYPE_OPTIONS,
  location: LOCATION_OPTIONS,
  when: WHEN_OPTIONS,
  budget: BUDGET_OPTIONS,
  source: SOURCE_OPTIONS,
};
