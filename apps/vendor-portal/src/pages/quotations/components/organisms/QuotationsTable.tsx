import { useMemo } from 'react';
import { Alert, DataTable } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useQuotations } from '../../hooks/useQuotations';
import { quotationColumns } from '../../schema';

/** The quote-request list for one vendor, mounted by <VendorGate />. */
export default function QuotationsTable({ vendorId }: { vendorId: string }) {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    table,
    openQuotation,
    clientName,
    bookingFor,
  } = useQuotations(vendorId);
  const columns = useMemo(
    () => quotationColumns({ clientName, bookingFor }),
    [clientName, bookingFor],
  );

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load quotations.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(q) => q.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={(q) => openQuotation(q.id)}
        emptyMessage={
          <EmptyState
            embedded
            title="No quote requests yet"
            description="When clients request quotes, they'll appear here for you to build and send."
          />
        }
        {...table.controls}
      />
    </>
  );
}
