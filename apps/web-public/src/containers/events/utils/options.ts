import { EVENT_TYPES, EVENT_LOCATIONS, titleize } from '@/lib/config/site';
import type { FilterOption, EventSortKey } from '@/lib/types';

/**
 * Single source of truth for the events page facets. The occasion/town `value`s
 * are passed straight through to `search_events_public` — a label change here is
 * safe, a value change is not.
 *
 * Lives in `utils/` beside `searchParams.ts` rather than in `data/`, because
 * these are the tokens the URL and the RPC are built from, not sample content.
 */

/** Occasion tokens (snake_case, matched exactly against `events.event_type`). */
export const EVENT_TYPE_OPTIONS: FilterOption[] = EVENT_TYPES.map((value) => ({
  value,
  label: titleize(value),
}));

/** Where an event came from — maps the `event_source` enum to friendly labels. */
export const SOURCE_OPTIONS: FilterOption[] = [
  { value: 'admin', label: 'Inspiration' },
  { value: 'client', label: 'Open event' },
];

/** Town tokens. Matched by containment, since `events.location` is free text. */
export const LOCATION_OPTIONS: FilterOption[] = EVENT_LOCATIONS.map((value) => ({
  value,
  label: titleize(value),
}));

/**
 * Date bands. Unlike every other band on this page these are *not* resolved to
 * values before the call — the token travels into the RPC and is compared
 * against `current_date` there. See `EventSearchFilters` for why.
 *
 * They deliberately overlap ("This month" is inside "Upcoming"): a visitor
 * picking a date band is narrowing, not partitioning, and the facet counts are
 * computed the same way.
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
 * bounds are serialised into an RPC call and `Infinity` has no JSON form — it
 * would reach Postgres as null regardless, so the type says so up front.
 */
export const BUDGET_RANGES: Record<string, { min: number; max: number | null }> = {
  lt_2m: { min: 0, max: 2_000_000 },
  '2m_5m': { min: 2_000_000, max: 5_000_000 },
  '5m_15m': { min: 5_000_000, max: 15_000_000 },
  '15m_plus': { min: 15_000_000, max: null },
};

/**
 * Sort orders offered above the grid. Values must stay inside the whitelist
 * `search_events_public` recognises — anything else falls back to 'soonest'
 * server-side rather than erroring.
 *
 * 'soonest' leads because an events feed is about what you can still attend or
 * bid on: it puts upcoming events first, soonest at the top, and only then the
 * most recent past ones. 'newest' is a different question ("what was just
 * posted") and is kept separate rather than conflated with it.
 */
export const SORT_OPTIONS: { value: EventSortKey; label: string }[] = [
  { value: 'soonest', label: 'Happening soonest' },
  { value: 'newest', label: 'Recently posted' },
  { value: 'budget_asc', label: 'Budget: low to high' },
  { value: 'budget_desc', label: 'Budget: high to low' },
];

/** The order applied when the visitor hasn't chosen one. */
export const DEFAULT_SORT: EventSortKey = 'soonest';
