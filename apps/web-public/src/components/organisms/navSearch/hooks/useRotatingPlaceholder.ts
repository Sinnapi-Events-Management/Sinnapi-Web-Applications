'use client';
import { useEffect, useState } from 'react';

/** How long each phrase rests before sliding to the next. */
export const ROTATE_MS = 3200;
/** Slide duration — kept in sync with the CSS transition on the track. */
export const TRANSITION_MS = 600;

/**
 * Drives an infinite, upward-sliding placeholder rotation.
 *
 * Returns the active `index` (0…`count`, where index `count` is a trailing clone
 * of the first item that lets the wrap-around keep sliding *up* rather than
 * snapping backwards) and whether the track should animate.
 *
 * Respects `prefers-reduced-motion` (resolved once at mount, mirroring
 * useClientsCarousel): those users simply see the first phrase, statically.
 * Rotation also halts whenever `paused` is true (e.g. the field is focused).
 */
export function useRotatingPlaceholder(count: number, paused = false) {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const active = enabled && !paused && count > 1;

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [active]);

  // Landed on the trailing clone → let the slide finish, then jump back to the
  // real first item with animation disabled so the reset is imperceptible.
  useEffect(() => {
    if (index !== count) return;
    const id = setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, TRANSITION_MS);
    return () => clearTimeout(id);
  }, [index, count]);

  // Re-arm the transition on the frame after an instant reset.
  useEffect(() => {
    if (animate) return;
    const raf = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return { index, animate };
}
