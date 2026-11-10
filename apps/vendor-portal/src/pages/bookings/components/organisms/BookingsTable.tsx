import { useMemo } from 'react';
import { Alert, DataTable, ListToolbar } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useBookings } from '../../hooks/useBookings';
import { bookingColumns } from '../../schema';
import BookingCard from '../molecules/BookingCard';

/**
 * The bookings list for one vendor. Mounted by <VendorGate /> once the vendor
 * is resolved, which is why it can take `vendorId` as a plain string.
 */
export default function BookingsTable({ vendorId }: { vendorId: string }) {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    table,
    openBooking,
    clientName,
    namesLoading,
    list,
    facetCounts,
  } = useBookings(vendorId);
  const columns = useMemo(() => bookingColumns(clientName), [clientName]);

  return (
    <>
      <ListToolbar list={list} counts={facetCounts} resultCount={total} />

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
        renderCard={(b) => (
          <BookingCard
            booking={b}
            clientName={namesLoading ? null : clientName(b.client_id)}
            onOpen={() => openBooking(b.id)}
          />
        )}
        emptyMessage={
          list.isFiltered ? (
            <EmptyState
              embedded
              title="No bookings match"
              description="Try a different search, or clear the filters to see every booking."
              ctaLabel="Clear search and filters"
              onCta={list.clearAll}
            />
          ) : (
            <EmptyState
              embedded
              title="No bookings yet"
              description="Booking requests from clients will appear here."
            />
          )
        }
        {...table.controls}
      />
    </>
  );
}
