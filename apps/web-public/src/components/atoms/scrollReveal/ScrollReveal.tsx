'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box } from '@sinnapi/ui';
import type { SxProps, Theme } from '@sinnapi/ui';

type ScrollRevealProps = {
  children: ReactNode;
  /** Stagger delay in ms — pass `index * step` to cascade a list. */
  delay?: number;
  /** Initial downward offset in px before the element settles into place. */
  y?: number;
  /** Extra styles merged onto the wrapper (e.g. `height: '100%'` for grid cells). */
  sx?: SxProps<Theme>;
};

/**
 * Reveal-on-scroll wrapper. Fades + lifts its children into place the first time
 * they enter the viewport, then disconnects — a one-shot, GPU-only transition
 * (opacity + transform) that stays cheap on the main thread.
 *
 * Deliberately framework-free (no animation dependency): a single
 * IntersectionObserver drives a CSS transition. Honours `prefers-reduced-motion`
 * and degrades gracefully where IO is unavailable by showing content immediately,
 * so the copy is never trapped behind an animation that won't run.
 */
export default function ScrollReveal({ children, delay = 0, y = 24, sx }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry], obs) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : `translateY(${y}px)`,
        transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        // Only hint the compositor while a transition is still pending.
        willChange: shown ? 'auto' : 'opacity, transform',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
