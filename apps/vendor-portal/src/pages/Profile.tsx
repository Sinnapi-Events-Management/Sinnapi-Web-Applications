import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import QueryState from '@/components/ui/QueryState';
import VendorGate from '@/vendor/VendorGate';
import VendorProfileForm from '@/components/profile/VendorProfileForm';
import { supabase } from '@/lib/supabase';
import type { VendorProfileEditModel } from '@/lib/types';

function ProfileEditor({ vendorId }: { vendorId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['v-profile', vendorId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vendors')
        .select(
          'id,business_name,biography,base_city,website,starting_price,starting_price_currency',
        )
        .eq('id', vendorId)
        .maybeSingle();
      return (data as VendorProfileEditModel) ?? null;
    },
  });
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
