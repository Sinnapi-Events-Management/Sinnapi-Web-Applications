import { useParams } from 'react-router-dom';
import { useVendorBooking } from '@/hooks/queries';

export function useBookingDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useVendorBooking(id);

  return { booking: data, isLoading, error };
}
