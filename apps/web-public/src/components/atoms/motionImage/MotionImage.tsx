'use client';

import Image, { type ImageProps } from 'next/image';
import { useEntranceMotion } from '@/hooks/useEntranceMotion';

/**
 * Drop-in `next/image` with a one-shot fade + gentle scale-down entrance the
 * first time it enters the viewport (or immediately, for anything already
 * above the fold on load). Built for full-bleed `fill` decorative photos,
 * where ScrollReveal can't be used as a wrapper: a `fill` image is
 * `position: absolute`, so animating a transform on a *wrapping* element would
 * make that wrapper a new containing block and break the image's sizing.
 * Animating the image itself sidesteps that entirely — same IntersectionObserver
 * primitive as ScrollReveal, zero extra dependencies, honours
 * `prefers-reduced-motion`, and stays a small client-only leaf so the server
 * component around it (copy, buttons, layout) isn't dragged into the client
 * bundle.
 */
export default function MotionImage({ style, alt, ...props }: ImageProps) {
  const { ref, shown } = useEntranceMotion<HTMLImageElement>();

  return (
    <Image
      {...props}
      alt={alt}
      ref={ref}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'scale(1)' : 'scale(1.045)',
        transition:
          'opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    />
  );
}
