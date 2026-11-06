import { PageTitle, Stack } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import { LogoMissingBanner } from '@/components/businessLogo';
import QuotationsTable from './components/organisms/QuotationsTable';

export default function Quotations() {
  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Build and send quotes in response to client requests."
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
