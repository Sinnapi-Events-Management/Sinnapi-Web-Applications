import { useMemo } from 'react';
import { Alert, DataTable, PageTitle, PaymentChaseDialog, SearchField, Box } from '@sinnapi/ui';
import { StatusTabs } from '@sinnapi/ui';
import { useUnpaidBookings } from './hooks/useUnpaidBookings';
import { unpaidBookingColumns } from './schema';
import UnpaidSummaryBar from './components/organisms/UnpaidSummaryBar';

/**
 * Escrow bookings that were confirmed and never paid.
 *
 * Its own page rather than a filter on Bookings because it is worked rather
 * than browsed: the rows here have a clock on them, three of the columns exist
 * only for triage, and the actions are not available anywhere else in the
 * console. The Bookings list keeps its own payment column for the operator who
 * arrives from the other direction.
 *
 * Layout only — `useUnpaidBookings` owns the read, the subscription and the
 * three writes.
 */
export default function UnpaidBookings() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    tabs,
    tab,
    onTabChange,
    countsLoading,
    counts,
    search,
    chase,
    table,
    viewBooking,
  } = useUnpaidBookings();

  const columns = useMemo(
    () => unpaidBookingColumns({ onChase: chase.open, busy: chase.isBusy }),
    [chase.open, chase.isBusy],
  );

  return (
    <>
      <PageTitle
        title="Awaiting payment"
        subtitle="Escrow bookings the vendor has confirmed and the client has not funded. Nothing here is cancelled automatically — the platform reminds and flags, and a person decides."
      />

      <UnpaidSummaryBar counts={counts} />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter unpaid bookings by state"
      />

      <Box sx={{ mb: 2 }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Search by reference, client or vendor"
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load unpaid bookings.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(b) => b.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(b) => viewBooking(b.id)}
        emptyMessage={emptyMessage}
        {...table.controls}
      />

      <PaymentChaseDialog
        action={chase.pending}
        reference={chase.target?.reference}
        reason={chase.reason}
        onReasonChange={chase.setReason}
        hours={chase.hours}
        onHoursChange={chase.setHours}
        busy={chase.isBusy}
        error={chase.error}
        onConfirm={chase.confirm}
        onCancel={chase.close}
      />
    </>
  );
}
