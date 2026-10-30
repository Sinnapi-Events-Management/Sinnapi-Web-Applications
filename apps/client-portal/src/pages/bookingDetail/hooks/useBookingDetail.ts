import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useBooking, useVendorContact } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { VendorRefModel } from '@/lib/types';
import { formatTimeWindow } from '../utils/timeWindow';

/**
 * Everything the booking page renders, resolved in one place: the booking, the
 * vendor behind it, and the few values that are derived rather than stored.
 * Components below this receive finished data and decide only how it looks.
 */
export function useBookingDetail() {
  const { id = '' } = useParams();
  const { data: booking, isLoading, error } = useBooking(id);

  // The reference number is what the client quotes in support threads, so it's
  // the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(booking?.reference_no ? `Booking ${booking.reference_no}` : undefined);

  const vendor = one<VendorRefModel>(booking?.vendors);
  // The vendor's email and phone. Withheld by the directory until this booking
  // is past `requested`, so the card renders the name and a note until then.
  const { contact: vendorContact, isLoading: isVendorContactLoading } = useVendorContact(
    vendor?.owner_id,
  );

  return {
    bookingId: id,
    booking,
    vendor,
    vendorContact,
    isVendorContactLoading,
    /** `null` when the request carried no times — the row is then omitted. */
    timeWindow: formatTimeWindow(booking?.start_time, booking?.end_time),
    isLoading,
    error,
  };
}
