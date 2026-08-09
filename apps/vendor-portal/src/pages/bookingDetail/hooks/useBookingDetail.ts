import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useVendorBooking } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { ProfileContactRel } from '@/lib/types';
import { formatTimeWindow } from '../utils/timeWindow';

/**
 * Everything the booking page renders, resolved in one place: the booking, the
 * client behind it, and the few values that are derived rather than stored.
 * Components below this receive finished data and decide only how it looks.
 */
export function useBookingDetail() {
  const { id = '' } = useParams();
  const { data: booking, isLoading, error } = useVendorBooking(id);

  // The reference number is what both sides quote in correspondence, so it's
  // the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(booking?.reference_no ? `Booking ${booking.reference_no}` : undefined);

  const client = one<ProfileContactRel>(booking?.profiles);

  return {
    bookingId: id,
    booking,
    client,
    /** `null` when the request carried no times — the row is then omitted. */
    timeWindow: formatTimeWindow(booking?.start_time, booking?.end_time),
    /**
     * Whether this booking is still waiting on the vendor. Drives the emphasis
     * of the actions panel: an untouched request is the one thing on this page
     * that needs doing, and everything else is a record of work already done.
     */
    needsResponse: booking?.status === 'requested',
    isLoading,
    error,
  };
}
