import { useParams } from 'react-router-dom';
import { useBooking } from '@/hooks/queries';

export function useBookingDetail() {
  const { id = '' } = useParams();
  const { data: booking, isLoading, error } = useBooking(id);

  return { booking, isLoading, error };
}
