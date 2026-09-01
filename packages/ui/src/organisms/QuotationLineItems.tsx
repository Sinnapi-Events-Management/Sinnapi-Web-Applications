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
  /**
   * The name of the promotion this quote was priced with.
   *
   * Passed in rather than read: the offer's name lives on `discounts`, which a
   * client can only read while the campaign is live — and by the time they open
   * an old quote it usually is not. `quotation_offer` is the RPC that answers
   * it, and each portal calls that itself. Falls back to "Promotion", which is
   * true and unhelpful, rather than to nothing.
   */
  offerLabel?: string | null;
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
  offerLabel,
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
              // Its own line, never folded into the one above. The vendor's
              // discount is part of the package's published price; this one the
              // client claimed, and collapsing them would hide the value of the
              // thing they did.
              ...(pricing.offerDiscount > 0
                ? [
                    {
                      label: offerLabel ?? 'Promotion',
                      amount: -pricing.offerDiscount,
                      hint: 'A promotion you claimed on this booking.',
                    },
                  ]
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
