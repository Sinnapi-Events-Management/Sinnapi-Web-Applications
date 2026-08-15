import { MoneyBreakdown } from '@sinnapi/ui';
import type { QuotationDetailModel } from '@/lib/types';

type Props = { quotation: QuotationDetailModel };

/**
 * How the line items add up to the figure the client is being asked to agree.
 *
 * Discount and tax are dropped when they are zero rather than shown as
 * `UGX 0` — a row that says nothing happened is a row the eye still has to
 * read, and most quotes carry neither.
 */
export default function QuotationTotals({ quotation: q }: Props) {
  const discount = Number(q.discount_total ?? 0);
  const tax = Number(q.tax_total ?? 0);

  return (
    <MoneyBreakdown
      currency={q.currency ?? 'UGX'}
      lines={[
        { label: 'Subtotal', amount: q.subtotal },
        ...(discount > 0
          ? [{ label: 'Discount', amount: -discount, hint: 'Applied by the vendor.' }]
          : []),
        ...(tax > 0 ? [{ label: 'Tax', amount: tax, additive: true }] : []),
      ]}
      total={{ label: 'Quoted total', amount: q.total }}
    />
  );
}
