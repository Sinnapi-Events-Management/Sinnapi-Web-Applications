import { Card, CardContent, Stack, PageTitle, QueryState } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import VendorProfileForm from '@/components/profile/VendorProfileForm';
import ServiceCoverageCard from './components/organisms/ServiceCoverageCard';
import { useProfile } from './hooks/useProfile';

/**
 * Two independent cards, each owning its own read and write. Coverage is kept
 * out of the profile form because it writes to a different table through an RPC
 * rather than to a `vendors` column, and folding it in would mean one Save
 * button committing two unrelated statements with no transaction across them.
 */
function ProfileEditor({ vendorId }: { vendorId: string }) {
  const { data, isLoading, error } = useProfile(vendorId);
  return (
    <Stack spacing={3}>
      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <Card variant="outlined">
            <CardContent>
              <VendorProfileForm vendor={data} />
            </CardContent>
          </Card>
        )}
      </QueryState>

      <ServiceCoverageCard vendorId={vendorId} />
    </Stack>
  );
}

export default function Profile() {
  return (
    <>
      <PageTitle
        title="Business profile"
        subtitle="This is what clients see on your public listing."
      />
      <VendorGate>{(vendorId) => <ProfileEditor vendorId={vendorId} />}</VendorGate>
    </>
  );
}
