import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from './useDebouncedValue';

export type SearchTerm = {
  /** Live field value — bind to the controlled input. */
  input: string;
  setInput: (next: string) => void;
  /** Debounced, trimmed term to hand to a query; `undefined` when empty. */
  query: string | undefined;
  clear: () => void;
};

/**
 * A debounced, URL-mirrored free-text search term for a list view. The raw
 * `input` drives the field on every keystroke; the debounced `query` is what a
 * query should read and is written back to the URL (`?q=`) so a searched list
 * is refresh-safe and shareable.
 *
 * `onChange` fires whenever the debounced term changes — pass a page reset so a
 * new search starts on page 1 rather than a page that may not exist.
 */
export function useSearchTerm(opts?: {
  /** URL search param name. Defaults to `q`. */
  param?: string;
  /** Debounce window in ms. Defaults to 300. */
  delay?: number;
  onChange?: () => void;
}): SearchTerm {
  const { param = 'q', delay = 300, onChange } = opts ?? {};
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL seeds the initial value only; thereafter the field owns `input` and
  // pushes changes back to the URL, avoiding a URL<->state feedback loop.
  const [input, setInput] = useState(() => searchParams.get(param) ?? '');
  const debounced = useDebouncedValue(input, delay);
  const query = debounced.trim() || undefined;

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
    onChange?.();
    // `onChange`/`setSearchParams` are stable; re-run only when the term changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const clear = useCallback(() => setInput(''), []);

  return { input, setInput, query, clear };
}
