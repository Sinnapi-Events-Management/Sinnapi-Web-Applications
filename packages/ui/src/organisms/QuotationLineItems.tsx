'use client';
import { useMemo, type ReactNode } from 'react';
import { Divider } from '@mui/material';
import { MoneyBreakdown } from '../molecules/MoneyBreakdown';
import {
  quotationLineColumns,
  quotationLineRows,
  type QuotationLineLike,
} from '../molecules/quotationLines';
import type { QuotationPricing } from '../molecules/quotationPricing';
import { SimpleTable } from './SimpleTable';

export type QuotationLineItemsProps<Line extends QuotationLineLike> = {
  items: readonly Line[] | null | undefined;
  /** Resolved by `quotationPricing`, never recomputed here. */
  pricing: QuotationPricing;
  /** Shown instead of the table and totals when the quote carries no lines. */
  emptyMessage?: ReactNode;
  /** Label on the summed figure — "Quoted total" reads oddly on an invoice. */
  totalLabel?: string;
};

/**
 * What a quote covers, line by line, and how those lines add up.
 *
 * One renderer for all three portals: the client checking what they agreed to,
 * the vendor checking what they offered, and an operator checking whether the
 * booking matches either. They are reading the same document, so they read it
 * in the same shape.
 *
 * Discount and tax are dropped when zero rather than shown as `UGX 0` — most
 * quotes carry neither, and a row that reports a non-event is still a row the
 * eye has to read.
 *
 * The pricing is taken rather than derived so that the figure here, the figure
 * in the hero and the figure the booking was made at cannot disagree: none of
 * them does its own sums.
 */
export function QuotationLineItems<Line extends QuotationLineLike>({
  items,
  pricing,
  emptyMessage = 'This quote has no line items.',
  totalLabel = 'Quoted total',
}: QuotationLineItemsProps<Line>) {
  const rows = useMemo(() => quotationLineRows(items), [items]);
  const columns = useMemo(() => quotationLineColumns<Line>(pricing.currency), [pricing.currency]);

  return (
    <>
      <SimpleTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.key}
        minWidth={420}
        emptyMessage={emptyMessage}
      />

      {rows.length > 0 && (
        <>
          <Divider sx={{ my: 2.5 }} />
          <MoneyBreakdown
            currency={pricing.currency}
            lines={[
              { label: 'Subtotal', amount: pricing.subtotal },
              ...(pricing.discount > 0
                ? [{ label: 'Discount', amount: -pricing.discount, hint: 'Applied by the vendor.' }]
                : []),
              ...(pricing.tax > 0 ? [{ label: 'Tax', amount: pricing.tax, additive: true }] : []),
            ]}
            total={{ label: totalLabel, amount: pricing.total }}
          />
        </>
      )}
    </>
  );
}
