import { Typography, type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import { one } from '@/lib/rel';
import type { ProfileRel, VendorQuotationModel } from '@/lib/types';

/**
 * Columns for the vendor's quote requests. A quote that has not been built yet
 * has no total, so that cell shows a dash rather than a misleading zero.
 */
export const quotationColumns: DataTableColumn<VendorQuotationModel>[] = [
  {
    field: 'reference_no',
    headerName: 'Reference',
    sortable: true,
    render: (q) => <Typography variant="body2">{q.reference_no ?? '—'}</Typography>,
  },
  {
    field: 'client',
    headerName: 'Client',
    render: (q) => one<ProfileRel>(q.profiles)?.full_name ?? 'Client',
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
];
