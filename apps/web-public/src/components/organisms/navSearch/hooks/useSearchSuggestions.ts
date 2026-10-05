'use client';
import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getSearchSuggestions, SUGGEST_MIN_CHARS } from '@/lib/queries';
import type { SuggestionRow } from '@/lib/types';

/**
 * Pause after the last keystroke before the suggestion request goes out.
 *
 * Half the vendors grid's 350ms on purpose: a dropdown that lags behind the
 * caret stops being an accelerator, and this request is cheap (ten rows, no
 * counts, no joins) where the grid's is not. Fast typists still only pay for
 * the pauses — 180ms is comfortably longer than the ~60–120ms between
 * keystrokes in continuous typing.
 */
const DEBOUNCE_MS = 180;

/** How many of each kind the panel asks for. Ten rows total, per Baymard's
 *  desktop ceiling — more than that and the list stops being scannable and
 *  starts needing a scrollbar. */
const VENDOR_LIMIT = 6;
const EVENT_LIMIT = 4;

/**
 * The navbar type-ahead's data.
 *
 * Debounces the term, then reads `search_suggestions_public` through TanStack
 * Query, so every visitor in the session shares one cache: backspacing to a
 * term you already typed re-renders from memory instead of re-querying, and
 * the same is true of closing and reopening the palette.
 *
 * `keepPreviousData` is what stops the panel strobing. Without it each new
 * term unmounts the list into a spinner and the panel's height snaps around
 * under the cursor; with it the previous rows stay put, dimmed by the caller,
 * until the new ones arrive.
 *
 * Below `SUGGEST_MIN_CHARS` the query is disabled rather than merely resolving
 * empty — a disabled query makes no request *and* keeps no pending state, so
 * the panel can treat "too short" and "idle" as the same thing.
 */
export function useSearchSuggestions(term: string) {
  const trimmed = term.trim();
  const [debounced, setDebounced] = useState(trimmed);

  useEffect(() => {
    // Clearing is not a keystroke — there is nothing to wait for, and holding
    // the old rows for 180ms after the box empties reads as a stuck dropdown.
    if (trimmed === '') {
      setDebounced('');
      return;
    }
    const timer = setTimeout(() => setDebounced(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const enabled = debounced.length >= SUGGEST_MIN_CHARS;

  const query = useQuery({
    queryKey: ['search-suggestions', debounced],
    queryFn: () =>
      getSearchSuggestions(debounced, { vendorLimit: VENDOR_LIMIT, eventLimit: EVENT_LIMIT }),
    enabled,
    placeholderData: keepPreviousData,
    // Suggestions age slowly — a vendor's name does not change between two
    // keystrokes — and the palette is opened repeatedly in one visit.
    staleTime: 5 * 60_000,
  });

  const rows: SuggestionRow[] = enabled ? (query.data ?? []) : [];

  return {
    rows,
    /** The term the rows actually answer — what the panel highlights against,
     *  which is not necessarily what is in the box right now. */
    term: debounced,
    /** Nothing to show yet, and something is on its way. */
    isLoading: enabled && query.isPending,
    /** Showing the previous term's rows while the new ones land. */
    isRefreshing: enabled && query.isFetching && !query.isPending,
    /** The visitor has typed, we have answered, and the answer is nothing. */
    isEmpty: enabled && !query.isPending && rows.length === 0,
    /** Still below the floor: say what to do, don't show an empty state. */
    isTooShort: debounced.length > 0 && debounced.length < SUGGEST_MIN_CHARS,
  };
}
