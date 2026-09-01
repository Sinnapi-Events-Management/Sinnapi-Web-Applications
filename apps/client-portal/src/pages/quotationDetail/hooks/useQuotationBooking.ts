import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  quotationBookingStage,
  type QuotationBookingStage,
  type QuotationPricing,
} from '@sinnapi/ui';
import { useQuotationBooking as useQuotationBookingQuery } from '@/hooks/queries';
import type { QuotationDetailModel } from '@/lib/types';

/**
 * Set by the "Create booking" shortcut on the quotations list, which lands on
 * this page with the dialog already open. A search param rather than router
 * state so the link survives being copied, opened in a new tab or refreshed.
 */
const OPEN_DIALOG_PARAM = 'book';

/**
 * Where this quotation stands between "accepted" and "booked", plus the open
 * state of the dialog that closes that gap.
 *
 * ONE INSTANCE PER PAGE, held by `useQuotationDetailPage`. It used to be called
 * inside the booking card, which was fine while the card was the only thing
 * that could open the dialog. It is not any more: the call to book is now
 * pinned above the tabs, the card still carries one, and both must agree about
 * whether a booking already exists and about whether the dialog is open. Two
 * instances would also both consume `?book` and race each other to rewrite the
 * query string.
 *
 * Split out from `useCreateBookingFromQuotation` on purpose. This is the
 * question the page asks on every render — has it been scheduled, and may it be
 * — and it has to be answerable without mounting a form. The form is expensive
 * (react-hook-form, a watch, a resolver) and lives inside a dialog that is
 * closed almost all of the time, so it is created when the dialog opens and
 * torn down when it closes, which is also what gives a cancelled attempt a
 * blank slate to come back to.
 *
 * Pricing is passed in rather than re-read here. `pricing.isPriced` alone is
 * not enough to book on — it means "the vendor built line items", which a quote
 * can satisfy while still totalling zero — and what a booking needs is an
 * amount, because that is what both payment rails are priced against.
 */
export function useQuotationBooking(
  quotation: QuotationDetailModel | null | undefined,
  pricing: QuotationPricing,
) {
  const quotationId = quotation?.id;
  const { data: booking, isLoading } = useQuotationBookingQuery(quotationId);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  const stage: QuotationBookingStage = quotationBookingStage({
    quotationStatus: quotation?.status,
    bookingStatus: booking?.status,
  });

  const isBookablePrice = pricing.isPriced && pricing.total > 0;

  /**
   * The one state with a button. `released` deliberately has none: the partial
   * unique index counts a cancelled booking, so the server would refuse a
   * second one — offering the button would be offering a failure.
   */
  const canCreate = stage === 'bookable' && isBookablePrice;

  const openDialog = useCallback(() => {
    // Gated here rather than at each caller. The dialog is opened from three
    // places now — the bar above the tabs, the card in Progress, and the list's
    // deep link — and a price check written three times is a price check that
    // will eventually be written twice.
    if (canCreate) setDialogOpen(true);
  }, [canCreate]);

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  /**
   * Honour the list's shortcut, but only once the reads have settled and only
   * if the quote really is bookable — the list row could be a page old, and
   * opening a form over a quote that has since been booked would ask for a date
   * the server is going to refuse.
   *
   * The param is consumed on arrival, whether or not it opened anything, so a
   * refresh or a Back into this page does not re-open a dialog the client has
   * already dismissed. `replace` keeps that out of the history stack.
   */
  const wantsDialog = params.get(OPEN_DIALOG_PARAM) !== null;
  useEffect(() => {
    if (!wantsDialog || isLoading || !quotation) return;
    openDialog();
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(OPEN_DIALOG_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [wantsDialog, isLoading, quotation, openDialog, setParams]);

  return {
    /** The booking made from this quote, or null while it is unscheduled. */
    booking: booking ?? null,
    stage,
    /**
     * Still resolving whether a booking exists. Callers render a placeholder
     * rather than "Create booking", which would flash a control that is about
     * to be replaced by a link to a booking that already exists.
     */
    isLoading,

    canCreate,

    /**
     * Why an accepted quote that should be offering a booking is not, or `null`
     * when nothing is in the way. Same shape as the action bar's
     * `acceptBlockedBy`, and for the same reason: a client looking at an
     * accepted quote deserves the sentence rather than a page that has quietly
     * stopped offering the step.
     */
    blockedBy: stage === 'bookable' && !isBookablePrice ? ('unpriced' as const) : null,

    isDialogOpen,
    openDialog,
    closeDialog,
  };
}

export type QuotationBookingState = ReturnType<typeof useQuotationBooking>;
