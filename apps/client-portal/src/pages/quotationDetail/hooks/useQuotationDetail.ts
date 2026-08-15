import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { isQuoteLapsed } from '@sinnapi/ui';
import { useQuotation } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { EventRefModel, QuotationItemModel, VendorRefModel } from '@/lib/types';

/**
 * Everything the quotation page renders, resolved in one place: the quote, the
 * vendor behind it, its priced lines and the few values that are derived rather
 * than stored. Components below this receive finished data and decide only how
 * it looks.
 */
export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data: quotation, isLoading, error } = useQuotation(id);

  // The reference number is what the client quotes in a message to the vendor,
  // so it is the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(quotation?.reference_no ? `Quote ${quotation.reference_no}` : undefined);

  const items = (quotation?.quotation_items ?? [])
    .slice()
    // PostgREST returns an embedded collection in no guaranteed order, and a
    // priced breakdown that reshuffles between reads is unreadable.
    .sort(
      (a: QuotationItemModel, b: QuotationItemModel) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

  return {
    quotationId: id,
    quotation,
    vendor: one<VendorRefModel>(quotation?.vendors),
    event: one<EventRefModel>(quotation?.events),
    items,
    /**
     * Whether the vendor has actually priced this yet. A `requested` quote is
     * a real row with a real reference and a total of zero — showing a
     * breakdown for it would present "nothing" as "free".
     */
    isPriced: Boolean(quotation && items.length > 0),
    /** Past its valid-until date, whatever the status column still says. */
    isLapsed: isQuoteLapsed(quotation?.valid_until),
    isLoading,
    error,
  };
}
