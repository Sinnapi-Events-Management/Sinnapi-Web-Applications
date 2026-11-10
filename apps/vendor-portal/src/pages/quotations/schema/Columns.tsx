import { Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { QuotationBookingModel, VendorQuotationModel } from '@/lib/types';
import QuotationBookingCell from '../components/molecules/QuotationBookingCell';

/**
 * Columns for the vendor's quote requests. A quote that has not been built yet
 * has no total, so that cell shows a dash rather than a misleading zero.
 *
 * A factory rather than a constant because two cells need facts the quotation
 * row does not carry: the client's name (RLS keeps their profile out of an
 * embed) and the booking made from the quote (the foreign key runs the other
 * way). Both are resolved once for the whole page and passed in, so the columns
 * stay renderers.
 */
export function quotationColumns(input: {
  clientName: (id: string | null) => string;
  bookingFor: (quotationId: string) => QuotationBookingModel | null;
}): DataTableColumn<VendorQuotationModel>[] {
  return [
    {
      field: 'reference_no',
      headerName: 'Reference',
      sortable: true,
      render: (q) => <Typography variant="body2">{q.reference_no ?? '—'}</Typography>,
    },
    {
      field: 'client',
      headerName: 'Client',
      render: (q) => input.clientName(q.client_id),
    },
    {
      // Resolved server-side (`search_quotations`): the quote's own date, else
      // the date of the event the client attached. Sortable — it is a real
      // column of the function's result.
      field: 'event_on',
      headerName: 'Event date',
      sortable: true,
      render: (q) => (q.event_on ? formatDate(q.event_on) : '—'),
    },
    {
      field: 'total',
      headerName: 'Total',
      align: 'right',
      sortable: true,
      render: (q) => (q.total ? formatMoney(q.total, q.currency) : '—'),
    },
    {
      field: 'valid_until',
      headerName: 'Valid until',
      sortable: true,
      render: (q) => formatDate(q.valid_until),
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      render: (q) => <StatusChip status={q.status} />,
    },
    {
      field: 'booking',
      headerName: 'Booking',
      render: (q) => <QuotationBookingCell status={q.status} booking={input.bookingFor(q.id)} />,
    },
  ];
}
