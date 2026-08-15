import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingsAdmin } from '@/hooks/queries';
import { useTableState } from '@sinnapi/ui';

export function useBookings() {
  const table = useTableState({ sort: { field: 'event_date', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useBookingsAdmin(table.params);
  const navigate = useNavigate();

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    /** Row click target. The list is oversight; the detail page is where acting happens. */
    viewBooking: useCallback((id: string) => navigate(`/bookings/${id}`), [navigate]),
  };
}
