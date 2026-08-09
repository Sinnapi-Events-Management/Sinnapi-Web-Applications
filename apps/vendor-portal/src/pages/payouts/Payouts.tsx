import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import PayoutsTable from './components/organisms/PayoutsTable';

export default function Payouts() {
  return (
    <>
      <PageTitle title="Payouts" subtitle="Your payout history and status." />
      <VendorGate>{(vendorId) => <PayoutsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
