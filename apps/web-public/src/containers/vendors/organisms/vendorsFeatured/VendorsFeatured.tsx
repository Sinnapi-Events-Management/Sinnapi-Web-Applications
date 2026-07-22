import { Box, Container } from '@sinnapi/ui/atoms';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
import type { VendorListingModel } from '@/lib/types';
import FeaturedVendorCard from './molecules/FeaturedVendorCard';

const GOLD = palette.light.secondary;

/**
 * Featured vendors spotlight — paid placements shown first on the default view.
 * Sits on a subtle gold-tinted band so it reads as a distinct premium tier, and
 * presents every featured vendor in a horizontal scroll-snap rail so the section
 * scales to any number of paid vendors without growing vertically. The rail is
 * CSS-only (no client JS): native horizontal scroll with snap points, the next
 * card peeking to signal more.
 *
 * Server-rendered in full and handed to `VendorsBrowser` as a slot, which mounts
 * it only on the default view — a paid-placement rail has no business talking
 * over a visitor who has already told us what they're looking for.
 */
export default function VendorsFeatured({ vendors }: { vendors: VendorListingModel[] }) {
  if (vendors.length === 0) return null;

  return (
    <Box
      sx={{
        py: { xs: 5, md: 7 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        background: `linear-gradient(180deg, ${withAlpha(GOLD.light, 0.16)} 0%, ${withAlpha(GOLD.light, 0.04)} 100%)`,
      }}
    >
      <Container>
        <SectionHeading
          overline="Handpicked & verified"
          title="Featured vendors"
          subtitle="Premium, top-rated providers ready to make your event unforgettable."
        />
      </Container>

      {/* Horizontal scroll-snap rail. Full-bleed-ish padding aligns the first card
          with the Container gutter while letting later cards peek past the edge. */}
      <Box
        role="region"
        aria-label="Featured vendors"
        tabIndex={0}
        sx={{
          display: 'flex',
          gap: 3,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollPaddingLeft: { xs: 16, sm: 24 },
          px: { xs: 2, sm: 3 },
          pb: 2,
          // Center the rail's content with the page Container on wide screens.
          maxWidth: 'lg',
          mx: 'auto',
          // Thin, on-brand scrollbar; momentum scroll on touch.
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: `${withAlpha(GOLD.main, 0.5)} transparent`,
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: withAlpha(GOLD.main, 0.5),
            borderRadius: 999,
          },
          '&:focus-visible': { outline: `2px solid ${GOLD.main}`, outlineOffset: 2 },
        }}
      >
        {vendors.map((vendor) => (
          <Box
            key={vendor.id}
            sx={{
              flex: '0 0 auto',
              width: { xs: '82%', sm: 320, md: 300 },
              scrollSnapAlign: 'start',
            }}
          >
            <FeaturedVendorCard vendor={vendor} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
