import { useDashboardCounts, useBookings, useProfile } from '@/hooks/queries';

export function useDashboard() {
  const counts = useDashboardCounts();
  const bookings = useBookings();
  const { data: profile } = useProfile();
  const upcoming = (bookings.data ?? [])
    .filter((b) => ['requested', 'confirmed', 'in_progress'].includes(b.status))
    .slice(0, 5);

  return { counts, bookings, profile, upcoming };
}
