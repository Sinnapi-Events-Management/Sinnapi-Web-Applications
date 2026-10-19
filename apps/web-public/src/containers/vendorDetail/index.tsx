import NextLink from 'next/link';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { Button, Container, Grid, Stack, Typography } from '@sinnapi/ui/atoms';
import { SITE, clientPortalVendorUrl } from '@/lib/config/site';
import VendorDetailTabs from './organisms/vendorDetailTabs';
import VendorDetailOverview from './organisms/vendorDetailOverview';
import VendorDetailGallery from './organisms/vendorDetailGallery';
import VendorDetailPackages from './organisms/vendorDetailPackages';
import VendorDetailOffers from './organisms/vendorDetailOffers';
import VendorDetailReviews from './organisms/vendorDetailReviews';
import VendorDetailSidebar from './organisms/vendorDetailSidebar';
import RelatedVendors from './organisms/relatedVendors';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import { getVendorDetailData } from './utils/getVendorDetailData';

/**
 * Vendor detail page. Leads with a compact vendor identity row and the full
 * photo gallery, followed by key facts and a two-column body (three tabbed sections
 * on the left, a quote/contact card on the right) → a related-vendors rail.
 * Data (live with a mock fallback) and SEO structured data are resolved here;
 * presentation lives in the organisms.
 *
 * The gallery leads so visitors see the vendor's work without scrolling past
 * profile details. Overview, packages and reviews remain switchable below it,
 * rather than becoming a long sequence a visitor has to scroll through.
 *
 * The tab panels are still rendered here, on the server, and handed to the
 * switcher as slots. Only the switcher hydrates: the sections stay in the
 * prerendered HTML whether or not their tab is open, so crawlers can read the
 * vendor's biography, packages and reviews.
 *
 * The contact card leads within the lower profile section on a phone and trails
 * on desktop — `order` rather than a second copy, so the actions are one
 * element in the document however the page is laid out.
 */
export default async function VendorDetailContainer({ params }: { params: { slug: string } }) {
  const { vendor, media, reviews, packages, packageOffers, offers, related } =
    await getVendorDetailData(params.slug);

  /**
   * Where every gated CTA on this page goes: the same vendor's profile in the
   * client portal. Resolved here, once, and passed into the two sections that
   * hydrate — `NEXT_CLIENT_PORTAL_URL` carries no `NEXT_PUBLIC_` prefix, so it
   * is absent from the browser bundle and those client components cannot read
   * it themselves. The sidebar is a server component and calls the helper
   * directly.
   */
  const packagesHref = clientPortalVendorUrl(vendor.slug, 'packages');
  const offersHref = clientPortalVendorUrl(vendor.slug, 'offers');

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

      <Container sx={{ pt: { xs: 2, md: 3 }, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }} sx={{ minWidth: 0 }}>
          <Button
            component={NextLink}
            href="/vendors"
            variant="text"
            startIcon={<ArrowBack />}
            sx={{ flexShrink: 0 }}
          >
            Back
          </Button>
          <Typography
            component="h1"
            variant="h4"
            sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {vendor.business_name}
          </Typography>
        </Stack>
      </Container>

      <Container sx={{ pb: { xs: 3, md: 5 } }}>
        <VendorDetailGallery media={media} vendorName={vendor.business_name} />
      </Container>

      <Container sx={{ pb: { xs: 4, md: 6 } }}>
        {/* Above the tabs, not inside one. An offer is not a section of a
            profile — it is a fact about every price on it — and a visitor who
            never opens a tab would read the list prices as the prices.
            It is also the one time-limited thing on the page, which is a poor
            fit for anything a click away. */}
        <VendorDetailOffers
          offers={offers}
          vendorName={vendor.business_name}
          portalProfileHref={offersHref}
        />

        <Grid container spacing={{ xs: 3, md: 5 }} sx={{ mt: { xs: 0, md: 1 } }}>
          <Grid item xs={12} md={7} lg={8} sx={{ order: { xs: 2, md: 1 } }}>
            <VendorDetailTabs
              overview={<VendorDetailOverview vendor={vendor} />}
              packages={
                <VendorDetailPackages
                  packages={packages}
                  vendorName={vendor.business_name}
                  packageOffers={packageOffers}
                  portalProfileHref={packagesHref}
                />
              }
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
