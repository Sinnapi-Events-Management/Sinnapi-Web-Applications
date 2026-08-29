import { SectionGrid } from '@sinnapi/ui';
import type { QuotationDetailModel } from '@/lib/types';
import QuotationBookingCard from './QuotationBookingCard';
import QuotationTimelineCard from './QuotationTimelineCard';

type Props = {
  quotationId: string;
  quotation: QuotationDetailModel;
};

/**
 * What has become of the quote: the booking it turned into, and the trail of
 * how it got there.
 *
 * The booking leads because it is the only live thing on this section — a quote
 * the client accepted is either waiting on their date or waiting on the
 * vendor's confirmation, and both are work. The trail behind it is a record and
 * can be read second.
 *
 * The booking card draws nothing until the quote is accepted, and
 * `SectionGrid` is why the timeline then takes the space rather than sitting
 * beside a hole. The timeline never draws nothing, so the section is never
 * empty.
 */
export default function ProgressSection({ quotationId, quotation }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '5fr 7fr' }}>
      <QuotationBookingCard quotation={quotation} />
      <QuotationTimelineCard quotationId={quotationId} status={quotation.status} />
    </SectionGrid>
  );
}
