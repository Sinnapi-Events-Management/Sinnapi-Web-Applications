import { Alert, DataTable } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import { useEscrow } from '../../hooks/useEscrow';
import { escrowColumns } from '../../schema';
import { useMemo } from 'react';
import EscrowCard from '../molecules/EscrowCard';

/** The escrow list for one vendor, mounted by <VendorGate />. */
export default function EscrowTable({ vendorId }: { vendorId: string }) {
  const { rows, total, isLoading, isFetching, error, table, clientName, namesLoading, open } =
    useEscrow(vendorId);
  const columns = useMemo(() => escrowColumns(clientName), [clientName]);

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'This could not load. Try again in a moment.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(e) => e.id}
        rowCount={total}
        loading={isLoading || isFetching}
        onRowClick={open}
        renderCard={(e) => (
          <EscrowCard
            escrow={e}
            clientName={namesLoading ? null : clientName(e)}
            onOpen={() => open(e)}
          />
        )}
        emptyMessage={
          <EmptyState
            embedded
            title="Nothing held right now"
            description="When a client pays for a booking through Sinnapi, the money is kept safe here until the job is done."
          />
        }
        {...table.controls}
      />
    </>
  );
}
