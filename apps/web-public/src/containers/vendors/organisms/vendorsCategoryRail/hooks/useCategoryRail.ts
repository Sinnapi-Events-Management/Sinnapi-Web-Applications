'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scroll behaviour for the category row: which arrows to show, how far they
 * scroll, and keeping the selected tile in view.
 *
 * Edge state is derived from the scroll position (with a 4px tolerance for
 * sub-pixel rounding) and re-measured on resize, so the arrows are correct on
 * first paint at any width and after rotation — not just after the first scroll.
 * Touch devices never need the arrows, but the same flags drive the edge fades.
 */
export function useCategoryRail(selected: string | undefined) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  // A category chosen from a shared link, the hero chips or the back button may
  // sit far off-screen; bring it into the middle so the selection is visible.
  useEffect(() => {
    const el = railRef.current;
    const tile = el?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el || !tile) return;
    const target = tile.offsetLeft - (el.clientWidth - tile.offsetWidth) / 2;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [selected]);

  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }, []);

  return { railRef, edges, measure, scrollByPage };
}
