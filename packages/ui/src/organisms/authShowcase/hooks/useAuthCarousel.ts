'use client';
import { useCallback, useEffect, useState } from 'react';
import { AUTH_SHOWCASE_ROTATE_MS } from '../types';

export interface UseAuthCarouselOptions {
  count: number;
  intervalMs?: number;
  /** Set false to hold on the current slide (e.g. while hovered). */
  enabled?: boolean;
}

/**
 * Drives the sliding showcase copy: auto-advances on an interval and restarts
 * the timer whenever the user picks a slide manually, so a deliberate choice
 * isn't overwritten a moment later.
 */
export function useAuthCarousel({
  count,
  intervalMs = AUTH_SHOWCASE_ROTATE_MS,
  enabled = true,
}: UseAuthCarouselOptions) {
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0); // bump to restart the interval on manual selection

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!enabled || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs, enabled, tick]);

  // A shrinking slide list must not strand the index past the end.
  useEffect(() => {
    setIndex((i) => (i < count ? i : 0));
  }, [count]);

  return { index, goTo };
}
