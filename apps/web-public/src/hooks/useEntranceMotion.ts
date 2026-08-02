'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * One-shot "has this element entered the viewport yet" flag, backed by a single
 * IntersectionObserver per element. Shared by ScrollReveal and the MotionImage
 * atoms so every entrance animation on the site (wrapped content or a bare
 * `fill` image) is driven by the same zero-dependency primitive. Honours
 * `prefers-reduced-motion` and degrades to "already shown" when IO is
 * unavailable, so content is never trapped behind an animation that won't run.
 */
export function useEntranceMotion<T extends HTMLElement>() {
  const ref = useRef<T>(null);
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
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, shown };
}
