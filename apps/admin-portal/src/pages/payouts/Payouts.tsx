import { useMemo } from 'react';
import { Box, DataTable, Alert, PageTitle, SearchField } from '@sinnapi/ui';
import { usePayouts } from './hooks/usePayouts';
import { payoutColumns } from './schema';
import RecordSettlementDialog from './components/organisms/RecordSettlementDialog';

/**
 * The payout queue. Layout only — `usePayouts` owns the reads and the two
 * maker-checker writes, and the columns own their own rendering.
 */
export default function Payouts() {
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
    approve,
    approveSettlement,
    openSettlement,
    settling,
    closeSettlement,
    search,
    table,
  } = usePayouts();

  const columns = useMemo(
    () => payoutColumns({ has, busy, approve, approveSettlement, openSettlement }),
    [has, busy, approve, approveSettlement, openSettlement],
  );

  return (
    <>
      <PageTitle
        title="Payouts"
        subtitle="Transfer the money, record it with a reference and receipt, then have a second Finance admin approve. Recorder and approver must differ."
      />

      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={err ? clearError : undefined}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load payouts.')}
        </Alert>
      )}

      <Box sx={{ mb: 2, maxWidth: 480 }}>
        <SearchField
          value={search.input}
          onChange={search.setInput}
          onClear={search.clear}
          placeholder="Payout ID or settlement reference…"
          ariaLabel="Search payouts"
        />
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={search.query ? 'No payout matches that search.' : 'No payouts yet.'}
        {...table.controls}
      />

      <RecordSettlementDialog payout={settling} onClose={closeSettlement} />
    </>
  );
}
