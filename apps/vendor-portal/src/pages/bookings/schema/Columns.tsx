import {
  PaymentTermsChip,
  PaymentWindowChip,
  Typography,
  type DataTableColumn,
  StatusChip,
} from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { VendorBookingModel } from '@/lib/types';

/**
 * Columns for the vendor's bookings list.
 *
 * `sortable` marks only the columns the server can order by — the client name
 * is resolved separately from the row (RLS keeps the client's profile out of an
 * embed), so it is display-only. Opening a booking is a whole-row action and
 * lives on the table's `onRowClick`.
 *
 * A factory rather than a constant so the page can resolve every name on the
 * page in one directory lookup and pass the resolver in.
 */
export function bookingColumns(
  clientName: (id: string | null) => string,
): DataTableColumn<VendorBookingModel>[] {
  return [
    {
      field: 'reference_no',
      headerName: 'Reference',
      sortable: true,
      render: (b) => <Typography variant="body2">{b.reference_no ?? '—'}</Typography>,
    },
    {
      field: 'client',
      headerName: 'Client',
      render: (b) => clientName(b.client_id),
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
      // Not sortable: two rail values over a whole list orders nothing useful,
      // and what a vendor actually scans for — "whose answer is this waiting
      // on" — is the terms status, which no single-column sort would express.
      render: (b) => <PaymentTermsChip rail={b.payment_type} status={b.payment_terms_status} />,
    },
    {
      field: 'payment_due_at',
      headerName: 'Payment due',
      // Not sortable: the deadline in force may be an admin's override rather
      // than this column, so ordering by it would sort the list by a date some
      // rows are not actually counting down to.
      render: (b) => <PaymentWindowChip booking={b} audience="vendor" />,
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (b) => <StatusChip status={b.status} />,
    },
  ];
}
