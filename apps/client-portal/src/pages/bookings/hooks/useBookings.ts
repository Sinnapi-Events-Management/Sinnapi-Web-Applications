import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useBookings as useBookingsQuery } from '@/hooks/queries';

/**
 * The bookings list: server-paginated page state plus row navigation. The page
 * component reads `table.controls` straight onto <DataTable />.
 */
export function useBookings() {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'event_date', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useBookingsQuery(table.params);

  function openBooking(id: string) {
    navigate(`/bookings/${id}`);
  }

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    openBooking,
  };
}
