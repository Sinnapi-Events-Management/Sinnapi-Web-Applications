import { Alert, Grid, QueryState, Stack } from '@sinnapi/ui';
import { profileSideColumnSx } from '@sinnapi/ui/profile';
import { useProfile } from '../../hooks/useProfile';
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
 *
 * The section reads the record and hands it down; each card below owns its own
 * write, so a failed logo upload cannot disable the details form's Save button.
 */
export default function BusinessSection({ vendorId, onDone }: Props) {
  const { data: vendor, isLoading, error } = useProfile(vendorId);

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
              <BusinessDetailsForm vendorId={vendorId} vendor={vendor} onDone={onDone} />
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
