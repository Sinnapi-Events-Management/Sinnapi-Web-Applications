import { Card, CardContent } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import VendorProfileForm from '@/components/profile/VendorProfileForm';
import { useProfile } from './hooks/useProfile';

function ProfileEditor({ vendorId }: { vendorId: string }) {
  const { data, isLoading, error } = useProfile(vendorId);
  return (
    <QueryState isLoading={isLoading} error={error}>
      {data && (
        <Card variant="outlined">
          <CardContent>
            <VendorProfileForm vendor={data} />
          </CardContent>
        </Card>
      )}
    </QueryState>
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
