import type { SimpleTableColumn } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { QuotationItemModel } from '@/lib/types';

/**
 * Columns for a quote's line items.
 *
 * A `SimpleTableColumn` rather than a `DataTableColumn`: these rows arrive with
 * the quotation and read as a breakdown, so there is nothing to paginate or
 * sort. The currency comes from the quotation, not the item, which is why this
 * is a factory.
 *
 * The quantity and unit price share a cell. A client reading a quote is
 * checking one thing — that "2 × 900,000" is the arrangement they discussed —
 * and splitting it across two columns makes them reassemble it themselves.
 */
export const getLineItemColumns = (
  currency: string | null,
): SimpleTableColumn<QuotationItemModel>[] => [
  { field: 'description', headerName: 'Item', render: (it) => it.description ?? '—' },
  {
    field: 'quantity',
    headerName: 'Qty × Unit price',
    align: 'right',
    render: (it) => `${it.quantity ?? 1} × ${formatMoney(it.unit_price, currency)}`,
  },
  {
    field: 'line_total',
    headerName: 'Line total',
    align: 'right',
    render: (it) => formatMoney(it.line_total, currency),
  },
];
