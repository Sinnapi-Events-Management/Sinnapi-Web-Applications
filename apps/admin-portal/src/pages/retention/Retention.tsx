import { useMemo } from 'react';
import { DataTable, Alert } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { useRetention } from './hooks/useRetention';
import { getColumns } from './schema';

export default function Retention() {
  const { rows, total, isLoading, isFetching, error, table } = useRetention();

  const columns = useMemo(() => getColumns(), []);

  return (
    <>
      <PageTitle
        title="Data retention"
        subtitle="Per-category retention, archival, and deletion policies (GDPR/DPPA)."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load retention policies.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No retention policies yet."
        {...table.controls}
      />
    </>
  );
}
