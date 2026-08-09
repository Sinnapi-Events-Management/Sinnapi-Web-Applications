import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import QuotationsTable from './components/organisms/QuotationsTable';

export default function Quotations() {
  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Build and send quotes in response to client requests."
      />
      <VendorGate>{(vendorId) => <QuotationsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
