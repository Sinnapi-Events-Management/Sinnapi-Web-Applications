import { DataTable, Alert, Typography, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { formatDateTime } from '@/lib/config';
import type { AuditLogModel } from '@/lib/types';
import { useAudit } from './hooks/useAudit';

const columns: DataTableColumn<AuditLogModel>[] = [
  {
    field: 'occurred_at',
    headerName: 'When',
    sortable: true,
    render: (l) => formatDateTime(l.occurred_at),
  },
  {
    field: 'action',
    headerName: 'Action',
    sortable: true,
    render: (l) => (
      <Typography variant="body2" fontWeight={600}>
        {l.action}
      </Typography>
    ),
  },
  {
    field: 'entity_type',
    headerName: 'Entity',
    sortable: true,
    render: (l) => `${l.entity_type}${l.entity_id ? ` · ${String(l.entity_id).slice(0, 8)}` : ''}`,
  },
  {
    field: 'actor_id',
    headerName: 'Actor',
    render: (l) => (l.actor_id ? String(l.actor_id).slice(0, 8) : 'system'),
  },
];

export default function Audit() {
  const { rows, total, isLoading, isFetching, error, table } = useAudit();

  return (
    <>
      <PageTitle title="Audit log" subtitle="Append-only record of sensitive actions." />
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
        emptyMessage="No audit entries yet."
        {...table.controls}
      />
    </>
  );
}
