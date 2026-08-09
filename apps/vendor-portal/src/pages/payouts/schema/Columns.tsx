import { type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney } from '@/lib/config';
import type { PayoutModel } from '@/lib/types';

/**
 * Columns for the vendor's payout history — the lifecycle of each payout laid
 * out left to right: requested, then approved, then completed. The later dates
 * are null until those steps happen, which `formatDate` renders as a dash.
 */
export const payoutColumns: DataTableColumn<PayoutModel>[] = [
  {
    field: 'created_at',
    headerName: 'Requested',
    sortable: true,
    render: (p) => formatDate(p.created_at),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    sortable: true,
    render: (p) => <strong>{formatMoney(p.amount, p.currency)}</strong>,
  },
  {
    field: 'approved_at',
    headerName: 'Approved',
    sortable: true,
    render: (p) => formatDate(p.approved_at),
  },
  {
    field: 'completed_at',
    headerName: 'Completed',
    sortable: true,
    render: (p) => formatDate(p.completed_at),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) => <StatusChip status={p.status} />,
  },
];
