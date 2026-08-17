import { Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type {
  QuotationBookingModel,
  QuotationListModel,
  VendorNameSlugRefModel,
} from '@/lib/types';
import QuotationNextStep from '../components/molecules/QuotationNextStep';

/**
 * Columns for the client's quotations list. Sortable only where the server can
 * order — the vendor name is on an embedded relation, and the next-step cell is
 * derived from two rows.
 *
 * A factory rather than a constant because the last column needs two things the
 * quotation row does not carry: whether it has already been booked, and where
 * to send the client who wants to book it. Both are resolved once for the page
 * and passed in, so the column stays a renderer.
 */
export function quotationColumns(input: {
  bookingFor: (quotationId: string) => QuotationBookingModel | null;
  onBook: (quotationId: string) => void;
}): DataTableColumn<QuotationListModel>[] {
  return [
    {
      field: 'reference_no',
      headerName: 'Reference',
      sortable: true,
      render: (q) => <Typography variant="body2">{q.reference_no ?? '—'}</Typography>,
    },
    {
      field: 'vendor',
      headerName: 'Vendor',
      render: (q) => one<VendorNameSlugRefModel>(q.vendors)?.business_name ?? '—',
    },
    {
      field: 'total',
      headerName: 'Total',
      align: 'right',
      sortable: true,
      render: (q) => formatMoney(q.total, q.currency),
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
      field: 'next_step',
      headerName: '',
      align: 'right',
      render: (q) => (
        <QuotationNextStep
          status={q.status}
          booking={input.bookingFor(q.id)}
          onBook={() => input.onBook(q.id)}
        />
      ),
    },
  ];
}
