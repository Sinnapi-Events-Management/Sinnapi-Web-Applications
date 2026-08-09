import { Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRel, VendorBookingModel } from '@/lib/types';

/**
 * Columns for the vendor's bookings list.
 *
 * `sortable` marks only the columns the server can order by — the client name
 * comes from an embedded profile, so it is display-only. Opening a booking is a
 * whole-row action and lives on the table's `onRowClick`.
 */
export const bookingColumns: DataTableColumn<VendorBookingModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (b) => <Typography variant="body2">{b.reference_no ?? '—'}</Typography>,
  },
  {
    field: 'client',
    headerName: 'Client',
    render: (b) => one<ProfileRel>(b.profiles)?.full_name ?? 'Client',
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
