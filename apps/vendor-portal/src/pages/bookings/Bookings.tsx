import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import BookingsTable from './components/organisms/BookingsTable';

export default function Bookings() {
  return (
    <>
      <PageTitle
        title="Bookings"
        subtitle="Answer new requests, see what is coming up, and track your money."
      />
      <VendorGate>{(vendorId) => <BookingsTable vendorId={vendorId} />}</VendorGate>
    </>
  );
}
