import { type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { QuotationListModel, VendorNameSlugRefModel } from '@/lib/types';

/**
 * Columns for the comparison view. Same rows as the quotations list, a
 * different job: no reference number, vendor first and the total emphasised,
 * so the eye runs straight down the numbers being weighed up.
 */
export const compareQuoteColumns: DataTableColumn<QuotationListModel>[] = [
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
    render: (q) => <strong>{formatMoney(q.total, q.currency)}</strong>,
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
];
