import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useDirectoryProfile, useVendorBooking } from '@/hooks/queries';
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

  // Not an embedded relation: `profiles_self_read` hides the client's row from
  // the vendor, so the booking carries only `client_id` and the name and email
  // come from `get_profile_directory`. The email is disclosed only once the
  // booking is past `requested`, which is exactly when the vendor has a reason
  // to reach the client directly.
  const { profile: client, isLoading: isClientLoading } = useDirectoryProfile(booking?.client_id);

  return {
    bookingId: id,
    booking,
    client,
    /** The client's details are still arriving; the booking itself renders without them. */
    isClientLoading,
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
