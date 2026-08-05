'use client';
import { Box } from '../../atoms/Layout';
import { AuthShowcaseSlide } from './AuthShowcaseSlide';
import type { AuthShowcaseSlide as Slide } from './types';

export interface AuthShowcaseSlidesProps {
  slides: Slide[];
  activeIndex: number;
}

const EASE = 'cubic-bezier(.22,.61,.36,1)';

/** Cross-fade styling for one slot in the stack. Kept out of the component so
 *  the markup below stays readable at a glance. */
const slideSx = (active: boolean) =>
  ({
    // Every slide occupies the same cell, so the stack is as tall as the
    // tallest slide and never reflows as copy rotates.
    gridArea: '1 / 1',
    opacity: active ? 1 : 0,
    transform: active ? 'translateY(0)' : 'translateY(14px)',
    filter: active ? 'blur(0)' : 'blur(4px)',
    transition: `opacity .6s ${EASE}, transform .6s ${EASE}, filter .6s ease`,
    // Inactive slides still paint over the active one in the same cell.
    pointerEvents: active ? 'auto' : 'none',
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'opacity .2s ease',
      transform: 'none',
      filter: 'none',
    },
  }) as const;

/**
 * Cross-slide stack: every slide is laid into the same grid cell, so the
 * container sizes itself to the tallest slide instead of a hardcoded height.
 * That keeps the card free of dead space when an app's copy is short (no icon,
 * no stats) while still holding a stable height across rotations. Only the
 * active slide is visible, and `aria-live` announces it once per rotation.
 */
export function AuthShowcaseSlides({ slides, activeIndex }: AuthShowcaseSlidesProps) {
  return (
    <Box aria-live="polite" sx={{ display: 'grid' }}>
      {slides.map((slide, i) => {
        const active = i === activeIndex;
        return (
          <Box key={slide.title} aria-hidden={!active} sx={slideSx(active)}>
            <AuthShowcaseSlide slide={slide} />
          </Box>
        );
      })}
    </Box>
  );
}
