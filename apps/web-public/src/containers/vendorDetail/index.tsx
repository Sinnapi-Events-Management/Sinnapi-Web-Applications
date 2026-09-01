import { Container, Grid } from '@sinnapi/ui/atoms';
import { SITE } from '@/lib/config/site';
import VendorDetailHero from './organisms/vendorDetailHero';
import VendorDetailHighlights from './organisms/vendorDetailHighlights';
import VendorDetailTabs from './organisms/vendorDetailTabs';
import VendorDetailOverview from './organisms/vendorDetailOverview';
import VendorDetailGallery from './organisms/vendorDetailGallery';
import VendorDetailPackages from './organisms/vendorDetailPackages';
import VendorDetailReviews from './organisms/vendorDetailReviews';
import VendorDetailSidebar from './organisms/vendorDetailSidebar';
import RelatedVendors from './organisms/relatedVendors';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import { getVendorDetailData } from './utils/getVendorDetailData';

/**
 * Vendor detail page. Composes the experience as: an immersive cover hero →
 * a key-facts highlights strip → a two-column body (four tabbed sections on the
 * left, a quote/contact card on the right) → a related-vendors rail. Data (live
 * with a mock fallback) and SEO structured data are resolved here; presentation
 * lives in the organisms.
 *
 * The body used to be one column that stacked about, portfolio, packages and
 * reviews end to end, so a visitor who wanted the price scrolled through the
 * vendor's whole body of work to reach it — and back up again to compare. The
 * four sections are now tabs that each fit a screen.
 *
 * Every section is still rendered here, on the server, and handed to the
 * switcher as a slot. Only the switcher hydrates: the sections themselves stay
 * in the prerendered HTML whether or not their tab is the open one, because the
 * second reader of this page is a crawler and a profile whose prices and
 * reviews never reach the HTML is a profile that ranks for neither.
 *
 * The contact card leads on a phone and trails on desktop — `order` rather than
 * a second copy, so the actions are one element in the document however the
 * page is laid out.
 */
export default async function VendorDetailContainer({ params }: { params: { slug: string } }) {
  const { vendor, media, reviews, packages, related } = await getVendorDetailData(params.slug);

  // Structured data for SEO (LocalBusiness + AggregateRating).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: vendor.business_name,
    description: vendor.biography ?? undefined,
    image: vendor.primary_image_url ?? undefined,
    url: `${SITE.url}/vendors/${vendor.slug}`,
    address: vendor.base_city
      ? { '@type': 'PostalAddress', addressLocality: vendor.base_city }
      : undefined,
    aggregateRating:
      vendor.review_count > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: vendor.avg_rating,
            reviewCount: vendor.review_count,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <VendorDetailHero vendor={vendor} />

      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <VendorDetailHighlights vendor={vendor} />

        <Grid container spacing={{ xs: 3, md: 5 }} sx={{ mt: { xs: 0, md: 1 } }}>
          <Grid item xs={12} md={7} lg={8} sx={{ order: { xs: 2, md: 1 } }}>
            <VendorDetailTabs
              overview={<VendorDetailOverview vendor={vendor} />}
              packages={
                <VendorDetailPackages packages={packages} vendorName={vendor.business_name} />
              }
              portfolio={<VendorDetailGallery media={media} vendorName={vendor.business_name} />}
              reviews={<VendorDetailReviews vendor={vendor} reviews={reviews} />}
            />
          </Grid>

          <Grid item xs={12} md={5} lg={4} sx={{ order: { xs: 1, md: 2 } }}>
            <VendorDetailSidebar vendor={vendor} />
          </Grid>
        </Grid>
      </Container>

      <RelatedVendors vendors={related} />

      <MarketplaceCta
        title="Planning an event of your own?"
        subtitle="Browse real events and inspiration for ideas — or list your business and start getting booked by clients across the region."
        primary={{ label: 'Explore events', href: '/events' }}
        secondary={{ label: 'Become a vendor', href: '/apply' }}
      />
    </>
  );
}
