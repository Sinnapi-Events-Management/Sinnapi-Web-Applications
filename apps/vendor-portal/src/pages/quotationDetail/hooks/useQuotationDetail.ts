import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBreadcrumbTitle } from '@sinnapi/ui/router';
import { advanceSplit, isQuoteLapsed, quotationPricing } from '@sinnapi/ui';
import { useDirectoryProfile, useQuotation } from '@/hooks/queries';
import { one } from '@/lib/rel';
import type { EventRefModel, QuotationItemModel } from '@/lib/types';

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

  // The client comes from a second read rather than an embedded relation.
  // `profiles_self_read` scopes that table to the caller's own row, so
  // `profiles:client_id(...)` on the quotation resolved to null for every quote
  // this page has ever shown; `get_profile_directory` discloses the name for a
  // client the vendor demonstrably has a quotation with. It is keyed on
  // `client_id`, which the quotation row carries, so it starts as soon as the
  // quote lands and does not serialize behind anything else on the page.
  const { profile: client, isLoading: isClientLoading } = useDirectoryProfile(data?.client_id);

  useBreadcrumbTitle(data?.reference_no ? `Quotation ${data.reference_no}` : undefined);

  const items = useMemo(
    () =>
      (data?.quotation_items ?? [])
        .slice()
        // PostgREST returns an embedded collection in no guaranteed order, and a
        // priced breakdown that reshuffles between reads is unreadable.
        .sort(
          (a: QuotationItemModel, b: QuotationItemModel) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0),
        ),
    [data?.quotation_items],
  );

  // Derived here, from the same shared function the client portal uses, so the
  // two sides of one deal cannot arrive at two different totals. See
  // `quotationPricing` for why the stored total is not simply trusted.
  const pricing = useMemo(() => quotationPricing(data, items), [data, items]);

  const advance = useMemo(
    () => advanceSplit(pricing.total, data?.advance_rate),
    [pricing.total, data?.advance_rate],
  );

  return {
    quotationId: id,
    quotation: data,
    client,
    /**
     * The client's name is still arriving. Separate from `isLoading` on
     * purpose: the quote itself renders without it, so the page shows the
     * numbers immediately and only the name waits.
     */
    isClientLoading,
    event: one<EventRefModel>(data?.events),
    items,
    isLoading,
    error,
    /**
     * Subtotal, discount, tax and the total, resolved against the line items.
     * Every figure this page shows comes from here rather than from the row, so
     * the hero, the breakdown and the payment terms cannot disagree.
     */
    pricing,
    /**
     * How that total divides under the terms the vendor proposed: what they
     * take up front and what stays in escrow until the client confirms.
     */
    advance,
    /**
     * Whether the quote has actually been priced yet. A `requested` row is real,
     * with a real reference and a total of zero — presenting that as a
     * breakdown would show "nothing" as "free".
     */
    isPriced: pricing.isPriced,
    isEditable: Boolean(data && EDITABLE_STATUSES.includes(data.status)),
    /** Past its valid-until date, whatever the status column still says. */
    isLapsed: isQuoteLapsed(data?.valid_until),
  };
}
