import { Container } from '@sinnapi/ui';
import SectionHeading from '@/components/molecules/sectionHeading';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import VendorsHero from './organisms/vendorsHero';
import VendorsFeatured from './organisms/vendorsFeatured';
import VendorsToolbar from './organisms/vendorsToolbar';
import VendorsResults from './organisms/vendorsResults';
import type { VendorsSearchParams } from './utils/filterVendors';
import { getVendorsData } from './utils/getVendorsData';

/**
 * Vendors page. Composes the experience as: a search-led hero → a featured
 * (paid placement) spotlight on the default view → a refinement toolbar → the
 * results grid. Search & filtering are URL-driven and resolved server-side in
 * `getVendorsData` (with a mock fallback while the table is empty); presentation
 * lives in the organisms, so this file only sequences them and threads the
 * current query through.
 */
export default async function VendorsContainer({
  searchParams,
}: {
  searchParams: VendorsSearchParams;
}) {
  const { featured, vendors, total, activeFilters } = await getVendorsData(searchParams);
  const hasFeatured = featured.length > 0;

  return (
    <>
      <VendorsHero defaults={searchParams} />
      {hasFeatured && <VendorsFeatured vendors={featured} />}
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        {hasFeatured && <SectionHeading overline="Browse" title="All vendors" />}
        <VendorsToolbar
          defaults={searchParams}
          resultCount={vendors.length}
          total={total}
          activeFilters={activeFilters}
        />
        <VendorsResults vendors={vendors} activeFilters={activeFilters} />
      </Container>
      <MarketplaceCta
        title="Bring your whole event together"
        subtitle="You've found the vendors — now explore real events and inspiration to picture how it all comes together. Or, if you're a provider, join Sinnapi and get booked by clients searching right now."
        primary={{ label: 'Explore events', href: '/events' }}
        secondary={{ label: 'Become a vendor', href: '/apply' }}
      />
    </>
  );
}
