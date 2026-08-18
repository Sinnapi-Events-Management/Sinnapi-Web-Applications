/**
 * A quotation's line items as a table, shared by all three portals.
 *
 * Pure data (no React/MUI), the companion to `quotationPricing`: that one
 * decides what the lines add up to, this one decides how a single line reads.
 * Both exist for the same reason — the client, the vendor and an operator are
 * looking at one quote, and "2 × 900,000" must not become "1 × 1,800,000" on
 * the way between screens.
 *
 * The columns merge quantity and unit price into one cell on purpose. Someone
 * checking a quote is verifying an arrangement they discussed — "two speakers
 * at 900,000" — and splitting that across two columns makes them reassemble it
 * themselves, in a card that is usually half a page wide.
 */
import { formatAmount } from './money';
import type { QuotationLineItemLike } from './quotationPricing';
import type { TableColumn } from '../organisms/tableColumns';

/** A line item as any of the three portals' read models carries one. */
export type QuotationLineLike = QuotationLineItemLike & {
  /** Present on the embedded reads; absent from the RPC document shape. */
  id?: string | null;
  description?: string | null;
};

/**
 * A line with a key that is stable for a render.
 *
 * Positional rather than derived from the content: `get_booking_admin` returns
 * the items ordered rather than identified, so two identical lines — a real
 * thing on a quote for two of the same item on different days — would otherwise
 * collide.
 */
export type QuotationLineRow<Line extends QuotationLineLike = QuotationLineLike> = Line & {
  key: string;
};

/** Key each line for the table. Order is the vendor's; it is not re-sorted here. */
export function quotationLineRows<Line extends QuotationLineLike>(
  items: readonly Line[] | null | undefined,
): QuotationLineRow<Line>[] {
  return (items ?? []).map((item, index) => ({
    ...item,
    key: item.id ?? `line-${index}`,
  }));
}

/**
 * The three columns of a quotation breakdown. A factory because the currency
 * belongs to the quotation, not to any one line.
 */
export function quotationLineColumns<Line extends QuotationLineLike>(
  currency: string | null | undefined,
): TableColumn<QuotationLineRow<Line>>[] {
  const cur = currency ?? 'UGX';

  return [
    {
      field: 'description',
      headerName: 'Item',
      render: (line) => line.description || '—',
    },
    {
      field: 'quantity',
      headerName: 'Qty × Unit price',
      align: 'right',
      render: (line) => `${line.quantity ?? 1} × ${formatAmount(line.unit_price, cur)}`,
    },
    {
      field: 'line_total',
      headerName: 'Line total',
      align: 'right',
      render: (line) => formatAmount(line.line_total, cur),
    },
  ];
}
