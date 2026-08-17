import { quotationBookingStage, type QuotationBookingStage } from '@sinnapi/ui';
import { useQuotationBooking as useQuotationBookingQuery } from '@/hooks/queries';
import type { QuotationDetailModel } from '@/lib/types';

/**
 * Where an accepted quote has got to on its way to a booking, from the vendor's
 * side.
 *
 * The vendor has no button here, and that is the point of the hook rather than
 * an argument against it. Creating the booking is the client's move — they are
 * the only party who knows the date, and the price is already agreed — so what
 * the vendor needs is the answer to "has anything happened since they
 * accepted", which was previously nowhere on their screen: a quote turned
 * `accepted` and then the trail went quiet.
 *
 * Same `quotationBookingStage` the client portal uses, so the two sides cannot
 * disagree about which of the four states one row is in.
 */
export function useQuotationBooking(quotation: QuotationDetailModel | null | undefined) {
  const { data: booking, isLoading } = useQuotationBookingQuery(quotation?.id);

  const stage: QuotationBookingStage = quotationBookingStage({
    quotationStatus: quotation?.status,
    bookingStatus: booking?.status,
  });

  return {
    booking: booking ?? null,
    stage,
    isLoading,
    /**
     * Accepted, and the client has not picked a date yet. The vendor's only
     * useful move is to ask them — which is a message, not a status write.
     */
    isAwaitingClient: stage === 'bookable',
    /** Nothing to show: the quote has not been accepted, so nothing is pending. */
    isHidden: stage === 'not-accepted',
  };
}
