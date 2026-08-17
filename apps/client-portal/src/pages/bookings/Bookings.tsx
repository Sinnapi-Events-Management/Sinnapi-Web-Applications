import { useState } from 'react';
import { Alert, Button, DataTable, PageTitle } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import AddIcon from '@mui/icons-material/Add';
import { useBookings } from './hooks/useBookings';
import { bookingColumns } from './schema';
import NewBookingDialog from './components/organisms/NewBookingDialog';

export default function Bookings() {
  const { rows, total, isLoading, isFetching, error, table, openBooking } = useBookings();
  // The one piece of state this page owns. Everything the dialog needs lives in
  // `useNewBooking`, which is created and destroyed with it.
  const [newOpen, setNewOpen] = useState(false);

  return (
    <>
      <PageTitle
        title="Bookings"
        subtitle="Track and manage all your vendor bookings."
        action={
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={() => setNewOpen(true)}
          >
            New booking
          </Button>
        }
      />

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
            // Discover stays the suggestion for a client with nothing here: they
            // are more likely to be looking for a vendor than to know one by
            // name. The header's action covers the other case.
            description="Find a vendor and request your first booking, or book one you already know."
            ctaLabel="Discover vendors"
            ctaHref="/discover"
          />
        }
        {...table.controls}
      />

      <NewBookingDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}
