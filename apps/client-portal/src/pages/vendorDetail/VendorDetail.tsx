import { Grid, Box, Divider, QueryState } from '@sinnapi/ui';
import BackButton from '@/components/ui/BackButton';
import VendorHeadline from './components/molecules/VendorHeadline';
import VendorReviews from './components/molecules/VendorReviews';
import VendorMediaSection from './components/organisms/VendorMediaSection';
import VendorBookingPanel from './components/organisms/VendorBookingPanel';
import { useVendorDetail } from './hooks/useVendorDetail';
import { EmptyState } from '@sinnapi/ui/router';

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
