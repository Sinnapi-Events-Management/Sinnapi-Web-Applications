import NextLink from 'next/link';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { Button, Container, Grid, Stack, Typography } from '@sinnapi/ui/atoms';
import { SITE, clientPortalVendorUrl, formatMoney } from '@/lib/config/site';
import VendorDetailTabs from './organisms/vendorDetailTabs';
import VendorDetailOverview from './organisms/vendorDetailOverview';
import VendorDetailGallery from './organisms/vendorDetailGallery';
import VendorDetailPackages from './organisms/vendorDetailPackages';
import VendorDetailOffers from './organisms/vendorDetailOffers';
import VendorDetailReviews from './organisms/vendorDetailReviews';
import VendorDetailSidebar from './organisms/vendorDetailSidebar';
import VendorDetailCtaBar from './organisms/vendorDetailCtaBar';
import RelatedVendors from './organisms/relatedVendors';
import MarketplaceCta from '@/components/organisms/marketplaceCta';
import { getVendorDetailData } from './utils/getVendorDetailData';

/**
 * Vendor detail page. A compact identity row, then a two-column body — four
 * tabbed sections on the left, a quote/contact card on the right — and a
 * related-vendors rail. Data (live with a mock fallback) and SEO structured
 * data are resolved here; presentation lives in the organisms.
 *
 * The photo gallery used to be rendered full-width between the title and the
 * tabs. It is now the first tab instead, and the default one, so the page
 * still opens on the vendor's work. The change is for the vendors who publish
 * twenty or thirty photos: those galleries put every one of them between the
 * visitor and the tab bar, the prices, the reviews and the quote button, and
 * visitors stopped before reaching any of it. As a tab it keeps the same
 * prominence while the sticky bar above it makes the rest of the profile one
 * tap away. See `utils/tabs` for what that does to the canonical URL.
 *
 * The tab panels are still rendered here, on the server, and handed to the
 * switcher as slots. Only the switcher and the two client sections hydrate:
 * the sections stay in the prerendered HTML whether or not their tab is open,
 * so crawlers can read the vendor's gallery, biography, packages and reviews.
 *
 * The contact card trails the tabs in both layouts now — a sticky right-hand
 * column on desktop, the last block on a phone. It used to be reordered above
 * the tab bar on small screens, back when the card was the only place the
 * actions existed and burying it under a tabbed panel would have hidden them.
 * `VendorDetailCtaBar` has taken that job: below `md` the same two actions are
 * fixed to the bottom of the viewport, so the card no longer has to come first
 * to be reachable — and making it come first was costing the thing the page is
 * for. Instagram and Pinterest open on the work, not on a price and a pair of
 * buttons, because photos are how a visitor decides whether the rest of the
 * profile is worth their time. The gallery now gets that first screen.
 *
 * The card is still the bar's anchor: the bar is up whenever these buttons are
 * off screen and retracts while they are in view, so the two actions are never
 * on screen twice.
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
  // Resolved here too, for the fixed mobile bar. The sidebar calls the helper
  // itself because it is a server component; the bar is not, and `NEXT_CLIENT_
  // PORTAL_URL` is absent from the browser bundle — so it, like the two tabbed
  // client sections above, is handed the finished href.
  const portalProfileHref = clientPortalVendorUrl(vendor.slug);

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

      <Container sx={{ pb: { xs: 4, md: 6 } }}>
        {/* Above the tabs, not inside one. An offer is not a section of a
            profile — it is a fact about every price on it — and a visitor who
            never opens a tab would read the list prices as the prices.
            It is also the one time-limited thing on the page, which is a poor
            fit for anything a click away. */}
        {offers.length > 0 && (
          <VendorDetailOffers
            offers={offers}
            vendorName={vendor.business_name}
            portalProfileHref={offersHref}
          />
        )}

        {/* No `mt` on `xs`. MUI gives a spaced container a negative row margin
            that cancels its items' top padding, and the `xs: 0` that used to
            sit here overrode it — leaving a 24px gap of nothing between the
            title and the tab bar on exactly the screens with none to spare. */}
        <Grid container spacing={{ xs: 3, md: 5 }} sx={{ mt: { md: 1 } }}>
          <Grid item xs={12} md={7} lg={8}>
            <VendorDetailTabs
              gallery={<VendorDetailGallery media={media} vendorName={vendor.business_name} />}
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

      {/* Last in the document although it paints over the middle of it: it is
          `position: fixed`, so this position buys nothing visually and
          everything for the keyboard — a bar sitting earlier in the markup
          would drop a visitor tabbing through the profile into the footer's
          two buttons and back out again. */}
      <VendorDetailCtaBar
        vendorName={vendor.business_name}
        price={formatMoney(vendor.starting_price, vendor.starting_price_currency)}
        portalProfileHref={portalProfileHref}
      />
    </>
  );
}
