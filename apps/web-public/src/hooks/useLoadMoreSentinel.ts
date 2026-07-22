'use client';
import { useEffect, useRef } from 'react';

/** How far below the viewport the sentinel starts loading — roughly one screen. */
const ROOT_MARGIN = '600px';

/**
 * Fetches the next page as the sentinel approaches the viewport.
 *
 * This *supplements* the "Load more" button rather than replacing it. Pure
 * infinite scroll is an accessibility trap — there's nothing to tab to, screen
 * readers get no announcement that more exists, and the footer retreats forever
 * — so the button stays the real, focusable control and this just means most
 * visitors never need to press it.
 *
 * Guarded on `enabled` (which the caller sets false while a fetch is in flight
 * or the list is exhausted) because the observer fires repeatedly while the
 * sentinel sits in view.
 */
export function useLoadMoreSentinel({
  enabled,
  onIntersect,
}: {
  enabled: boolean;
  onIntersect: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Read the latest callback without re-creating the observer on every render.
  const handler = useRef(onIntersect);
  handler.current = onIntersect;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) handler.current();
      },
      { rootMargin: ROOT_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}
