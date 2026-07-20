import { useMemo } from 'react';
import { DataTable, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { useErasure } from './hooks/useErasure';
import { getColumns } from './schema';

export default function Erasure() {
  const { rows, total, isLoading, isFetching, error, setStatus, table } = useErasure();

  const columns = useMemo(() => getColumns({ onSetStatus: setStatus }), [setStatus]);

  return (
    <>
      <PageTitle
        title="Erasure requests"
        subtitle="GDPR right-to-erasure subject to legal/financial retention holds."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load erasure requests.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No erasure requests yet."
        {...table.controls}
      />
    </>
  );
}
