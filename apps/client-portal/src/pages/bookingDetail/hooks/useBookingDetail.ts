import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useBooking } from '@/hooks/queries';

export function useBookingDetail() {
  const { id = '' } = useParams();
  const { data: booking, isLoading, error } = useBooking(id);

  // The reference number is what the client quotes in support threads, so it's
  // the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(booking?.reference_no ? `Booking ${booking.reference_no}` : undefined);

  return { booking, isLoading, error };
}
