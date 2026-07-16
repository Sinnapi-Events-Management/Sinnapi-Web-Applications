import { DataTable, Alert, Chip, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import { titleize } from '@/lib/config';
import type { RetentionPolicyModel } from '@/lib/types';
import { useRetention } from './hooks/useRetention';

const columns: DataTableColumn<RetentionPolicyModel>[] = [
  {
    field: 'data_category',
    headerName: 'Category',
    sortable: true,
    render: (p) => titleize(p.data_category),
  },
  { field: 'retention_period', headerName: 'Retention', render: (p) => p.retention_period ?? '—' },
  {
    field: 'action_on_expiry',
    headerName: 'On expiry',
    render: (p) => <Chip size="small" label={titleize(p.action_on_expiry)} />,
  },
  { field: 'legal_hold', headerName: 'Legal hold', render: (p) => (p.legal_hold ? 'Yes' : 'No') },
  { field: 'description', headerName: 'Description', render: (p) => p.description ?? '—' },
];

export default function Retention() {
  const { rows, total, isLoading, isFetching, error, table } = useRetention();

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
