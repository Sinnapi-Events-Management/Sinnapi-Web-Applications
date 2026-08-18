import { Alert, DataTable } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useEscrow } from '../../hooks/useEscrow';
import { escrowColumns } from '../../schema';

/** The escrow list for one vendor, mounted by <VendorGate />. */
export default function EscrowTable({ vendorId }: { vendorId: string }) {
  const { rows, total, isLoading, isFetching, error, table } = useEscrow(vendorId);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load escrow activity.'}
        </Alert>
      )}

      <DataTable
        columns={escrowColumns}
        rows={rows}
        getRowId={(e) => e.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={
          <EmptyState
            embedded
            title="No escrow activity"
            description="Funds clients hold in escrow for your bookings appear here. Release is confirmed by the client and approved by Sinnapi."
          />
        }
        {...table.controls}
      />
    </>
  );
}
