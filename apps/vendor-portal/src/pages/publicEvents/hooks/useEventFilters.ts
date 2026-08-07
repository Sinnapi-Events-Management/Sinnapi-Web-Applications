import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { EventSearchFilters, EventSortKey } from '@/lib/types';
import {
  FACET_KEYS,
  FACET_OPTIONS,
  EMPTY_FACETS,
  BUDGET_RANGES,
  SORT_OPTIONS,
  DEFAULT_SORT,
  type FacetKey,
  type FacetValues,
} from '../schema/filters';

/** Every value each facet legitimately accepts, so unknown input can be dropped. */
const ALLOWED: Record<FacetKey, Set<string>> = FACET_KEYS.reduce(
  (acc, key) => {
    acc[key] = new Set(FACET_OPTIONS[key].map((option) => option.value));
    return acc;
  },
  {} as Record<FacetKey, Set<string>>,
);

const ALLOWED_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

export type EventFilters = {
  /** Band tokens as the URL carries them — bind these to the dropdowns. */
  values: FacetValues;
  sort: EventSortKey;
  setFacet: (key: FacetKey, value: string) => void;
  setSort: (next: string) => void;
  reset: () => void;
  /** How many facets currently narrow the feed. Sort isn't one: it reorders. */
  activeCount: number;
  isActive: boolean;
  /** The facets resolved into the form the RPC takes. */
  query: Omit<EventSearchFilters, 'q'>;
};

/**
 * The public-events feed's facet state, mirrored in the URL so a filtered feed
 * survives a refresh and the back button, and so TanStack Query's cache key
 * falls out of the address bar for free.
 *
 * Anything unrecognised — a stale bookmark, a hand-edited URL, a retired
 * occasion — is dropped rather than passed down, so a bad value degrades to "no
 * filter" instead of an empty feed the vendor can't explain.
 */
export function useEventFilters(): EventFilters {
  const [searchParams, setSearchParams] = useSearchParams();

  const values = useMemo(() => {
    const next: FacetValues = { ...EMPTY_FACETS };
    for (const key of FACET_KEYS) {
      const raw = searchParams.get(key)?.trim();
      if (raw && ALLOWED[key].has(raw)) next[key] = raw;
    }
    return next;
  }, [searchParams]);

  const rawSort = searchParams.get('sort')?.trim();
  const sort = (rawSort && ALLOWED_SORTS.has(rawSort) ? rawSort : DEFAULT_SORT) as EventSortKey;

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
        // The default order leaves no trace, so an untouched feed has a clean URL.
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

  const query = useMemo<Omit<EventSearchFilters, 'q'>>(() => {
    const budget = values.budget ? BUDGET_RANGES[values.budget] : undefined;
    return {
      type: values.type || undefined,
      location: values.location || undefined,
      source: values.source || undefined,
      // The date band travels as a token: it resolves against the database's
      // `current_date`, not the browser's clock.
      when: values.when || undefined,
      budgetMin: budget?.min,
      // `?? undefined` keeps an open-ended band ("15M +") from sending a max at all.
      budgetMax: budget?.max ?? undefined,
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
