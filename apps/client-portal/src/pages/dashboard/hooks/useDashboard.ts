import { useDashboardCounts, useUpcomingBookings, useProfile } from '@/hooks/queries';

export function useDashboard() {
  const counts = useDashboardCounts();
  // The preview strip asks the server for exactly the rows it shows, rather
  // than borrowing the (now paginated) bookings list and slicing it.
  const bookings = useUpcomingBookings();
  const { data: profile } = useProfile();

  return { counts, bookings, profile, upcoming: bookings.data ?? [] };
}
