import { Box, DetailTabPanel, Grid, QueryState } from '@sinnapi/ui';
import { BackButton, EmptyState } from '@sinnapi/ui/router';
import VendorIdentity from './components/molecules/VendorIdentity';
import VendorDetailTabs from './components/molecules/VendorDetailTabs';
import VendorReviews from './components/molecules/VendorReviews';
import VendorOverviewSection from './components/organisms/VendorOverviewSection';
import VendorMediaSection from './components/organisms/VendorMediaSection';
import VendorPackagesSection from './components/organisms/VendorPackagesSection';
import VendorAvailabilitySection from './components/organisms/VendorAvailabilitySection';
import VendorEngagePanel from './components/organisms/VendorEngagePanel';
import { useVendorDetailPage } from './hooks/useVendorDetailPage';

/**
 * A single vendor's public profile: who they are, the work they've shown, and
 * the ways to engage them.
 *
 * Two things sit above the tabs and never move: the identity block, which says
 * whose profile this is, and — on a phone — the engage panel, which is the only
 * part of the page that *does* anything. Everything below them is one of five
 * sections that each fit a screen. Stacked in one column, a portfolio of forty
 * photos sat between the price and the calendar, so a visitor checking a date
 * scrolled the vendor's entire body of work to reach it.
 *
 * Layout only — `useVendorDetailPage` owns the reads, the open section and the
 * breakpoint, and each section owns its own content.
 */
export default function VendorDetail() {
  const { vendor, isLoading, error, media, isMediaLoading, mediaError, tab, setTab, isCompact } =
    useVendorDetailPage();

  return (
    <QueryState isLoading={isLoading} error={error}>
      <Box sx={{ mb: 2 }}>
        <BackButton fallback="/discover" />
      </Box>

      {!vendor ? (
        <EmptyState
          title="Vendor not found"
          description="This vendor may no longer be available."
          ctaLabel="Back to discover"
          ctaHref="/discover"
        />
      ) : (
        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 3 }}>
              <VendorIdentity vendor={vendor} />
            </Box>

            {/* Above the tab bar and only on narrow screens, where the sidebar
                column has collapsed underneath the panel. See the note on the
                panel's `layout` prop. */}
            {isCompact && (
              <Box sx={{ mb: 3 }}>
                <VendorEngagePanel vendor={vendor} layout="compact" />
              </Box>
            )}

            <VendorDetailTabs value={tab} onChange={setTab} />

            <DetailTabPanel value="overview" active={tab} idPrefix="vendor">
              <VendorOverviewSection vendor={vendor} />
            </DetailTabPanel>
            <DetailTabPanel value="packages" active={tab} idPrefix="vendor">
              <VendorPackagesSection vendorId={vendor.id} vendorName={vendor.business_name} />
            </DetailTabPanel>
            <DetailTabPanel value="portfolio" active={tab} idPrefix="vendor">
              <VendorMediaSection
                items={media}
                vendorName={vendor.business_name}
                isLoading={isMediaLoading}
                error={mediaError}
              />
            </DetailTabPanel>
            <DetailTabPanel value="availability" active={tab} idPrefix="vendor">
              <VendorAvailabilitySection vendorId={vendor.id} />
            </DetailTabPanel>
            <DetailTabPanel value="reviews" active={tab} idPrefix="vendor">
              <VendorReviews vendor={vendor} />
            </DetailTabPanel>
          </Grid>

          {!isCompact && (
            <Grid item md={4}>
              <VendorEngagePanel vendor={vendor} layout="sidebar" />
            </Grid>
          )}
        </Grid>
      )}
    </QueryState>
  );
}
