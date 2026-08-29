import { SectionGrid } from '@sinnapi/ui';
import type { QuotationPricing } from '@sinnapi/ui';
import type { EventRefModel, QuotationDetailModel, VendorRefModel } from '@/lib/types';
import QuotationBookingCard from './QuotationBookingCard';
import QuotationTimelineCard from './QuotationTimelineCard';

type Props = {
  quotationId: string;
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  event: EventRefModel | null;
  pricing: QuotationPricing;
};

/**
 * What has become of the quote: the booking it turned into, and the trail of
 * how it got there.
 *
 * The booking leads because it is the only thing here the client can act on —
 * once a quote is accepted, picking a date is the entire remaining job — and
 * the trail behind it is a record that can be read second.
 *
 * This section owns the booking dialog, by way of the card. That is why the
 * quotations list's "Create booking" shortcut links to `?tab=progress&book=1`
 * rather than `?book=1`: an inactive tab panel is unmounted, so the card has to
 * be on screen for the shortcut to reach it.
 *
 * The booking card draws nothing until the quote is accepted, and `SectionGrid`
 * is why the timeline then takes the space rather than sitting beside a hole.
 * The timeline never draws nothing, so the section is never empty.
 */
export default function ProgressSection({ quotationId, quotation, vendor, event, pricing }: Props) {
  return (
    <SectionGrid template={{ xs: '1fr', md: '5fr 7fr' }}>
      <QuotationBookingCard quotation={quotation} vendor={vendor} event={event} pricing={pricing} />
      <QuotationTimelineCard quotationId={quotationId} status={quotation.status} />
    </SectionGrid>
  );
}
