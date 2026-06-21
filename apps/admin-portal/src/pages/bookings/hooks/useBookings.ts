import { useBookingsAdmin } from '@/hooks/queries';

export function useBookings() {
  const { data, isLoading, error } = useBookingsAdmin();
  const rows = data ?? [];

  return { rows, isLoading, error };
}
