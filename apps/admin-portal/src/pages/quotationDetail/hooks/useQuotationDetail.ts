import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { advanceSplit, isQuoteLapsed, quotationPricing } from '@sinnapi/ui';
import { useQuotationAdmin } from '@/hooks/queries';

/**
 * Everything the console's quotation page renders, resolved in one place: the
 * quote with both parties, its priced lines and the few values that are derived
 * rather than stored. Components below this receive finished data and decide
 * only how it looks.
 *
 * The money is derived through the same `quotationPricing` the client and
 * vendor portals use, deliberately. An operator is usually on this page because
 * one of those two is disputing a figure, and a console that computed the total
 * its own way could disagree with both of the screens it is meant to
 * adjudicate.
 *
 * There is no write here and no mutation hook beside it. `quotations_update`
 * admits only the client and the vendor owner: a quote is an offer between two
 * parties, and the console reads it.
 */
export function useQuotationDetail() {
  const { id = '' } = useParams();
  const { data: quotation, isLoading, error } = useQuotationAdmin(id);

  // The reference number is what both parties quote in correspondence, so it is
  // the crumb worth showing over the opaque row id.
  useBreadcrumbTitle(quotation?.reference_no ? `Quotation ${quotation.reference_no}` : undefined);

  // Already ordered by `sort_order` inside `get_quotation_admin`, so unlike the
  // portals' PostgREST embeds there is nothing to re-sort here.
  const items = useMemo(() => quotation?.items ?? [], [quotation?.items]);

  const pricing = useMemo(() => quotationPricing(quotation, items), [quotation, items]);

  const advance = useMemo(
    () => advanceSplit(pricing.total, quotation?.advance_rate),
    [pricing.total, quotation?.advance_rate],
  );

  return {
    quotationId: id,
    quotation: quotation ?? null,
    items,
    /**
     * Subtotal, discount, tax and the total, resolved against the line items.
     * Every figure this page shows comes from here rather than from the row, so
     * the hero, the breakdown and the payment terms cannot disagree.
     */
    pricing,
    /**
     * How that total would have divided under the terms the vendor proposed.
     * Worth showing even on a quote that never became a booking: it is the
     * origin of the release schedule an operator gets asked about.
     */
    advance,
    /** Past its valid-until date, whatever the status column still says. */
    isLapsed: isQuoteLapsed(quotation?.valid_until),
    isLoading,
    error,
  };
}
