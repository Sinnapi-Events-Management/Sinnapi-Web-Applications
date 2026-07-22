'use client';
import { Box } from '@sinnapi/ui/atoms';
import VendorCard from '@/components/molecules/vendorCard';
import type { FeaturedVendorModel } from '@/lib/types';
import { useFeaturedVendorsCarousel } from '../hooks/useFeaturedVendorsCarousel';
import RailNavButton from '../atoms/RailNavButton';
import RailDots from '../atoms/RailDots';

/**
 * Slide width per breakpoint, as a share of the viewport. Each stop is set so a
 * sliver of the following card stays visible — the peek is what tells a visitor
 * the rail scrolls, without a label or extra chrome. The widths intentionally
 * don't divide evenly into 100%.
 */
const SLIDE_WIDTH = { xs: '80%', sm: '46%', md: '32%', lg: '25%' };

/**
 * Horizontal carousel of featured vendors. Ten or fifty paid placements occupy
 * exactly one card's height, so the section scales with the vendor base instead
 * of pushing the rest of the home page down the fold. All carousel state is
 * owned by `useFeaturedVendorsCarousel`; this component only lays it out.
 */
export default function FeaturedVendorsRail({ vendors }: { vendors: FeaturedVendorModel[] }) {
  const {
    emblaRef,
    selectedIndex,
    pageCount,
    canScrollPrev,
    canScrollNext,
    scrollPrev,
    scrollNext,
    scrollTo,
  } = useFeaturedVendorsCarousel();

  return (
    <Box sx={{ position: 'relative' }}>
      <RailNavButton direction="prev" disabled={!canScrollPrev} onClick={scrollPrev} />

      {/* Embla viewport — clips the track; overflow-y stays visible so the
          cards' hover lift and shadow aren't sheared off at the top. */}
      <Box
        ref={emblaRef}
        role="region"
        aria-label="Featured vendors"
        sx={{ overflowX: 'hidden', overflowY: 'visible', py: 1 }}
      >
        {/* Embla track — a single gap controls all card spacing. */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {vendors.map((vendor) => (
            <Box key={vendor.id} sx={{ flex: '0 0 auto', width: SLIDE_WIDTH }}>
              <VendorCard vendor={vendor} categories={vendor.categories} />
            </Box>
          ))}
        </Box>
      </Box>

      <RailNavButton direction="next" disabled={!canScrollNext} onClick={scrollNext} />

      <RailDots count={pageCount} selectedIndex={selectedIndex} onSelect={scrollTo} />
    </Box>
  );
}
