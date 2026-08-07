import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { VendorSearchFilters, VendorSortKey } from '@/lib/types';
import {
  FACET_KEYS,
  EMPTY_FACETS,
  PRICE_OPTIONS,
  PRICE_RANGES,
  RATING_OPTIONS,
  RATING_FLOORS,
  SORT_OPTIONS,
  DEFAULT_SORT,
  type FacetKey,
  type FacetValues,
  type FilterOption,
} from '../schema/filters';

const STATIC_ALLOWED: Record<'price' | 'rating', Set<string>> = {
  price: new Set(PRICE_OPTIONS.map((option) => option.value)),
  rating: new Set(RATING_OPTIONS.map((option) => option.value)),
};

const ALLOWED_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

export type VendorFilters = {
  /** Band tokens as the URL carries them — bind these to the dropdowns. */
  values: FacetValues;
  sort: VendorSortKey;
  setFacet: (key: FacetKey, value: string) => void;
  setSort: (next: string) => void;
  reset: () => void;
  /** How many facets currently narrow the grid. Sort isn't one: it reorders. */
  activeCount: number;
  isActive: boolean;
  /** The facets resolved into the numeric form the RPC takes. */
  query: Omit<VendorSearchFilters, 'q'>;
};

/**
 * Discover's facet state, mirrored in the URL so a filtered grid survives a
 * refresh, a back button and a shared link — and so TanStack Query's cache key
 * falls out of the address bar for free.
 *
 * The URL is the single source of truth rather than component state: the search
 * box, the filter dropdowns and the chips live in different subtrees and never
 * talk to each other, they just all read and write here.
 *
 * `options` carries the category/region entries the reference tables actually
 * publish, so a stale bookmark pointing at a retired category degrades to "no
 * filter" instead of a permanently empty grid the client can't explain. While
 * that data is still loading the lists are empty and nothing is dropped —
 * we can't tell a retired key from an unloaded one, and guessing wrong would
 * discard a legitimate filter on every first paint.
 *
 * The option *arrays* are the memo dependency rather than keys derived from
 * them, so the caller can pass its already-memoised lists and every value below
 * keeps a stable identity across renders. Deriving a fresh `string[]` per render
 * would invalidate this chain each time and hand a new query key to TanStack
 * Query on every paint.
 */
export function useVendorFilters(options: {
  category: FilterOption[];
  region: FilterOption[];
}): VendorFilters {
  const [searchParams, setSearchParams] = useSearchParams();

  const allowedSets = useMemo(
    () => ({
      category: new Set(options.category.map((option) => option.value)),
      region: new Set(options.region.map((option) => option.value)),
      ...STATIC_ALLOWED,
    }),
    [options.category, options.region],
  );

  const values = useMemo(() => {
    const next: FacetValues = { ...EMPTY_FACETS };
    for (const key of FACET_KEYS) {
      const raw = searchParams.get(key)?.trim();
      if (!raw) continue;
      const set = allowedSets[key];
      // An empty reference set means "not loaded yet" — trust the URL until it is.
      if (set.size === 0 || set.has(raw)) next[key] = raw;
    }
    return next;
  }, [searchParams, allowedSets]);

  const rawSort = searchParams.get('sort')?.trim();
  const sort = (rawSort && ALLOWED_SORTS.has(rawSort) ? rawSort : DEFAULT_SORT) as VendorSortKey;

  const write = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFacet = useCallback(
    (key: FacetKey, value: string) => {
      write((params) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
    },
    [write],
  );

  const setSort = useCallback(
    (next: string) => {
      write((params) => {
        // The default order leaves no trace, so an untouched grid has a clean URL.
        if (next && next !== DEFAULT_SORT && ALLOWED_SORTS.has(next)) params.set('sort', next);
        else params.delete('sort');
      });
    },
    [write],
  );

  // Clears the facets and the sort but deliberately leaves `q` alone — that one
  // belongs to the search field, which owns its own clear button.
  const reset = useCallback(() => {
    write((params) => {
      for (const key of FACET_KEYS) params.delete(key);
      params.delete('sort');
    });
  }, [write]);

  const activeCount = FACET_KEYS.reduce((count, key) => count + (values[key] ? 1 : 0), 0);

  const query = useMemo<Omit<VendorSearchFilters, 'q'>>(() => {
    const price = values.price ? PRICE_RANGES[values.price] : undefined;
    return {
      category: values.category || undefined,
      region: values.region || undefined,
      priceMin: price?.min,
      // `?? undefined` keeps an open-ended band ("8M +") from sending a max at all.
      priceMax: price?.max ?? undefined,
      minRating: values.rating ? RATING_FLOORS[values.rating] : undefined,
      sort,
    };
  }, [values, sort]);

  return {
    values,
    sort,
    setFacet,
    setSort,
    reset,
    activeCount,
    isActive: activeCount > 0,
    query,
  };
}
