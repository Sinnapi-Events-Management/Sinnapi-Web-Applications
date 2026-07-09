import { useCallback, useEffect, useState } from 'react';
import { AUTH_ROTATE_MS, AUTH_SLIDES } from '../authContent';

// Drives the sliding showcase text: auto-advances on an interval, and restarts
// the timer whenever the user picks a slide manually so it doesn't jump instantly.
export function useAuthCarousel(count: number = AUTH_SLIDES.length, intervalMs = AUTH_ROTATE_MS) {
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0); // bump to restart the interval on manual selection

  const goTo = useCallback((next: number) => {
    setIndex(next);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs, tick]);

  return { index, goTo };
}
