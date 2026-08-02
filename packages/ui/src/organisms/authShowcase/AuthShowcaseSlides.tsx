'use client';
import { Box } from '../../atoms/Layout';
import { AuthShowcaseSlide } from './AuthShowcaseSlide';
import type { AuthShowcaseSlide as Slide } from './types';

export interface AuthShowcaseSlidesProps {
  slides: Slide[];
  activeIndex: number;
}

/**
 * Cross-slide stack: every slide is absolutely positioned in the same box, so
 * the card never reflows as copy changes. Only the active one is visible, and
 * `aria-live` announces it once per rotation for screen readers.
 */
export function AuthShowcaseSlides({ slides, activeIndex }: AuthShowcaseSlidesProps) {
  return (
    <Box
      aria-live="polite"
      // Absolutely-positioned slides can't size the container, so the box is
      // tall enough for the longest composition (icon + two-line headline +
      // three-line body + pills) to avoid overlapping the indicators.
      sx={{ position: 'relative', minHeight: { md: 292, lg: 306 } }}
    >
      {slides.map((slide, i) => {
        const active = i === activeIndex;
        return (
          <Box
            key={slide.title}
            aria-hidden={!active}
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: active ? 1 : 0,
              transform: active ? 'translateY(0)' : 'translateY(14px)',
              filter: active ? 'blur(0)' : 'blur(4px)',
              transition:
                'opacity .6s cubic-bezier(.22,.61,.36,1), transform .6s cubic-bezier(.22,.61,.36,1), filter .6s ease',
              pointerEvents: active ? 'auto' : 'none',
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'opacity .2s ease',
                transform: 'none',
                filter: 'none',
              },
            }}
          >
            <AuthShowcaseSlide slide={slide} />
          </Box>
        );
      })}
    </Box>
  );
}
