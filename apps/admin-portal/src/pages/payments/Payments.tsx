import { Alert, DataTable, PageTitle, StatusTabs } from '@sinnapi/ui';
import { usePayments } from './hooks/usePayments';
import { paymentColumns } from './schema';
import PaymentsToolbar from './components/organisms/PaymentsToolbar';

/**
 * The payments register. Layout only — `usePayments` owns the reads and the
 * filter state, the columns own their rendering, and a row opens the payment's
 * investigation page.
 */
export default function Payments() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    emptyMessage,
    tabs,
    countsLoading,
    tab,
    onTabChange,
    search,
    filters,
    openPayment,
    table,
  } = usePayments();

  return (
    <>
      <PageTitle
        title="Payments"
        subtitle="Every PSP charge — escrow funding, direct bookings and subscriptions. Open a row to trace it end to end."
      />

      <StatusTabs
        options={tabs}
        value={tab}
        onChange={onTabChange}
        loadingCounts={countsLoading}
        ariaLabel="Filter payments by status"
      />
      <PaymentsToolbar search={search} filters={filters} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load payments.'}
        </Alert>
      )}
      <DataTable
        columns={paymentColumns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={emptyMessage}
        onRowClick={openPayment}
        minWidth={960}
        {...table.controls}
      />
    </>
  );
}
