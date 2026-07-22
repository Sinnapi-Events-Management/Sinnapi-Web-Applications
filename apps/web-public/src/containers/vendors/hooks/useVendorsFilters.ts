'use client';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  parseVendorsSearchParams,
  toVendorFilters,
  countActiveFilters,
  isDefaultView,
  toQueryString,
  FACET_KEYS,
  type FacetKey,
  type VendorsSearchParams,
} from '../utils/searchParams';
import { DEFAULT_SORT } from '../utils/options';

/**
 * The vendors page's filter state, held in the URL.
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
 */
export function useVendorsFilters() {
  const searchParams = useSearchParams();

  // `toString()` rather than the object: a new URLSearchParams instance arrives
  // on every render, so memoising on the identity would never hit.
  const search = searchParams.toString();

  const params = useMemo(
    () =>
      parseVendorsSearchParams(
        Object.fromEntries(new URLSearchParams(search)) as VendorsSearchParams,
      ),
    [search],
  );

  const commit = useCallback((next: VendorsSearchParams, mode: 'push' | 'replace') => {
    const query = toQueryString(next);
    const url = query ? `?${query}` : window.location.pathname;
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }, []);

  /** Sets one facet (empty value clears it). Every other filter is preserved. */
  const setFacet = useCallback(
    (key: FacetKey, value: string) => {
      commit({ ...params, [key]: value || undefined }, 'push');
    },
    [commit, params],
  );

  const setSort = useCallback(
    (value: string) => {
      // The default order is the absence of the param, not `sort=recommended`.
      commit({ ...params, sort: value === DEFAULT_SORT ? undefined : value }, 'push');
    },
    [commit, params],
  );

  /** Debounced by the caller — see `useVendorsSearchInput`. */
  const setQuery = useCallback(
    (value: string) => {
      commit({ ...params, q: value.trim() || undefined }, 'replace');
    },
    [commit, params],
  );

  /** Clears the search and every facet. Sort is a preference, so it survives. */
  const clearAll = useCallback(() => {
    commit({ sort: params.sort }, 'push');
  }, [commit, params.sort]);

  const clearFacet = useCallback(
    (key: FacetKey | 'q') => {
      commit({ ...params, [key]: undefined }, 'push');
    },
    [commit, params],
  );

  return {
    params,
    /** Resolved numeric filters for the RPC / query keys. */
    filters: useMemo(() => toVendorFilters(params), [params]),
    activeFilters: countActiveFilters(params),
    isDefaultView: isDefaultView(params),
    facetKeys: FACET_KEYS,
    setFacet,
    setSort,
    setQuery,
    clearFacet,
    clearAll,
  };
}
