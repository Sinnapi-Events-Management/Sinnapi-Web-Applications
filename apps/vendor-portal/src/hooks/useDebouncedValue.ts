import { useEffect, useState } from 'react';

/**
 * Returns `value` delayed by `delay` ms, collapsing rapid changes into a single
 * update. Used to keep keystroke-driven inputs (e.g. a search box) from firing a
 * query on every character — the query reads the debounced value instead.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
