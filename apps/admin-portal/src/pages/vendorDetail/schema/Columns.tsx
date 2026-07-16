import { Rating, Typography, type DataTableColumn } from '@sinnapi/ui';
import StatusChip from '@/components/ui/StatusChip';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type {
  BookingModel,
  BookingRef,
  EscrowModel,
  PayoutModel,
  QuotationModel,
  ReviewModel,
  VendorPaymentModel,
} from '@/lib/types';

const mono = { fontFamily: 'ui-monospace, monospace' } as const;

/** Supabase embeds a to-one relation as an object or a single-item array. */
function bookingRef(value: BookingRef | BookingRef[] | null): string {
  const ref = Array.isArray(value) ? value[0] : value;
  return ref?.reference_no ?? '—';
}

export const bookingColumns: DataTableColumn<BookingModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (b) => (
      <Typography variant="body2" sx={mono}>
        {b.reference_no ?? '—'}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (b) => <StatusChip status={b.status} />,
  },
  {
    field: 'event_date',
    headerName: 'Event date',
    sortable: true,
    render: (b) => formatDate(b.event_date),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    sortable: true,
    align: 'right',
    render: (b) => formatMoney(b.amount, b.currency),
  },
];

export const quotationColumns: DataTableColumn<QuotationModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (q) => (
      <Typography variant="body2" sx={mono}>
        {q.reference_no ?? '—'}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (q) => <StatusChip status={q.status} />,
  },
  {
    field: 'created_at',
    headerName: 'Created',
    sortable: true,
    render: (q) => formatDate(q.created_at),
  },
  {
    field: 'total',
    headerName: 'Total',
    sortable: true,
    align: 'right',
    render: (q) => formatMoney(q.total, q.currency),
  },
];

export const paymentColumns: DataTableColumn<VendorPaymentModel>[] = [
  { field: 'purpose', headerName: 'Purpose', render: (p) => titleize(p.purpose) },
  {
    field: 'bookings',
    headerName: 'Booking',
    render: (p) => (
      <Typography variant="body2" sx={mono}>
        {bookingRef(p.bookings)}
      </Typography>
    ),
  },
  { field: 'provider', headerName: 'Provider', render: (p) => titleize(p.provider) },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) => <StatusChip status={p.status} />,
  },
  {
    field: 'created_at',
    headerName: 'Date',
    sortable: true,
    render: (p) => formatDate(p.created_at),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    sortable: true,
    align: 'right',
    render: (p) => formatMoney(p.amount, p.currency),
  },
];

export const escrowColumns: DataTableColumn<EscrowModel>[] = [
  {
    field: 'bookings',
    headerName: 'Booking',
    render: (e) => (
      <Typography variant="body2" sx={mono}>
        {bookingRef(e.bookings)}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (e) => <StatusChip status={e.status} />,
  },
  {
    field: 'gross_amount',
    headerName: 'Gross',
    align: 'right',
    render: (e) => formatMoney(e.gross_amount, e.currency),
  },
  {
    field: 'net_payout_amount',
    headerName: 'Net payout',
    align: 'right',
    render: (e) => formatMoney(e.net_payout_amount, e.currency),
  },
];

export const payoutColumns: DataTableColumn<PayoutModel>[] = [
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) => <StatusChip status={p.status} />,
  },
  {
    field: 'created_at',
    headerName: 'Requested',
    sortable: true,
    render: (p) => formatDate(p.created_at),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    sortable: true,
    align: 'right',
    render: (p) => formatMoney(p.amount, p.currency),
  },
];

export const reviewColumns: DataTableColumn<ReviewModel>[] = [
  {
    field: 'rating',
    headerName: 'Rating',
    sortable: true,
    render: (r) => <Rating value={r.rating ?? 0} size="small" readOnly />,
  },
  {
    field: 'title',
    headerName: 'Review',
    render: (r) => (
      <div>
        {r.title && (
          <Typography variant="body2" fontWeight={600}>
            {r.title}
          </Typography>
        )}
        {r.body && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 480,
            }}
          >
            {r.body}
          </Typography>
        )}
      </div>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (r) => <StatusChip status={r.status} />,
  },
  {
    field: 'created_at',
    headerName: 'Date',
    sortable: true,
    render: (r) => formatDate(r.created_at),
  },
];
