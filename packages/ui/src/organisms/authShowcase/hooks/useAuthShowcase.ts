'use client';
import { useAuthCarousel } from './useAuthCarousel';
import { useReducedMotion } from './useReducedMotion';

export interface UseAuthShowcaseOptions {
  count: number;
  rotateMs: number;
}

/**
 * State for the showcase panel.
 *
 * Rotation deliberately does NOT pause on hover or focus: the panel covers most
 * of the auth screen, so a cursor resting anywhere over it — or focus parked on
 * an indicator after a click — would freeze the carousel for the whole session.
 * The pause affordance required for auto-updating content is instead
 * `prefers-reduced-motion`, which holds the first slide and hands control to the
 * indicator buttons.
 */
export function useAuthShowcase({ count, rotateMs }: UseAuthShowcaseOptions) {
  const reducedMotion = useReducedMotion();
  const { index, goTo } = useAuthCarousel({
    count,
    intervalMs: rotateMs,
    enabled: !reducedMotion,
  });

  return { index, goTo, autoRotating: !reducedMotion };
}
