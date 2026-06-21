import { useNavigate } from 'react-router-dom';
import { useBookings as useBookingsQuery } from '@/hooks/queries';

export function useBookings() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useBookingsQuery();
  const rows = data ?? [];

  function openBooking(id: string) {
    navigate(`/bookings/${id}`);
  }

  return { rows, isLoading, error, openBooking };
}
