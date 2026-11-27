import { PageTitle, Stack } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { LogoMissingBanner } from '@/components/businessLogo';
import QuotationsTable from './components/organisms/QuotationsTable';

export default function Quotations() {
  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Price new requests, answer changes, and see which quotes became bookings."
      />
      <VendorGate>
        {(vendorId) => (
          <Stack spacing={2.5}>
            <LogoMissingBanner />
            <QuotationsTable vendorId={vendorId} />
          </Stack>
        )}
      </VendorGate>
    </>
  );
}
