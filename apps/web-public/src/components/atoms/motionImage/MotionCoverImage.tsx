'use client';

import type { CSSProperties } from 'react';
import { Box } from '@sinnapi/ui/atoms';
import { useEntranceMotion } from '@/hooks/useEntranceMotion';

export type MotionCoverImageProps = {
  src: string;
  alt: string;
  sx?: Record<string, unknown>;
};

const baseStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

/**
 * Plain `<img>` counterpart to MotionImage, for cover photos whose URL is
 * arbitrary (Supabase storage / CMS) and so bypasses next/image's optimizer —
 * see EventDetailHero / VendorDetailHero. Same fade + scale-in entrance, same
 * IntersectionObserver primitive, same reasoning for animating the element
 * itself rather than a wrapper (it's absolutely positioned to fill its parent).
 */
export default function MotionCoverImage({ src, alt, sx }: MotionCoverImageProps) {
  const { ref, shown } = useEntranceMotion<HTMLImageElement>();

  return (
    <Box
      component="img"
      ref={ref}
      src={src}
      alt={alt}
      sx={{
        ...baseStyle,
        opacity: shown ? 1 : 0,
        transform: shown ? 'scale(1)' : 'scale(1.045)',
        transition:
          'opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: shown ? 'auto' : 'opacity, transform',
        ...sx,
      }}
    />
  );
}
