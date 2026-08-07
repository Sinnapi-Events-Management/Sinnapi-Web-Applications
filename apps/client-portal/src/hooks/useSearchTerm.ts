import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type SearchTerm = {
  /** Live field value — bind to the controlled input. */
  input: string;
  setInput: (next: string) => void;
  /** Debounced, trimmed term to hand to a query; `undefined` when empty. */
  query: string | undefined;
  /** Apply what's typed right now, skipping the rest of the debounce window. */
  flush: () => void;
  clear: () => void;
  /** A debounce window is open: what's on screen is about to be replaced. */
  isPending: boolean;
};

/**
 * A debounced, URL-mirrored free-text search term for a list view. The raw
 * `input` drives the field on every keystroke; the debounced `query` is what a
 * query should read and is written back to the URL (`?q=`) so a searched list
 * is refresh-safe and shareable.
 *
 * The debounce is what makes a server-side search affordable: one request per
 * pause, not one per character. It owns its own timer rather than composing
 * `useDebouncedValue` because two moments have to *skip* the wait entirely:
 *
 *  - **Enter.** Someone who types and submits has already told us they're done;
 *    making them sit out the remaining window reads as a dropped keypress.
 *  - **Clear.** Pressing the ✕ is an undo, and an undo that takes 300ms to show
 *    up feels broken in a way that a delayed *search* never does.
 *
 * `isPending` exposes the open window so a caller can react the instant a key
 * lands — dimming results at keystroke time rather than 300ms later is the
 * difference between a search that feels immediate and one that feels stuck.
 */
export function useSearchTerm(opts?: {
  /** URL search param name. Defaults to `q`. */
  param?: string;
  /** Debounce window in ms. Defaults to 300. */
  delay?: number;
}): SearchTerm {
  const { param = 'q', delay = 300 } = opts ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL seeds the initial value only; thereafter the field owns `input` and
  // pushes changes back to the URL, avoiding a URL<->state feedback loop. The
  // committed term starts in step with it, so a bookmarked search queries on
  // first paint instead of waiting out a window nobody opened.
  const initial = searchParams.get(param) ?? '';
  const [input, setInput] = useState(initial);
  const [term, setTerm] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const commit = useCallback((next: string) => {
    clearTimeout(timer.current);
    setTerm(next);
  }, []);

  useEffect(() => {
    timer.current = setTimeout(() => setTerm(input), delay);
    return () => clearTimeout(timer.current);
  }, [input, delay]);

  const query = term.trim() || undefined;

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (query) next.set(param, query);
        else next.delete(param);
        return next;
      },
      { replace: true },
    );
    // `setSearchParams` is stable; re-run only when the committed term changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const flush = useCallback(() => commit(input), [commit, input]);

  const clear = useCallback(() => {
    setInput('');
    commit('');
  }, [commit]);

  return {
    input,
    setInput,
    query,
    flush,
    clear,
    // Compared trimmed, so typing a trailing space doesn't pretend a request is
    // coming when the term the query reads hasn't actually changed.
    isPending: input.trim() !== term.trim(),
  };
}
