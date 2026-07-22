import type { EventSearchFilters } from '@/lib/types';

/**
 * Query keys for the events browsing experience.
 *
 * These are shared verbatim between the server prefetch and the client hooks —
 * hydration only works if both sides address the identical key, so building the
 * key in two places is how a page silently refetches everything it just
 * server-rendered. Hence one factory, imported by both.
 *
 * Keys are built from the *resolved* filters (numeric budget bounds, not band
 * tokens), so two URLs that mean the same query share a cache entry. `when`
 * stays a token here for the same reason it stays one in the RPC call: a
 * resolved date would make the key drift between the server render and the
 * client that hydrates it.
 */

/** Stable field order — object key order would otherwise leak into the cache key. */
function normalise(filters: EventSearchFilters) {
  return {
    q: filters.q ?? null,
    type: filters.type ?? null,
    source: filters.source ?? null,
    location: filters.location ?? null,
    when: filters.when ?? null,
    budgetMin: filters.budgetMin ?? null,
    budgetMax: filters.budgetMax ?? null,
    sort: filters.sort ?? 'soonest',
  };
}

export const eventsKeys = {
  /** Root — `invalidateQueries({ queryKey: eventsKeys.all })` clears everything below. */
  all: ['events'] as const,

  /** The paginated grid. */
  search: (filters: EventSearchFilters) =>
    [...eventsKeys.all, 'search', normalise(filters)] as const,

  /**
   * Facet counts. Sort is excluded deliberately — reordering the grid cannot
   * change how many events are in it, so re-sorting must not throw the counts
   * away and refetch them.
   */
  facets: (filters: EventSearchFilters) =>
    [...eventsKeys.all, 'facets', { ...normalise(filters), sort: null }] as const,
};
