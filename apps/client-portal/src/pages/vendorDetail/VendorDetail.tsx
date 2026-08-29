import { Grid, Box, Divider, QueryState } from '@sinnapi/ui';
import VendorHeadline from './components/molecules/VendorHeadline';
import VendorReviews from './components/molecules/VendorReviews';
import VendorMediaSection from './components/organisms/VendorMediaSection';
import VendorPackagesSection from './components/organisms/VendorPackagesSection';
import VendorAvailabilitySection from './components/organisms/VendorAvailabilitySection';
import VendorBookingPanel from './components/organisms/VendorBookingPanel';
import { useVendorDetail } from './hooks/useVendorDetail';
import { BackButton, EmptyState } from '@sinnapi/ui/router';

/**
 * A single vendor's public profile: who they are, the work they've shown, and
 * the ways to engage them. Layout only — each section owns its own content, and
 * `useVendorDetail` owns the reads.
 */
export default function VendorDetail() {
  const { vendor, isLoading, error, media, isMediaLoading, mediaError } = useVendorDetail();

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
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <VendorHeadline vendor={vendor} />
            <VendorMediaSection
              items={media}
              vendorName={vendor.business_name}
              isLoading={isMediaLoading}
              error={mediaError}
            />
            {/* Above availability and reviews: "what does this cost and what do
                I get" is the question a visitor arrives with, and every section
                below only gets asked once that one is answered. The section
                renders nothing when the vendor publishes no packages, so a
                bespoke-only vendor's profile is unchanged. */}
            <VendorPackagesSection vendorId={vendor.id} vendorName={vendor.business_name} />

            {/* Between the portfolio and the reviews on purpose: a visitor has
                just decided they like the work and has not yet decided to
                trust it, and "can they even do my date?" is the question that
                falls in that gap. */}
            <Divider sx={{ my: 4 }} />
            <VendorAvailabilitySection vendorId={vendor.id} />
            <Divider sx={{ my: 4 }} />
            <VendorReviews />
          </Grid>
          <Grid item xs={12} md={4}>
            <VendorBookingPanel vendor={vendor} />
          </Grid>
        </Grid>
      )}
    </QueryState>
  );
}
