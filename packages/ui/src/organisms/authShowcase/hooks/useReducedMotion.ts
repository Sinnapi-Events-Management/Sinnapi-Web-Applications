'use client';
import { useEffect, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion`. Starts `false` so server/first render matches
 * the animated default, then corrects on mount and on every OS-level change.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
