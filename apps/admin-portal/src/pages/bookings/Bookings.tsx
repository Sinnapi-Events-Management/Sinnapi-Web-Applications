import {
  DataTable,
  Alert,
  type DataTableColumn,
  PageTitle,
  PaymentTermsChip,
  PaymentWindowChip,
  StatusChip,
} from '@sinnapi/ui';
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
    field: 'payment_type',
    headerName: 'Payment',
    // Not sortable: two rail values order nothing useful across a platform-wide
    // list, and what an operator scans for — an off-platform booking nobody
    // ever agreed to — is the pairing, which one column sort cannot express.
    render: (b) => <PaymentTermsChip rail={b.payment_type} status={b.payment_terms_status} />,
  },
  {
    field: 'payment_due_at',
    headerName: 'Payment due',
    // Not sortable: the deadline in force may be an admin's override rather
    // than this column, so ordering by it would sort the list by a date some
    // rows are not actually counting down to. The Awaiting-payment queue sorts
    // on the server-resolved deadline, which is the place to work this from.
    render: (b) => (
      <PaymentWindowChip booking={{ ...b, payment_type: b.payment_type }} audience="admin" />
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (b) => <StatusChip status={b.status} />,
  },
];

export default function Bookings() {
  const { rows, total, isLoading, isFetching, error, table, viewBooking } = useBookings();

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
        onRowClick={(b) => viewBooking(b.id)}
        {...table.controls}
      />
    </>
  );
}
