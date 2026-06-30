import { Container, Grid } from '@sinnapi/ui';
import { SITE } from '@/lib/config/site';
import VendorDetailHero from './organisms/vendorDetailHero';
import VendorDetailHighlights from './organisms/vendorDetailHighlights';
import VendorDetailOverview from './organisms/vendorDetailOverview';
import VendorDetailGallery from './organisms/vendorDetailGallery';
import VendorDetailReviews from './organisms/vendorDetailReviews';
import VendorDetailSidebar from './organisms/vendorDetailSidebar';
import RelatedVendors from './organisms/relatedVendors';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import { getVendorDetailData } from './utils/getVendorDetailData';

/**
 * Vendor detail page. Composes the experience as: an immersive cover hero →
 * a key-facts highlights strip → a two-column body (about + portfolio + reviews
 * on the left, a sticky quote/contact card on the right) → a related-vendors
 * rail. Data (live with a mock fallback) and SEO structured data are resolved
 * here; presentation lives in the organisms.
 */
export default async function VendorDetailContainer({ params }: { params: { slug: string } }) {
  const { vendor, media, reviews, related } = await getVendorDetailData(params.slug);

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

        <Grid container spacing={{ xs: 4, md: 5 }} sx={{ mt: { xs: 1, md: 2 } }}>
          <Grid item xs={12} md={7} lg={8}>
            <VendorDetailOverview vendor={vendor} />
            <VendorDetailGallery media={media} vendorName={vendor.business_name} />
            <VendorDetailReviews vendor={vendor} reviews={reviews} />
          </Grid>
          <Grid item xs={12} md={5} lg={4}>
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
