import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTableState } from '@sinnapi/ui';
import { useProfileDirectory, useVendorBookings } from '@/hooks/queries';

/**
 * The vendor's bookings list: server-paginated page state plus row navigation.
 * `vendorId` comes from <VendorGate />, so it is always resolved by the time
 * this runs.
 */
export function useBookings(vendorId: string) {
  const navigate = useNavigate();
  const table = useTableState({ sort: { field: 'event_date', direction: 'desc' } });
  const { data, isLoading, isFetching, error } = useVendorBookings(vendorId, table.params);

  const rows = data?.rows ?? [];

  // One directory call for the whole page rather than a join: RLS keeps client
  // profiles out of an embed, so the names arrive a moment after the rows and
  // the table renders "Client" in the gap — the same placeholder it used to
  // show permanently.
  const { profiles } = useProfileDirectory(rows.map((b) => b.client_id));

  // Stable while the directory is, so the column set it feeds is built once per
  // batch of names rather than on every render of the table.
  const clientName = useCallback(
    (id: string | null) => (id && profiles[id]?.full_name) || 'Client',
    [profiles],
  );

  function openBooking(id: string) {
    navigate(`/bookings/${id}`);
  }

  return {
    rows,
    clientName,
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
    table,
    openBooking,
  };
}
