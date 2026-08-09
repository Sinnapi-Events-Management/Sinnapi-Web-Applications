import { Alert, DataTable, PageTitle } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useBookings } from './hooks/useBookings';
import { bookingColumns } from './schema';

export default function Bookings() {
  const { rows, total, isLoading, isFetching, error, table, openBooking } = useBookings();

  return (
    <>
      <PageTitle title="Bookings" subtitle="Track and manage all your vendor bookings." />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load bookings.'}
        </Alert>
      )}

      <DataTable
        columns={bookingColumns}
        rows={rows}
        getRowId={(b) => b.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(b) => openBooking(b.id)}
        emptyMessage={
          <EmptyState
            embedded
            title="No bookings yet"
            description="Find a vendor and request your first booking."
            ctaLabel="Discover vendors"
            ctaHref="/discover"
          />
        }
        {...table.controls}
      />
    </>
  );
}
