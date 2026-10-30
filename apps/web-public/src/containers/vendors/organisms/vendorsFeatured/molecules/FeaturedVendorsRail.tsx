'use client';
import type { ReactNode } from 'react';
import { Box } from '@sinnapi/ui/atoms';
import RailNavButton from '@/containers/home/organisms/featuredVendors/atoms/RailNavButton';
import RailDots from '@/containers/home/organisms/featuredVendors/atoms/RailDots';
import { useVendorsFeaturedCarousel } from '../hooks/useVendorsFeaturedCarousel';

/** Slide width per breakpoint; a sliver of the next card stays visible as a scroll cue. */
const SLIDE_WIDTH = { xs: '82%', sm: '46%', md: '32%', lg: '24%' };

/**
 * Looping, auto-sliding rail. Slides are passed as children so the (server
 * rendered) vendor cards stay on the server; this component only owns motion.
 * Gap is applied as per-slide padding rather than flex `gap` so embla's loop
 * can measure slide distances accurately.
 */
export default function FeaturedVendorsRail({ children }: { children: ReactNode[] }) {
  const { emblaRef, selectedIndex, pageCount, scrollPrev, scrollNext, scrollTo } =
    useVendorsFeaturedCarousel();

  return (
    <Box sx={{ position: 'relative' }}>
      <RailNavButton direction="prev" disabled={false} onClick={scrollPrev} />

      <Box
        ref={emblaRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured vendors"
        sx={{ overflow: 'hidden', py: 1.5 }}
      >
        <Box sx={{ display: 'flex', ml: -1.5 }}>
          {children.map((child, i) => (
            <Box
              key={i}
              sx={{ flex: '0 0 auto', width: SLIDE_WIDTH, minWidth: 0, pl: 1.5, pr: 1.5 }}
            >
              {child}
            </Box>
          ))}
        </Box>
      </Box>

      <RailNavButton direction="next" disabled={false} onClick={scrollNext} />
      <RailDots count={pageCount} selectedIndex={selectedIndex} onSelect={scrollTo} />
    </Box>
  );
}
