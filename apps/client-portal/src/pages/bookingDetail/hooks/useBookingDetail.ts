import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useBooking } from '@/hooks/queries';
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

  return {
    bookingId: id,
    booking,
    vendor,
    /** `null` when the request carried no times — the row is then omitted. */
    timeWindow: formatTimeWindow(booking?.start_time, booking?.end_time),
    /** A completed booking is the only state where a review is worth offering. */
    canReview: booking?.status === 'completed',
    isLoading,
    error,
  };
}
