import { Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingListModel, VendorRefModel } from '@/lib/types';

/**
 * Columns for the client's bookings list.
 *
 * `sortable` marks the columns the server can actually order by — the vendor
 * name lives on an embedded relation, so it is read-only here rather than
 * offering a sort the query cannot honour. Opening a booking is a whole-row
 * action, so it belongs to the table's `onRowClick`, not to a cell.
 */
export const bookingColumns: DataTableColumn<BookingListModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (b) => <Typography variant="body2">{b.reference_no ?? '—'}</Typography>,
  },
  {
    field: 'vendor',
    headerName: 'Vendor',
    render: (b) => one<VendorRefModel>(b.vendors)?.business_name ?? '—',
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
