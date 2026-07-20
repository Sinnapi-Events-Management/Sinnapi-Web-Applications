import { Alert, DataTable } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { useAudit } from './hooks/useAudit';
import { columns } from './schema';
import AuditToolbar from './components/organisms/AuditToolbar';
import AuditDetailDrawer from './components/organisms/AuditDetailDrawer';

export default function Audit() {
  const { rows, total, isLoading, isFetching, error, table, filters, detail } = useAudit();

  return (
    <>
      <PageTitle
        title="Audit log"
        subtitle="Append-only record of sensitive actions. Select a row to see what changed."
      />

      <AuditToolbar filters={filters} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load audit entries.'}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(l) => l.id}
        rowCount={total}
        loading={isLoading || isFetching}
        size="small"
        emptyMessage="No audit entries match these filters."
        onRowClick={detail.open}
        {...table.controls}
      />

      <AuditDetailDrawer log={detail.selected} open={detail.isOpen} onClose={detail.close} />
    </>
  );
}
