import { PageTitle } from '@sinnapi/ui';
import VendorGate from '@/vendor/VendorGate';
import CalendarWorkspace from './components/organisms/CalendarWorkspace';

/**
 * Calendar & availability — the vendor's answer to "when am I free?".
 *
 * A wiring point: the gate resolves which vendor is being managed, the
 * workspace is the screen, and `useCalendar` behind it owns every figure on it.
 */
export default function Calendar() {
  return (
    <>
      <PageTitle
        title="Calendar & availability"
        subtitle="Tap any day to see what's on it. Confirmed bookings block their date automatically."
      />
      <VendorGate>{(vendorId) => <CalendarWorkspace vendorId={vendorId} />}</VendorGate>
    </>
  );
}
