import { Alert, DataTable } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { usePayouts } from '../../hooks/usePayouts';
import { payoutColumns } from '../../schema';

/** The payout list for one vendor, mounted by <VendorGate />. */
export default function PayoutsTable({ vendorId }: { vendorId: string }) {
  const { rows, total, isLoading, isFetching, error, table } = usePayouts(vendorId);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load payouts.'}
        </Alert>
      )}

      <DataTable
        columns={payoutColumns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={
          <EmptyState
            embedded
            title="No payouts yet"
            description="Once escrow is released and approved, your payouts appear here."
          />
        }
        {...table.controls}
      />
    </>
  );
}
