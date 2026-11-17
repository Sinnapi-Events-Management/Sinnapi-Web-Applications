import {
  PaymentTermsChip,
  PaymentWindowChip,
  Typography,
  type DataTableColumn,
  StatusChip,
} from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { bookingListHint, relativeDay } from '@/lib/bookingCopy';
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
  bookingFor: (id: string) => string | null,
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
      render: (b) => {
        const what = bookingFor(b.id);
        return (
          <>
            <Typography variant="body2" fontWeight={600}>
              {clientName(b.client_id)}
            </Typography>
            {what && (
              <Typography variant="caption" color="text.secondary">
                {what}
              </Typography>
            )}
          </>
        );
      },
    },
    {
      field: 'event_date',
      headerName: 'Date',
      sortable: true,
      render: (b) => (
        <>
          <Typography variant="body2">{formatDate(b.event_date)}</Typography>
          <Typography variant="caption" color="text.secondary">
            {relativeDay(b.event_date)}
          </Typography>
        </>
      ),
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
      // Whether the client paid in time only matters while the job is open.
      render: (b) =>
        ['requested', 'confirmed', 'in_progress'].includes(b.status) ? (
          <PaymentWindowChip booking={b} audience="vendor" />
        ) : null,
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (b) => {
        const hint = bookingListHint(b);
        return (
          <>
            <StatusChip status={b.status} domain="booking" />
            {hint?.urgent && (
              <Typography
                variant="caption"
                display="block"
                fontWeight={700}
                color="secondary.dark"
                sx={{ mt: 0.5 }}
              >
                {hint.text}
              </Typography>
            )}
          </>
        );
      },
    },
  ];
}
