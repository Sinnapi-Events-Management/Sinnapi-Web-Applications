import { type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { BookingRel, EscrowModel } from '@/lib/types';

/**
 * Columns for the vendor's escrow view. Read-only: release is confirmed by the
 * client and approved by Sinnapi, so there are no row actions here.
 *
 * The money columns are right-aligned and the net payout emphasised — it is the
 * figure the vendor actually receives. The booking reference is on an embedded
 * relation, so it is not offered as a sort.
 */
export const escrowColumns: DataTableColumn<EscrowModel>[] = [
  {
    field: 'booking',
    headerName: 'Booking',
    render: (e) => one<BookingRel>(e.bookings)?.reference_no ?? '—',
  },
  {
    field: 'gross_amount',
    headerName: 'Gross',
    align: 'right',
    sortable: true,
    render: (e) => formatMoney(e.gross_amount, e.currency),
  },
  {
    field: 'commission_amount',
    headerName: 'Commission',
    align: 'right',
    sortable: true,
    render: (e) => formatMoney(e.commission_amount, e.currency),
  },
  {
    field: 'net_payout_amount',
    headerName: 'Net payout',
    align: 'right',
    sortable: true,
    render: (e) => <strong>{formatMoney(e.net_payout_amount, e.currency)}</strong>,
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => <StatusChip status={e.status} />,
  },
];
