import { DataTable, Alert, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { QuotationModel, VendorRef } from '@/lib/types';
import { useQuotations } from './hooks/useQuotations';

const columns: DataTableColumn<QuotationModel>[] = [
  { field: 'reference_no', headerName: 'Reference', sortable: true, render: (q) => q.reference_no },
  {
    field: 'vendor',
    headerName: 'Vendor',
    render: (q) => one<VendorRef>(q.vendors)?.business_name ?? '—',
  },
  {
    field: 'total',
    headerName: 'Total',
    align: 'right',
    sortable: true,
    render: (q) => (q.total ? formatMoney(q.total, q.currency) : '—'),
  },
  {
    field: 'created_at',
    headerName: 'Created',
    sortable: true,
    render: (q) => formatDate(q.created_at),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (q) => <StatusChip status={q.status} />,
  },
];

export default function Quotations() {
  const { rows, total, isLoading, isFetching, error, table } = useQuotations();

  return (
    <>
      <PageTitle title="Quotations" subtitle="Platform-wide quotation oversight." />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load quotations.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(q) => q.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No quotations yet."
        {...table.controls}
      />
    </>
  );
}
