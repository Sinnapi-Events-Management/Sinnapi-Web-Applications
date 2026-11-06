import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import PayoutsTable from './components/organisms/PayoutsTable';

export default function Payouts() {
  return (
    <>
      <PageTitle
        title="Money paid to you"
        subtitle="Money Sinnapi has sent, or is sending, to your bank account."
      />
      <VendorGate>{(vendorId) => <PayoutsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
