import { useMemo } from 'react';
import { Alert, DataTable } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useBookings } from '../../hooks/useBookings';
import { bookingColumns } from '../../schema';

/**
 * The bookings list for one vendor. Mounted by <VendorGate /> once the vendor
 * is resolved, which is why it can take `vendorId` as a plain string.
 */
export default function BookingsTable({ vendorId }: { vendorId: string }) {
  const { rows, total, isLoading, isFetching, error, table, openBooking, clientName } =
    useBookings(vendorId);
  const columns = useMemo(() => bookingColumns(clientName), [clientName]);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load bookings.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(b) => b.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(b) => openBooking(b.id)}
        emptyMessage={
          <EmptyState
            embedded
            title="No bookings yet"
            description="Booking requests from clients will appear here."
          />
        }
        {...table.controls}
      />
    </>
  );
}
