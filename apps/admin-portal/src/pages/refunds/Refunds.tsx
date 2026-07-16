import { useMemo } from 'react';
import { DataTable, Alert, Button, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatMoney, formatDate, titleize } from '@/lib/config';
import type { RefundModel } from '@/lib/types';
import { useRefunds } from './hooks/useRefunds';

export default function Refunds() {
  const { has, rows, total, isLoading, isFetching, error, busy, err, approve, table } =
    useRefunds();

  const columns = useMemo<DataTableColumn<RefundModel>[]>(
    () => [
      { field: 'type', headerName: 'Type', sortable: true, render: (r) => titleize(r.type) },
      {
        field: 'amount',
        headerName: 'Amount',
        align: 'right',
        sortable: true,
        render: (r) => formatMoney(r.amount, r.currency),
      },
      { field: 'reason', headerName: 'Reason', render: (r) => r.reason ?? '—' },
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
        field: 'action',
        headerName: 'Action',
        align: 'right',
        render: (r) =>
          has('refund.approve') && r.status === 'requested' ? (
            <Button
              size="small"
              variant="contained"
              disabled={busy === r.id}
              onClick={() => approve(r.id)}
            >
              Approve
            </Button>
          ) : null,
      },
    ],
    [has, busy, approve],
  );

  return (
    <>
      <PageTitle
        title="Refunds"
        subtitle="Approve refunds (partial allowed). Approver must differ from requester."
      />
      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load refund requests.')}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No refund requests yet."
        {...table.controls}
      />
    </>
  );
}
