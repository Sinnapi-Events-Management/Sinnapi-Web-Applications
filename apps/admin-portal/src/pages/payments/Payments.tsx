import { DataTable, Alert, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { PaymentModel } from '@/lib/types';
import { usePayments } from './hooks/usePayments';

const columns: DataTableColumn<PaymentModel>[] = [
  {
    field: 'created_at',
    headerName: 'Date',
    sortable: true,
    render: (p) => formatDate(p.created_at),
  },
  { field: 'purpose', headerName: 'Purpose', sortable: true, render: (p) => titleize(p.purpose) },
  {
    field: 'provider',
    headerName: 'Provider',
    render: (p) => `${titleize(p.provider)} · ${titleize(p.provider_method)}`,
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    sortable: true,
    render: (p) => formatMoney(p.amount, p.currency),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) => <StatusChip status={p.status} />,
  },
];

export default function Payments() {
  const { rows, total, isLoading, isFetching, error, table } = usePayments();

  return (
    <>
      <PageTitle
        title="Payments"
        subtitle="Payment oversight (PSP charges, escrow funding, subscriptions)."
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load payments.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No payments yet."
        {...table.controls}
      />
    </>
  );
}
