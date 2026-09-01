import { SectionGrid } from '@sinnapi/ui';
import type { QuotationBookingState } from '../../hooks/useQuotationBooking';
import QuotationBookingCard from './QuotationBookingCard';
import QuotationTimelineCard from './QuotationTimelineCard';

type Props = {
  quotationId: string;
  quotationStatus: string;
  /** The page's single booking state, shared with the bar above the tabs. */
  booking: QuotationBookingState;
};

/**
 * What has become of the quote: the booking it turned into, and the trail of
 * how it got there.
 *
 * Both halves are a record now. The act of scheduling has moved above the tabs
 * — see `QuotationBookingBar` — because this section is the last tab and reads
 * as history, which is a poor place to keep the one step a client still owes.
 * The booking card kept everything about the booking that is worth reading
 * rather than pressing, and a secondary way in for whoever is already here.
 *
 * The booking still leads, because a booking that exists is the more specific
 * fact and the trail behind it is the general one.
 *
 * The booking card draws nothing until the quote is accepted, and `SectionGrid`
 * is why the timeline then takes the space rather than sitting beside a hole.
 * The timeline never draws nothing, so the section is never empty.
 */
export default function ProgressSection({ quotationId, quotationStatus, booking }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '5fr 7fr' }}>
      <QuotationBookingCard booking={booking} />
      <QuotationTimelineCard quotationId={quotationId} status={quotationStatus} />
    </SectionGrid>
  );
}
