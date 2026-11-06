import { Alert, DataTable } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { usePayouts } from '../../hooks/usePayouts';
import { payoutColumns } from '../../schema';
import PayoutCard from '../molecules/PayoutCard';

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
        renderCard={(p) => <PayoutCard payout={p} />}
        emptyMessage={
          <EmptyState
            embedded
            title="Nothing paid to you yet"
            description="When a client’s payment is released from escrow, the money sent to you shows here."
          />
        }
        {...table.controls}
      />
    </>
  );
}
