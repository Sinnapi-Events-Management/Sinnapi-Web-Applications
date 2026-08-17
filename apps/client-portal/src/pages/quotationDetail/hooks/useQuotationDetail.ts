import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { advanceSplit, isQuoteLapsed, quotationPricing } from '@sinnapi/ui';
import { useQuotation } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { EventRefModel, QuotationItemModel, VendorRefModel } from '@/lib/types';

/**
 * Everything the quotation page renders, resolved in one place: the quote, the
 * vendor behind it, its priced lines and the few values that are derived rather
 * than stored. Components below this receive finished data and decide only how
 * it looks.
 *
 * The money is derived here rather than read off the row in each card. Six
 * components on this page put a figure in front of the client — the hero, the
 * breakdown, the terms, the booking dialog's carry-over — and every one of them
 * used to reach for `quotation.total` itself. That is six chances to disagree
 * about one price, and the one that mattered was all six agreeing on zero. Now
 * there is a single `pricing` object, and a card that wants a number takes it.
 */
export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data: quotation, isLoading, error } = useQuotation(id);

  // The reference number is what the client quotes in a message to the vendor,
  // so it is the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(quotation?.reference_no ? `Quote ${quotation.reference_no}` : undefined);

  const items = useMemo(
    () =>
      (quotation?.quotation_items ?? [])
        .slice()
        // PostgREST returns an embedded collection in no guaranteed order, and a
        // priced breakdown that reshuffles between reads is unreadable.
        .sort(
          (a: QuotationItemModel, b: QuotationItemModel) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0),
        ),
    [quotation?.quotation_items],
  );

  const pricing = useMemo(() => quotationPricing(quotation, items), [quotation, items]);

  const advance = useMemo(
    () => advanceSplit(pricing.total, quotation?.advance_rate),
    [pricing.total, quotation?.advance_rate],
  );

  return {
    quotationId: id,
    quotation,
    vendor: one<VendorRefModel>(quotation?.vendors),
    event: one<EventRefModel>(quotation?.events),
    items,
    /**
     * Subtotal, discount, tax and the total, resolved against the line items —
     * see `quotationPricing`. Every figure on this page comes from here.
     */
    pricing,
    /**
     * How that total divides under the vendor's proposed advance terms, and
     * whether terms were proposed at all. Both the terms card and the booking
     * dialog need the split, and they must not compute it twice.
     */
    advance,
    /**
     * Whether the vendor has actually priced this yet. A `requested` quote is
     * a real row with a real reference and a total of zero — showing a
     * breakdown for it would present "nothing" as "free".
     */
    isPriced: pricing.isPriced,
    /** Past its valid-until date, whatever the status column still says. */
    isLapsed: isQuoteLapsed(quotation?.valid_until),
    isLoading,
    error,
  };
}
