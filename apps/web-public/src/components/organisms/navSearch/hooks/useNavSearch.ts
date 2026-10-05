'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { searchHref, suggestionHref } from '../utils/suggestions';
import { useSearchSuggestions } from './useSearchSuggestions';
import { useSuggestionCursor, NO_ACTIVE } from './useSuggestionCursor';

/**
 * Everything the navbar search does, in one place: what has been typed, which
 * suggestion is highlighted, whether the palette is open, and where each of
 * the three ways out leads.
 *
 * WHY THE TYPED TEXT AND THE DISPLAYED TEXT ARE TWO THINGS
 * Baymard's testing found that most sites fail to copy the highlighted
 * suggestion up into the search field, and that visitors use suggestions as a
 * *starting point* they then edit — so arrowing onto "Nungi Photography" has
 * to put that text in the box, ready to be amended. But the request, and the
 * highlighting inside each row, must keep answering what the visitor actually
 * typed. Collapsing the two into one state makes the list re-query itself
 * every time you arrow down it, which is both wasteful and visibly wrong: the
 * list reshuffles under the highlight you are moving.
 *
 * So `typed` is the source of truth and `value` is what the input shows.
 * Editing the box always writes `typed` and drops the highlight.
 *
 * THREE WAYS OUT, AND THEY ARE NOT THE SAME DESTINATION
 *  - picking a suggestion goes straight to that vendor or event;
 *  - submitting raw text goes to the /vendors grid with `?q=`, which is the
 *    full search with facets, sorting and the relaxed any-word fallback;
 *  - Escape or a click outside just closes, changing nothing.
 *
 * Navigation is client-side (`router.push`) so the palette's result arrives
 * without a document reload — but the trigger underneath stays a real GET
 * form, so a visitor with no JS still reaches the second destination.
 */
export function useNavSearch() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { rows, term, isLoading, isRefreshing, isEmpty, isTooShort } = useSearchSuggestions(typed);

  /**
   * Closing also empties the box, so the navbar pill goes back to its
   * rotating placeholder rather than sitting there holding a half-finished
   * query from two pages ago.
   *
   * It does not touch the cursor, and must not: `setActiveIndex` comes from
   * the cursor hook, which takes `close` as its own argument, so reaching for
   * it here would be circular. It is unnecessary anyway — emptying the term
   * empties the rows, and the cursor resets itself whenever the row set
   * changes.
   */
  const close = useCallback(() => {
    setOpen(false);
    setTyped('');
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [router, close],
  );

  const select = useCallback(
    (index: number) => {
      const row = rows[index];
      if (row) go(suggestionHref(row));
    },
    [rows, go],
  );

  const submit = useCallback(() => {
    // An empty box has nothing to search for. Closing is the honest response;
    // sending the visitor to an unfiltered /vendors they did not ask for is
    // not.
    if (!typed.trim()) {
      close();
      return;
    }
    go(searchHref(typed));
  }, [typed, go, close]);

  const { activeIndex, setActiveIndex, handleKeyDown, activeRef } = useSuggestionCursor({
    count: rows.length,
    resetKey: term,
    onSelect: select,
    onSubmit: submit,
    onClose: close,
  });

  /**
   * What the input renders. The highlighted suggestion is copied up so it can
   * be edited; otherwise the visitor's own text stands.
   */
  const value = activeIndex === NO_ACTIVE ? typed : (rows[activeIndex]?.label ?? typed);

  /** Any edit is the visitor taking the query back from the highlight. */
  const change = useCallback(
    (next: string) => {
      setTyped(next);
      setActiveIndex(NO_ACTIVE);
    },
    [setActiveIndex],
  );

  const openWith = useCallback((seed = '') => {
    setOpen(true);
    if (seed) setTyped(seed);
  }, []);

  const clear = useCallback(() => {
    setTyped('');
    setActiveIndex(NO_ACTIVE);
    inputRef.current?.focus();
  }, [setActiveIndex]);

  // A route change means the palette did its job (or the visitor navigated
  // some other way while it was open). Either way it has no business
  // surviving onto the next page, where it would be floating over content the
  // visitor never asked to search.
  useEffect(() => {
    close();
  }, [pathname, close]);

  return {
    open,
    openWith,
    close,
    /** What the input shows — not necessarily what was typed. */
    value,
    /** What the suggestions answer, and what their labels highlight against. */
    typed,
    change,
    clear,
    submit,
    inputRef,
    rows,
    term,
    isLoading,
    isRefreshing,
    isEmpty,
    isTooShort,
    activeIndex,
    setActiveIndex,
    activeRef,
    handleKeyDown,
    select,
  };
}
