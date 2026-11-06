import { PageTitle } from '@sinnapi/ui';
import { ESCROW_EXPLAINER } from '@/lib/config';
import VendorGate from '@/vendor/VendorGate';
import EscrowTable from './components/organisms/EscrowTable';

export default function Escrow() {
  return (
    <>
      <PageTitle
        title="Escrow"
        titleHint={ESCROW_EXPLAINER}
        subtitle="Client payments Sinnapi is keeping safe for your bookings. You can view them here; nothing to do."
      />
      <VendorGate>{(vendorId) => <EscrowTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
