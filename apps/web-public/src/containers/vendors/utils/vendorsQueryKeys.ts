import type { VendorSearchFilters } from '@/lib/types';

/**
 * Query keys for the vendors browsing experience.
 *
 * These are shared verbatim between the server prefetch and the client hooks —
 * hydration only works if both sides address the identical key, so building the
 * key in two places is how a page silently refetches everything it just
 * server-rendered. Hence one factory, imported by both.
 *
 * Keys are built from the *resolved* filters (numeric bounds, not band tokens),
 * so two URLs that mean the same query share a cache entry.
 */

/** Stable field order — object key order would otherwise leak into the cache key. */
function normalise(filters: VendorSearchFilters) {
  return {
    q: filters.q ?? null,
    category: filters.category ?? null,
    region: filters.region ?? null,
    priceMin: filters.priceMin ?? null,
    priceMax: filters.priceMax ?? null,
    minRating: filters.minRating ?? null,
    sort: filters.sort ?? 'recommended',
  };
}

export const vendorsKeys = {
  /** Root — `invalidateQueries({ queryKey: vendorsKeys.all })` clears everything below. */
  all: ['vendors'] as const,

  /**
   * The paginated grid. `excludeFeatured` is part of the key because it changes
   * which rows come back, so the default view and a filtered view must not
   * share a cache entry.
   */
  search: (filters: VendorSearchFilters, excludeFeatured: boolean) =>
    [...vendorsKeys.all, 'search', normalise(filters), { excludeFeatured }] as const,

  /**
   * Facet counts. Sort is excluded deliberately — reordering the grid cannot
   * change how many vendors are in it, so re-sorting must not throw the counts
   * away and refetch them.
   */
  facets: (filters: VendorSearchFilters) =>
    [...vendorsKeys.all, 'facets', { ...normalise(filters), sort: null }] as const,
};
