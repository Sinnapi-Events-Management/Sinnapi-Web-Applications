import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { isQuoteLapsed } from '@sinnapi/ui';
import { useQuotation } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { EventRefModel, ProfileRel, QuotationItemModel } from '@/lib/types';

/**
 * Statuses where the vendor can still change the quote. Anything past these has
 * been sent to the client, so the page shows the breakdown instead of the
 * builder — editing a quote the client is already looking at would move the
 * numbers under them.
 */
const EDITABLE_STATUSES = ['requested', 'draft', 'revised'];

/**
 * Everything the quotation page renders, resolved in one place: the quote, the
 * client behind it, its priced lines and the few values that are derived rather
 * than stored. Components below this receive finished data and decide only how
 * it looks.
 */
export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data, isLoading, error } = useQuotation(id);

  useBreadcrumbTitle(data?.reference_no ? `Quotation ${data.reference_no}` : undefined);

  const items = (data?.quotation_items ?? [])
    .slice()
    // PostgREST returns an embedded collection in no guaranteed order, and a
    // priced breakdown that reshuffles between reads is unreadable.
    .sort(
      (a: QuotationItemModel, b: QuotationItemModel) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );

  return {
    quotationId: id,
    quotation: data,
    client: one<ProfileRel>(data?.profiles),
    event: one<EventRefModel>(data?.events),
    items,
    isLoading,
    error,
    /**
     * Whether the quote has actually been priced yet. A `requested` row is real,
     * with a real reference and a total of zero — presenting that as a
     * breakdown would show "nothing" as "free".
     */
    isPriced: Boolean(data && items.length > 0),
    isEditable: Boolean(data && EDITABLE_STATUSES.includes(data.status)),
    /** Past its valid-until date, whatever the status column still says. */
    isLapsed: isQuoteLapsed(data?.valid_until),
  };
}
