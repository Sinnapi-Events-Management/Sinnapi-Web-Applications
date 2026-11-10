import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ListFilterConfig, ListFilterState } from '../../data/listFilters';
import type { PageFilters } from '../../data/table';
import { LIST_TIMING, useDebouncedValue } from '../../data/timing';
import { isIsoDate, type IsoDateRange } from '../../molecules/datePicker/isoDate';
import { useSearchTerm } from './useSearchTerm';

const FROM_PARAM = 'from';
const TO_PARAM = 'to';

/**
 * URL-backed search + facet + date-range state for one list page.
 *
 * Every value lives in the query string (`?q=…&status=…&from=…&to=…`), so a
 * filtered list survives a reload and can be shared as a link. A hand-edited or
 * stale value that is not one of the facet's options, or not a `YYYY-MM-DD`
 * date, reads as "no constraint" rather than querying something impossible.
 *
 * Pacing (intervals in `LIST_TIMING`). The controls never wait — `values`,
 * `dateRange` and `search.input` move on the click or keystroke. What waits is
 * `query`, the thing a request reads:
 *   - the search term: debounced inside `useSearchTerm`, and not sent at all
 *     below `searchMinLength` characters;
 *   - facets + date range: debounced `filterDebounceMs`, so a burst (clearing
 *     three chips, a status then a date) becomes one request instead of three;
 *   - `countsQuery`: `query` held back a further `countsDelayMs`, so the
 *     heaviest call goes last and only once things have settled.
 * "Clear all" skips every window — an undo that lags feels broken.
 * A shared or reloaded link queries on first paint: every committed value
 * starts in step with the URL.
 *
 * Page reset is not handled here: hand `query` to `useTableState({ filters })`,
 * which returns to page 1 whenever it changes.
 *
 * `config` must be a module-level constant (the shared `*_LIST_FILTERS` are).
 */
export function useListFilters<K extends string>(config: ListFilterConfig<K>): ListFilterState<K> {
  const search = useSearchTerm({
    delay: LIST_TIMING.searchDebounceMs,
    minLength: LIST_TIMING.searchMinLength,
  });
  const [searchParams, setSearchParams] = useSearchParams();

  const facetKeys = config.facets.map((facet) => facet.key);

  // Read + validate. A string key keeps the memos below on primitives, so the
  // returned `values`/`query` only change identity when a value really changes.
  const rawValues = config.facets.map((facet) => {
    const raw = searchParams.get(facet.key) ?? '';
    return facet.options.some((option) => option.value === raw) ? raw : '';
  });
  const rawFrom = searchParams.get(FROM_PARAM) ?? '';
  const rawTo = searchParams.get(TO_PARAM) ?? '';
  const dateFrom = config.dateRange && isIsoDate(rawFrom) ? rawFrom : '';
  const dateTo = config.dateRange && isIsoDate(rawTo) ? rawTo : '';
  const valuesKey = rawValues.join('\u0000');

  const values = useMemo(
    () => Object.fromEntries(facetKeys.map((key, i) => [key, rawValues[i]])) as Record<K, string>,
    // `facetKeys`/`rawValues` are rebuilt every render; `valuesKey` is their content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [valuesKey],
  );

  const dateRange = useMemo<IsoDateRange>(
    () => ({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo],
  );

  /** Rebuilds from `prev` so params owned by anyone else (q, tab, book) survive. */
  const writeParams = useCallback(
    (patch: Record<string, string>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFacet = useCallback(
    (key: K, value: string) => writeParams({ [key]: value }),
    [writeParams],
  );

  // Both ends in one write: two writes would query an intermediate range that
  // pairs the new start with the old end.
  const setDateRange = useCallback(
    (next: IsoDateRange) => writeParams({ [FROM_PARAM]: next.from, [TO_PARAM]: next.to }),
    [writeParams],
  );

  // The facet + date part of the query, as the controls show it right now.
  // Serialized so the debounce below compares content, not identity.
  const liveKey = useMemo(() => {
    const out: PageFilters = {};
    for (const [key, value] of Object.entries(values) as [string, string][]) {
      if (value) out[key] = value;
    }
    if (dateFrom) out[FROM_PARAM] = dateFrom;
    if (dateTo) out[TO_PARAM] = dateTo;
    return JSON.stringify(out);
  }, [values, dateFrom, dateTo]);

  // …and as the request reads it: `liveKey` once it has been still for
  // `filterDebounceMs`. Its own timer rather than `useDebouncedValue` because
  // "Clear all" must be able to commit without waiting.
  const [committedKey, setCommittedKey] = useState(liveKey);
  useEffect(() => {
    if (liveKey === committedKey) return;
    const timer = setTimeout(() => setCommittedKey(liveKey), LIST_TIMING.filterDebounceMs);
    return () => clearTimeout(timer);
    // `committedKey` is read only to skip a no-op timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey]);

  const { clear: clearSearch } = search;
  const clearAll = useCallback(() => {
    writeParams(Object.fromEntries([...facetKeys, FROM_PARAM, TO_PARAM].map((key) => [key, ''])));
    setCommittedKey('{}');
    clearSearch();
    // `facetKeys` comes from a module-level config; its content never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeParams, clearSearch]);

  const query = useMemo<PageFilters>(
    () => ({
      ...(search.query ? { q: search.query } : {}),
      ...(JSON.parse(committedKey) as PageFilters),
    }),
    [search.query, committedKey],
  );

  const countsQuery = useDebouncedValue(query, LIST_TIMING.countsDelayMs);

  const activeCount = rawValues.filter(Boolean).length + (dateFrom || dateTo ? 1 : 0);

  return {
    config,
    search,
    values,
    setFacet,
    dateRange,
    setDateRange,
    activeCount,
    isFiltered: activeCount > 0 || Boolean(search.query),
    clearAll,
    query,
    countsQuery,
    isPending: search.isPending || liveKey !== committedKey,
  };
}
