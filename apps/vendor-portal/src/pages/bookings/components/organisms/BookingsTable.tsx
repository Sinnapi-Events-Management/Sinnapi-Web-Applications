import { useMemo } from 'react';
import { Alert, DataTable, ListToolbar } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useBookings } from '../../hooks/useBookings';
import { bookingColumns } from '../../schema';
import BookingCard from '../molecules/BookingCard';
import QuickViewTabs from '@/components/list/QuickViewTabs';

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
    bookingFor,
    namesLoading,
    list,
    facetCounts,
    quickTabs,
  } = useBookings(vendorId);
  const columns = useMemo(() => bookingColumns(clientName, bookingFor), [clientName, bookingFor]);

  return (
    <>
      <QuickViewTabs
        tabs={quickTabs.tabs}
        active={quickTabs.active}
        onSelect={quickTabs.select}
        counts={{ reply: quickTabs.needsReply }}
        ariaLabel="Booking views"
      />
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
            what={bookingFor(b.id)}
            onOpen={() => openBooking(b.id)}
          />
        )}
        emptyMessage={
          list.isFiltered ? (
            <EmptyState
              embedded
              title={quickTabs.active === 'reply' ? 'All caught up' : 'No bookings here'}
              description={
                quickTabs.active === 'reply'
                  ? 'No new requests are waiting for your answer.'
                  : 'Try a different search, or show all your bookings.'
              }
              ctaLabel="Show all bookings"
              onCta={() => {
                list.clearAll();
                quickTabs.select('all');
              }}
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
