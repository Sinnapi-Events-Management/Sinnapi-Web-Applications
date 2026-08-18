import { useMemo } from 'react';
import { Alert, Grid, QueryState, Stack } from '@sinnapi/ui';
import { profileSideColumnSx } from '@sinnapi/ui/profile';
import { useProfile } from '../../hooks/useProfile';
import { useVendorProfileDetails } from '../../hooks/useVendorProfileDetails';
import { toVendorProfileValues } from '../../schema';
import BusinessLogoCard from './BusinessLogoCard';
import BusinessDetailsForm from './BusinessDetailsForm';
import ListingFactsCard from './ListingFactsCard';
import ServiceCoverageCard from './ServiceCoverageCard';

type Props = {
  vendorId: string;
  onDone: (message: string) => void;
};

/**
 * The Business tab: logo and listing facts in a side column, the editable form and
 * service coverage in the main one.
 *
 * Coverage stays a separate card rather than folding into the form above it,
 * because it writes to a different table through an RPC rather than to a `vendors`
 * column — one Save button committing both would mean two unrelated statements
 * with no transaction across them.
 */
export default function BusinessSection({ vendorId, onDone }: Props) {
  const { data: vendor, isLoading, error } = useProfile(vendorId);
  const { busy, error: saveError, save } = useVendorProfileDetails(vendorId, onDone);

  // Referentially stable per record revision, which is what lets the form track
  // the query without resetting the vendor's typing (see `useSavedForm`).
  const values = useMemo(() => toVendorProfileValues(vendor), [vendor]);

  return (
    <QueryState isLoading={isLoading} error={error}>
      {vendor ? (
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <Stack spacing={3} sx={profileSideColumnSx}>
              <BusinessLogoCard
                vendorId={vendorId}
                businessName={vendor.business_name}
                baseCity={vendor.base_city}
                logoUrl={vendor.primary_image_url}
                status={vendor.status}
                visibility={vendor.visibility}
                onDone={onDone}
              />
              <ListingFactsCard vendor={vendor} />
            </Stack>
          </Grid>

          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <BusinessDetailsForm values={values} busy={busy} error={saveError} onSave={save} />
              <ServiceCoverageCard vendorId={vendorId} onDone={onDone} />
            </Stack>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="warning">
          We couldn&apos;t load your business profile. Refresh the page, or sign out and back in.
        </Alert>
      )}
    </QueryState>
  );
}
