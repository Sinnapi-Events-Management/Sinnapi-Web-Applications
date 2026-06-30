import type { EventCardModel } from '@/lib/types';
import { BUDGET_RANGES } from './options';

/** Query-string shape the events page reads/writes (server-side, URL-driven). */
export type EventsSearchParams = {
  q?: string;
  type?: string;
  source?: string;
  location?: string;
  budget?: string;
};

/** The facet keys a user can narrow by — used to count/label active filters. */
const FACET_KEYS = ['type', 'source', 'location', 'budget'] as const;

/** True when the event's [min, max] budget overlaps the selected [lo, hi] band. */
function matchesBudget(event: EventCardModel, [lo, hi]: [number, number]): boolean {
  const min = event.budget_min ?? event.budget_max;
  const max = event.budget_max ?? event.budget_min;
  if (min == null || max == null) return false; // no budget → excluded once a band is chosen
  return min <= hi && max >= lo;
}

/**
 * Pure, server-side filtering for the events listing. Mirrors how the vendors
 * page narrows results from the URL, but runs in-memory so it works identically
 * over live rows or the mock dataset. Search matches title, description,
 * location and type; facets narrow by exact token / budget band.
 */
export function filterEvents(
  events: EventCardModel[],
  params: EventsSearchParams,
): EventCardModel[] {
  const q = params.q?.trim().toLowerCase();
  const range = params.budget ? BUDGET_RANGES[params.budget] : undefined;

  return events.filter((event) => {
    if (q) {
      const haystack = [event.title, event.description, event.location, event.event_type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (params.type && event.event_type !== params.type) return false;
    if (params.source && event.source !== params.source) return false;
    if (params.location && event.location?.toLowerCase() !== params.location.toLowerCase()) {
      return false;
    }
    if (range && !matchesBudget(event, range)) return false;
    return true;
  });
}

/** How many facets/search terms are currently applied — drives "Clear" UI + copy. */
export function countActiveFilters(params: EventsSearchParams): number {
  let count = params.q?.trim() ? 1 : 0;
  for (const key of FACET_KEYS) if (params[key]) count += 1;
  return count;
}
