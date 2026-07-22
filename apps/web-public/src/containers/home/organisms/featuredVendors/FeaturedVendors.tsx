import { Container } from '@sinnapi/ui/atoms';
import SectionHeading from '@/components/molecules/sectionHeading';
import EmptyState from '@/components/molecules/emptyState';
import type { FeaturedVendorModel } from '@/lib/types';
import FeaturedVendorsGrid from './molecules/FeaturedVendorsGrid';
import FeaturedVendorsRail from './molecules/FeaturedVendorsRail';

/**
 * Above this many featured vendors a grid would push the rest of the page below
 * the fold, so the section switches to the scrolling rail. At or below it, the
 * grid is both calmer and cheaper (no client JS).
 */
const RAIL_THRESHOLD = 3;

/**
 * "Featured vendors" — the paid-placement spotlight. Presentational only: the
 * vendors (and their categories) arrive already ranked from
 * `list_featured_vendors_public`, so nothing is sorted or sliced here.
 */
export default function FeaturedVendors({ vendors }: { vendors: FeaturedVendorModel[] }) {
  return (
    <Container sx={{ py: { xs: 6, md: 9 } }}>
      <SectionHeading
        overline="Handpicked"
        title="Featured vendors"
        subtitle="Top-rated, verified providers ready for your next event."
      />
      {vendors.length === 0 ? (
        <EmptyState
          title="Featured vendors coming soon"
          description="Verified vendors will appear here once onboarded."
          ctaLabel="Browse all vendors"
          ctaHref="/vendors"
        />
      ) : vendors.length <= RAIL_THRESHOLD ? (
        <FeaturedVendorsGrid vendors={vendors} />
      ) : (
        <FeaturedVendorsRail vendors={vendors} />
      )}
    </Container>
  );
}
