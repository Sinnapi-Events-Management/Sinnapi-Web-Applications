import { Box, Container } from '@sinnapi/ui/atoms';
import { palette, withAlpha } from '@sinnapi/ui/tokens';
import SectionHeading from '@/components/molecules/sectionHeading';
import ScrollReveal from '@/components/atoms/scrollReveal';
import type { VendorListingModel } from '@/lib/types';
import FeaturedVendorCard from './molecules/FeaturedVendorCard';
import FeaturedVendorsRail from './molecules/FeaturedVendorsRail';

const GOLD = palette.light.secondary;

/**
 * Featured vendors spotlight — paid placements shown first on the default view.
 * Sits on a subtle gold-tinted band so it reads as a distinct premium tier, and
 * presents every featured vendor in an infinite, auto-sliding carousel so the
 * section scales to any number of paid vendors without growing vertically.
 * Autoplay pauses on hover/focus; the cards themselves stay server-rendered and
 * are passed into the client rail as children.
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

      <Container>
        {/* Reveal the rail as a whole: per-card reveals would leave off-screen
            slides blank as they slide into view. */}
        <ScrollReveal>
          <FeaturedVendorsRail>
            {vendors.map((vendor) => (
              <FeaturedVendorCard key={vendor.id} vendor={vendor} />
            ))}
          </FeaturedVendorsRail>
        </ScrollReveal>
      </Container>
    </Box>
  );
}
