'use client';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  parseEventsSearchParams,
  toEventFilters,
  countActiveFilters,
  isDefaultView,
  toQueryString,
  FACET_KEYS,
  type FacetKey,
  type EventsSearchParams,
} from '../utils/searchParams';
import { DEFAULT_SORT } from '../utils/options';
import type { FilterOption } from '@/lib/types';

/**
 * The events page's filter state, held in the URL.
 *
 * Writes go through the native History API rather than `router.push`, which is
 * the whole reason filtering feels instant here: `pushState`/`replaceState` are
 * patched by the App Router to keep `useSearchParams` in sync *without*
 * re-running the server component or refetching an RSC payload. A filter change
 * is therefore a cache lookup and, at worst, one Supabase call — not a
 * navigation. The URL still updates, so views stay shareable and the back
 * button still works.
 *
 * Because the state lives in the URL, the hero's search box and the toolbar's
 * facets — which sit in different subtrees and never meet — stay in sync with
 * no context, no store and no prop drilling between them.
 *
 * Discrete choices (a facet, a sort, clearing) `push`, so Back undoes exactly
 * one decision. Typing `replace`s, so a ten-character search doesn't bury the
 * previous page under ten history entries.
 *
 * `typeOptions` is the occasion vocabulary the page's Server Component fetched
 * from `event_types` and threaded down. It arrives as a prop rather than being
 * fetched here because every caller already sits under a component the server
 * rendered — one read at the top beats three client fetches, and it is what
 * lets the server and the browser agree on the parsed params (and therefore on
 * the query key) from the very first paint.
 */
export function useEventsFilters(typeOptions: FilterOption[]) {
  const searchParams = useSearchParams();

  // `toString()` rather than the object: a new URLSearchParams instance arrives
  // on every render, so memoising on the identity would never hit.
  const search = searchParams.toString();

  const params = useMemo(
    () =>
      parseEventsSearchParams(
        Object.fromEntries(new URLSearchParams(search)) as EventsSearchParams,
        typeOptions,
      ),
    [search, typeOptions],
  );

  /**
   * What the address bar holds *right now* — not what the last render saw.
   *
   * Every write merges onto this rather than onto the memoised `params`,
   * because the two can disagree for a beat: `useSearchParams` re-renders in a
   * transition, so a debounced search landing just after a quick-filter tap
   * would otherwise merge onto the pre-tap snapshot and silently drop the
   * occasion the visitor had just chosen. Reading `window.location` makes the
   * merge base the real URL, and keeps every setter below referentially stable
   * — which matters for `setQuery`, whose identity changing mid-debounce used
   * to restart the timer on every unrelated URL change.
   */
  const readParams = useCallback(
    () =>
      parseEventsSearchParams(
        Object.fromEntries(new URLSearchParams(window.location.search)) as EventsSearchParams,
        typeOptions,
      ),
    [typeOptions],
  );

  const commit = useCallback((next: EventsSearchParams, mode: 'push' | 'replace') => {
    const query = toQueryString(next);
    const url = query ? `?${query}` : window.location.pathname;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }, []);

  /** Sets one facet (empty value clears it). Every other filter is preserved. */
  const setFacet = useCallback(
    (key: FacetKey, value: string) => {
      commit({ ...readParams(), [key]: value || undefined }, 'push');
    },
    [commit, readParams],
  );

  const setSort = useCallback(
    (value: string) => {
      // The default order is the absence of the param, not `sort=soonest`.
      commit({ ...readParams(), sort: value === DEFAULT_SORT ? undefined : value }, 'push');
    },
    [commit, readParams],
  );

  /** Debounced by the caller — see `useEventsSearchInput`. */
  const setQuery = useCallback(
    (value: string) => {
      commit({ ...readParams(), q: value.trim() || undefined }, 'replace');
    },
    [commit, readParams],
  );

  /**
   * Clears the search and every facet. Sort is a preference, so it survives.
   *
   * Guarded against the already-clear case off the *live* URL rather than off
   * the render's `params`: the search box calls this the instant it is emptied,
   * which can be the same frame a commit landed in, and a render-state guard
   * would either push a history entry for a URL identical to the one showing or
   * skip a clear that was genuinely needed.
   */
  const clearAll = useCallback(() => {
    const current = readParams();
    if (countActiveFilters(current) === 0) return;
    commit({ sort: current.sort }, 'push');
  }, [commit, readParams]);

  const clearFacet = useCallback(
    (key: FacetKey | 'q') => {
      commit({ ...readParams(), [key]: undefined }, 'push');
    },
    [commit, readParams],
  );

  return {
    params,
    /** Resolved filters for the RPC / query keys. */
    filters: useMemo(() => toEventFilters(params), [params]),
    activeFilters: countActiveFilters(params),
    /** True when any dropdown/chip facet is narrowing the grid, search aside. */
    hasFacets: FACET_KEYS.some((key) => Boolean(params[key])),
    isDefaultView: isDefaultView(params),
    facetKeys: FACET_KEYS,
    setFacet,
    setSort,
    setQuery,
    clearFacet,
    clearAll,
  };
}
