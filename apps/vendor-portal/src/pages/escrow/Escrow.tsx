import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import EscrowTable from './components/organisms/EscrowTable';

export default function Escrow() {
  return (
    <>
      <PageTitle
        title="Escrow"
        subtitle="Visibility into funds held for your bookings (read-only)."
      />
      <VendorGate>{(vendorId) => <EscrowTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
