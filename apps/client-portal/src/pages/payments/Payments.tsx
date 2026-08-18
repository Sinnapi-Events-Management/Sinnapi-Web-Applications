import { Alert, DataTable, PageTitle } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { usePayments } from './hooks/usePayments';
import { paymentColumns } from './schema';

export default function Payments() {
  const { rows, total, isLoading, isFetching, error, table } = usePayments();

  return (
    <>
      <PageTitle title="Payments" subtitle="Your payment history." />

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
        emptyMessage={
          <EmptyState
            embedded
            title="No payments yet"
            description="Your payment history will appear here."
          />
        }
        {...table.controls}
      />
    </>
  );
}
