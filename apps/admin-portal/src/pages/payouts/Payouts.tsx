import { useMemo } from 'react';
import { DataTable, Alert, Button, Stack, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatMoney, formatDate } from '@/lib/config';
import { one } from '@/lib/rel';
import type { PayoutModel, VendorRef } from '@/lib/types';
import { usePayouts } from './hooks/usePayouts';

export default function Payouts() {
  const { rows, total, isLoading, isFetching, error, has, busy, err, approve, process, table } =
    usePayouts();

  const columns = useMemo<DataTableColumn<PayoutModel>[]>(
    () => [
      {
        field: 'vendor',
        headerName: 'Vendor',
        render: (p) => one<VendorRef>(p.vendors)?.business_name ?? '—',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        align: 'right',
        sortable: true,
        render: (p) => <strong>{formatMoney(p.amount, p.currency)}</strong>,
      },
      {
        field: 'created_at',
        headerName: 'Requested',
        sortable: true,
        render: (p) => formatDate(p.created_at),
      },
      {
        field: 'status',
        headerName: 'Status',
        sortable: true,
        render: (p) => <StatusChip status={p.status} />,
      },
      {
        field: 'action',
        headerName: 'Action',
        align: 'right',
        render: (p) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {has('payout.approve') && p.status === 'requested' && (
              <Button
                size="small"
                variant="contained"
                disabled={busy === p.id}
                onClick={() => approve(p.id)}
              >
                Approve
              </Button>
            )}
            {has('payout.process') && p.status === 'approved' && (
              <Button
                size="small"
                variant="outlined"
                disabled={busy === p.id}
                onClick={() => process(p.id)}
              >
                Process
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [has, busy, approve, process],
  );

  return (
    <>
      <PageTitle
        title="Payouts"
        subtitle="Approve (Finance) then process disbursement. Approver must differ from requester."
      />
      {(err || error) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err ?? (error instanceof Error ? error.message : 'Failed to load payouts.')}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No payouts yet."
        {...table.controls}
      />
    </>
  );
}
