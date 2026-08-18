import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import BookingsTable from './components/organisms/BookingsTable';

export default function Bookings() {
  return (
    <>
      <PageTitle title="Bookings" subtitle="Incoming and active bookings." />
      <VendorGate>{(vendorId) => <BookingsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
