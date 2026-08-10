import { useMemo } from 'react';
import { Alert, DataTable, FormControlLabel, PageTitle, Stack, Switch } from '@sinnapi/ui';
import { useReconciliation } from './hooks/useReconciliation';
import { reconciliationColumns } from './schema';
import ResolveExceptionDialog from './components/organisms/ResolveExceptionDialog';

/**
 * The reconciliation exception queue. Layout only — `useReconciliation` owns
 * the read and the single write, and the columns own their rendering.
 */
export default function Reconciliation() {
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
    openOnly,
    setOpenOnly,
    resolving,
    openResolve,
    closeResolve,
    resolve,
    table,
  } = useReconciliation();

  const columns = useMemo(
    () => reconciliationColumns({ has, busy, openResolve }),
    [has, busy, openResolve],
  );

  return (
    <>
      <PageTitle
        title="Reconciliation"
        subtitle="Everything the nightly sweeps found that did not agree. Nothing here has been auto-corrected — each item needs a human decision."
      />

      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={err ? clearError : undefined}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load exceptions.')}
        </Alert>
      )}

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
        <FormControlLabel
          control={<Switch checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />}
          label="Open items only"
        />
      </Stack>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage={
          openOnly ? 'Nothing outstanding — the books agree.' : 'No exceptions recorded.'
        }
        {...table.controls}
      />

      <ResolveExceptionDialog
        exception={resolving}
        busy={busy}
        error={err}
        onResolve={resolve}
        onClose={closeResolve}
      />
    </>
  );
}
