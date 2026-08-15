import type { SimpleTableColumn } from '@sinnapi/ui';
import { formatMoney } from '@/lib/config';
import type { QuotationItem } from '@/lib/types';

/**
 * A quotation line item with a stable key. `quotation_items` carries no id in
 * the document shape the RPC returns, and its rows are ordered rather than
 * identified — so the key is positional, assigned once here rather than
 * regenerated inside a render.
 */
export type QuotationItemRow = QuotationItem & { key: string };

export function toItemRows(items: QuotationItem[]): QuotationItemRow[] {
  return items.map((item, i) => ({ ...item, key: `item-${i}` }));
}

/** Line-item columns for the quotation card. Currency comes from the quote. */
export function quotationItemColumns(
  currency: string | null,
): SimpleTableColumn<QuotationItemRow>[] {
  return [
    { field: 'description', headerName: 'Description', render: (r) => r.description },
    {
      field: 'quantity',
      headerName: 'Qty',
      align: 'right',
      render: (r) => String(r.quantity ?? 1),
    },
    {
      field: 'unit_price',
      headerName: 'Unit price',
      align: 'right',
      render: (r) => formatMoney(r.unit_price, currency),
    },
    {
      field: 'line_total',
      headerName: 'Line total',
      align: 'right',
      render: (r) => formatMoney(r.line_total, currency),
    },
  ];
}
