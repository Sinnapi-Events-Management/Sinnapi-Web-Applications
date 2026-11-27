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
        subtitle="Money your clients paid through Sinnapi. It is kept safe and sent to you on time — you do not need to do anything here."
      />
      <VendorGate>{(vendorId) => <EscrowTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
