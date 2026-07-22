import type { EventSearchFilters, EventSortKey } from '@/lib/types';
import {
  EVENT_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  LOCATION_OPTIONS,
  WHEN_OPTIONS,
  BUDGET_OPTIONS,
  BUDGET_RANGES,
  SORT_OPTIONS,
  DEFAULT_SORT,
} from './options';

/**
 * The query-string shape `/events` reads and writes. The URL is the single
 * source of truth for the whole browsing experience — the hero's search box and
 * the toolbar's facets live in different subtrees and never talk to each other,
 * they just both read and write here. That also makes every filtered view
 * shareable, bookmarkable and correct under the back button, and gives TanStack
 * Query a cache key that falls out of the address bar for free.
 *
 * Values are the human-facing *band tokens* ('15m_plus', 'this_month'), not the
 * values they resolve to — the URL stays readable, the bands can be re-cut in
 * `options.ts` without invalidating anyone's bookmarks, and a link to
 * `?when=upcoming` still means "upcoming" when it is opened next month.
 */
export type EventsSearchParams = {
  q?: string;
  type?: string;
  source?: string;
  location?: string;
  when?: string;
  budget?: string;
  sort?: string;
};

/** The facet keys a visitor can narrow by — used to count/label active filters. */
export const FACET_KEYS = ['type', 'source', 'location', 'when', 'budget'] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

/** Every value each facet legitimately accepts, so unknown input can be dropped. */
const ALLOWED: Record<FacetKey, Set<string>> = {
  type: new Set(EVENT_TYPE_OPTIONS.map((option) => option.value)),
  source: new Set(SOURCE_OPTIONS.map((option) => option.value)),
  location: new Set(LOCATION_OPTIONS.map((option) => option.value)),
  when: new Set(WHEN_OPTIONS.map((option) => option.value)),
  budget: new Set(BUDGET_OPTIONS.map((option) => option.value)),
};

const ALLOWED_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

/**
 * Normalises raw query-string input into the params the page trusts. Anything
 * unrecognised — a stale bookmark, a hand-edited URL, a retired occasion — is
 * dropped rather than passed down, so a bad value degrades to "no filter"
 * instead of a permanently empty grid the visitor can't explain.
 */
export function parseEventsSearchParams(raw: EventsSearchParams = {}): EventsSearchParams {
  const params: EventsSearchParams = {};
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
 * Resolves URL params into the filter object `search_events_public` takes. This
 * is the one place budget band tokens become bounds, so the grid, the facet
 * counts and the prefetch can never disagree about what "UGX 5M – 15M" means.
 *
 * `when` passes through untouched: it is the RPC that turns 'upcoming' into a
 * date, deliberately, so no moving value ever lands in a query key.
 */
export function toEventFilters(params: EventsSearchParams): EventSearchFilters {
  const budget = params.budget ? BUDGET_RANGES[params.budget] : undefined;
  return {
    q: params.q || undefined,
    type: params.type || undefined,
    source: params.source || undefined,
    location: params.location || undefined,
    when: params.when || undefined,
    budgetMin: budget?.min,
    // `?? undefined` keeps an open-ended band ("UGX 15M +") from sending a max at all.
    budgetMax: budget?.max ?? undefined,
    sort: (params.sort as EventSortKey) || DEFAULT_SORT,
  };
}

/** How many facets/search terms currently narrow the grid. Sort is not one: it reorders, it doesn't exclude. */
export function countActiveFilters(params: EventsSearchParams): number {
  let count = params.q?.trim() ? 1 : 0;
  for (const key of FACET_KEYS) if (params[key]) count += 1;
  return count;
}

/** True on the untouched view — nothing narrowed and nothing re-sorted. */
export function isDefaultView(params: EventsSearchParams): boolean {
  return countActiveFilters(params) === 0 && !params.sort;
}

/**
 * Serialises params back into a query string, omitting empties so a cleared
 * filter leaves no trace in the URL. Returns '' for the default view, which
 * callers render as a bare '/events'.
 */
export function toQueryString(params: EventsSearchParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return search.toString();
}
