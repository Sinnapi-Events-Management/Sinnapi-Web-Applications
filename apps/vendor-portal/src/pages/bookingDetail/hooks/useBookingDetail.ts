import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { useVendorBooking } from '@/hooks/queries';

export function useBookingDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useVendorBooking(id);

  // The reference number is what both sides quote in correspondence, so it's
  // the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(data?.reference_no ? `Booking ${data.reference_no}` : undefined);

  return { booking: data, isLoading, error };
}
