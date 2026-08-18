import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { quotationBookingStage, type QuotationBookingStage } from '@sinnapi/ui';
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
 * Split out from `useCreateBookingFromQuotation` on purpose. This is the
 * question the card asks on every render — has it been scheduled, and may it be
 * — and it has to be answerable without mounting a form. The form is expensive
 * (react-hook-form, a watch, a resolver) and lives inside a dialog that is
 * closed almost all of the time, so it is created when the dialog opens and
 * torn down when it closes, which is also what gives a cancelled attempt a
 * blank slate to come back to.
 */
export function useQuotationBooking(quotation: QuotationDetailModel | null | undefined) {
  const quotationId = quotation?.id;
  const { data: booking, isLoading } = useQuotationBookingQuery(quotationId);

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  const stage: QuotationBookingStage = quotationBookingStage({
    quotationStatus: quotation?.status,
    bookingStatus: booking?.status,
  });
  const canCreate = stage === 'bookable';

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
    if (canCreate) setDialogOpen(true);
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(OPEN_DIALOG_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [wantsDialog, isLoading, quotation, canCreate, setParams]);

  return {
    /** The booking made from this quote, or null while it is unscheduled. */
    booking: booking ?? null,
    stage,
    /**
     * Still resolving whether a booking exists. The card renders a placeholder
     * rather than "Create booking", which would flash a control that is about
     * to be replaced by a link to a booking that already exists.
     */
    isLoading,

    /**
     * The one state with a button. `released` deliberately has none: the
     * partial unique index counts a cancelled booking, so the server would
     * refuse a second one — offering the button would be offering a failure.
     */
    canCreate,

    isDialogOpen,
    openDialog: () => setDialogOpen(true),
    closeDialog: () => setDialogOpen(false),
  };
}
