'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventsFilters } from './useEventsFilters';

/** Pause after the last keystroke before a search is committed to the URL. */
const DEBOUNCE_MS = 350;

/** Where the grid starts, so a submitted search scrolls the results into view. */
export const RESULTS_ANCHOR_ID = 'event-results';

/**
 * Search-as-you-type for the events hero.
 *
 * The input is uncontrolled by the URL while the visitor is typing — local state
 * keeps every keystroke instant — and commits to the URL once they pause, which
 * is what actually triggers the refetch. Committing per keystroke would fire a
 * query for "w", "we", "wed"… and make the grid strobe.
 *
 * `lastCommitted` is the reconciliation point: it lets us tell our own writes
 * apart from someone else's. When the toolbar's "Clear" wipes `q`, the URL no
 * longer matches what we last wrote, so the box adopts the new value; when the
 * change is just our own debounce landing, it doesn't fight the user's cursor.
 */
export function useEventsSearchInput() {
  const { params, setQuery } = useEventsFilters();
  const urlQuery = params.q ?? '';

  const [value, setValue] = useState(urlQuery);
  const lastCommitted = useRef(urlQuery);

  // Adopt changes made anywhere else (Clear, a filter chip, Back).
  useEffect(() => {
    if (urlQuery !== lastCommitted.current) {
      lastCommitted.current = urlQuery;
      setValue(urlQuery);
    }
  }, [urlQuery]);

  // Commit once typing settles.
  useEffect(() => {
    if (value.trim() === lastCommitted.current) return;
    const timer = setTimeout(() => {
      lastCommitted.current = value.trim();
      setQuery(value);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, setQuery]);

  /**
   * Enter / the Search button: skip the remaining debounce and take the visitor
   * to the results, since on a tall hero the grid they just asked for is off
   * screen.
   */
  const submit = useCallback(() => {
    lastCommitted.current = value.trim();
    setQuery(value);
    document
      .getElementById(RESULTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [value, setQuery]);

  const clear = useCallback(() => {
    setValue('');
    lastCommitted.current = '';
    setQuery('');
  }, [setQuery]);

  return { value, setValue, submit, clear };
}
