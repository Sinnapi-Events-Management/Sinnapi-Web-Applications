'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilterOption } from '@/lib/types';
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
 *
 * `typeOptions` is threaded in only to reach `useEventsFilters`: committing a
 * search rewrites the whole param set, so this hook has to parse the URL
 * against the same occasion vocabulary as everything else or a search would
 * quietly drop the visitor's occasion filter.
 *
 * EMPTYING THE BOX IS A FULL RESET
 * Backspacing the search away used to clear `q` and nothing else, which quietly
 * stranded visitors: tapping an occasion chip under the box also sets a facet,
 * so `?q=wed&type=wedding` survived as `?type=wedding`, and the next thing they
 * typed was silently ANDed with a filter they had no memory of setting —
 * usually to zero results. The toolbar's Clear button fixes that, but it is
 * below the fold and most of our visitors never reach for it. So an empty box
 * now means what it looks like it means: every event, with each facet dropped.
 * Sort survives, being a preference rather than a filter.
 */
export function useEventsSearchInput(typeOptions: FilterOption[]) {
  const { params, hasFacets, setQuery, clearAll } = useEventsFilters(typeOptions);
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
   * Back to every event. Runs immediately rather than on the debounce: an empty
   * box has no half-typed word to protect, and waiting 350ms to undo what the
   * visitor already sees gone reads as lag.
   *
   * Writing `lastCommitted` is also what cancels any commit still in flight —
   * the effect above re-runs on the emptied value and returns before scheduling
   * anything, so a stale "wed" can't land a moment later.
   */
  const reset = useCallback(() => {
    setValue('');
    lastCommitted.current = '';
    // A no-op when nothing was active, which `clearAll` decides off the live
    // URL — see there for why this cannot be guarded from render state.
    clearAll();
  }, [clearAll]);

  /**
   * Every keystroke. Deleting the last character is the reset — including the
   * held-backspace case, which arrives here as one change event per character
   * and fires exactly once, when the box finally reads empty.
   */
  const change = useCallback(
    (next: string) => {
      if (next.trim() === '') {
        reset();
        return;
      }
      setValue(next);
    },
    [reset],
  );

  /**
   * Enter / the Search button: skip the remaining debounce and take the visitor
   * to the results, since on a tall hero the grid they just asked for is off
   * screen. Submitting an empty box is a reset, not a search for "".
   */
  const submit = useCallback(() => {
    if (value.trim() === '') reset();
    else {
      lastCommitted.current = value.trim();
      setQuery(value);
    }
    document
      .getElementById(RESULTS_ANCHOR_ID)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [value, setQuery, reset]);

  return {
    value,
    setValue: change,
    submit,
    clear: reset,
    /** Whether clearing would also drop facets — the ✕ has to say so. */
    clearsFilters: hasFacets,
  };
}
