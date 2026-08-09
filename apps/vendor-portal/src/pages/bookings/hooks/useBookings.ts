import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useVendorBookings } from '@/hooks/queries';

/**
 * The vendor's bookings list: server-paginated page state plus row navigation.
 * `vendorId` comes from <VendorGate />, so it is always resolved by the time
 * this runs.
 */
export function useBookings(vendorId: string) {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'event_date', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorBookings(vendorId, table.params);

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
