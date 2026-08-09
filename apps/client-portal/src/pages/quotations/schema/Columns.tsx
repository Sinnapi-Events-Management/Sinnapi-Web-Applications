import { Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { QuotationListModel, VendorNameSlugRefModel } from '@/lib/types';

/**
 * Columns for the client's quotations list. Sortable only where the server can
 * order — the vendor name is on an embedded relation.
 */
export const quotationColumns: DataTableColumn<QuotationListModel>[] = [
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
];
