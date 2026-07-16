import { DataTable, Alert, type DataTableColumn } from '@sinnapi/ui';
import PageTitle from '@/components/ui/PageTitle';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingModel, VendorRef } from '@/lib/types';
import { useBookings } from './hooks/useBookings';

const columns: DataTableColumn<BookingModel>[] = [
  { field: 'reference_no', headerName: 'Reference', sortable: true, render: (b) => b.reference_no },
  {
    field: 'vendor',
    headerName: 'Vendor',
    render: (b) => one<VendorRef>(b.vendors)?.business_name ?? '—',
  },
  {
    field: 'event_date',
    headerName: 'Date',
    sortable: true,
    render: (b) => formatDate(b.event_date),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    sortable: true,
    render: (b) => formatMoney(b.amount, b.currency),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (b) => <StatusChip status={b.status} />,
  },
];

export default function Bookings() {
  const { rows, total, isLoading, isFetching, error, table } = useBookings();

  return (
    <>
      <PageTitle title="Bookings" subtitle="Platform-wide booking oversight." />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : 'Failed to load bookings.'}
        </Alert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(b) => b.id}
        rowCount={total}
        loading={isLoading || isFetching}
        emptyMessage="No bookings yet."
        {...table.controls}
      />
    </>
  );
}
