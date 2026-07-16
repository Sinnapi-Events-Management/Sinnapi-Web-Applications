import { useMemo } from 'react';
import { DataTable, Alert, TextField, MenuItem, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ErasureRequestModel, ProfileRef } from '@/lib/types';
import { useErasure } from './hooks/useErasure';

const STATUSES = [
  'requested',
  'reviewing',
  'approved',
  'partially_fulfilled',
  'rejected',
  'completed',
];

export default function Erasure() {
  const { rows, total, isLoading, isFetching, error, setStatus, table } = useErasure();

  const columns = useMemo<DataTableColumn<ErasureRequestModel>[]>(
    () => [
      {
        field: 'requester',
        headerName: 'Requester',
        render: (r) => one<ProfileRef>(r.profiles)?.email ?? '—',
      },
      {
        field: 'created_at',
        headerName: 'Requested',
        sortable: true,
        render: (r) => formatDate(r.created_at),
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        render: (r) => <StatusChip status={r.status} />,
      },
      {
        field: 'set_status',
        headerName: 'Set status',
        align: 'right',
        render: (r) => (
          <TextField
            select
            size="small"
            value={r.status}
            onChange={(e) => setStatus(r.id, e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
    ],
    [setStatus],
  );

  return (
    <>
      <PageTitle
        title="Erasure requests"
        subtitle="GDPR right-to-erasure — subject to legal/financial retention holds."
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
