import { useMemo } from 'react';
import { DataTable, Alert, PageTitle } from '@sinnapi/ui';
import { useEscrow } from './hooks/useEscrow';
import { escrowColumns } from './schema';

/**
 * The escrow register and release console. Layout only — `useEscrow` owns the
 * read, the realtime subscription and the one write.
 */
export default function Escrow() {
  const {
    rows,
    total,
    isLoading,
    isFetching,
    error,
    has,
    busy,
    err,
    clearError,
    approveRelease,
    table,
  } = useEscrow();

  const columns = useMemo(
    () => escrowColumns({ has, busy, approveRelease }),
    [has, busy, approveRelease],
  );

  return (
    <>
      <PageTitle
        title="Escrow"
        subtitle="Approve releases once the client has confirmed, or once the confirmation window has lapsed. Approval raises a payout for Finance to settle."
      />

      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={err ? clearError : undefined}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load escrow transactions.')}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(e) => e.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No escrow transactions yet."
        {...table.controls}
      />
    </>
  );
}
