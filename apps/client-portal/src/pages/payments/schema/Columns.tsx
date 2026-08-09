import { type DataTableColumn, StatusChip } from '@sinnapi/ui';
import { formatDate, formatMoney, titleize } from '@/lib/config';
import type { PaymentModel } from '@/lib/types';

/**
 * Columns for the client's payment history.
 *
 * The date column shows when money actually moved (`paid_at`), falling back to
 * when the payment was raised for ones still pending. Sorting is on
 * `created_at`, which every row has — ordering by a column that is null for
 * pending payments would scatter them to one end regardless of direction.
 */
export const paymentColumns: DataTableColumn<PaymentModel>[] = [
  {
    field: 'created_at',
    headerName: 'Date',
    sortable: true,
    render: (p) => formatDate(p.paid_at ?? p.created_at),
  },
  {
    field: 'purpose',
    headerName: 'Purpose',
    sortable: true,
    render: (p) => titleize(p.purpose),
  },
  {
    field: 'provider_method',
    headerName: 'Method',
    render: (p) => titleize(p.provider_method ?? ''),
  },
  {
    field: 'amount',
    headerName: 'Amount',
    align: 'right',
    sortable: true,
    render: (p) => formatMoney(p.amount, p.currency),
  },
  {
    field: 'status',
    headerName: 'Status',
    sortable: true,
    render: (p) => <StatusChip status={p.status} />,
  },
];
