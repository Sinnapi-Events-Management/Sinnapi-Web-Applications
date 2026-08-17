import { Stack } from '@sinnapi/ui';
import type { QuotationAdvanceSplit, QuotationPricing } from '@sinnapi/ui';
import type { EventRefModel, QuotationDetailModel, VendorRefModel } from '@/lib/types';
import QuotationBookingCard from './QuotationBookingCard';
import QuotationActionsCard from './QuotationActionsCard';
import QuotationAdvanceTermsCard from './QuotationAdvanceTermsCard';
import QuotationNextStepsCard from './QuotationNextStepsCard';

type Props = {
  quotation: QuotationDetailModel;
  vendor: VendorRefModel | null;
  event: EventRefModel | null;
  pricing: QuotationPricing;
  advance: QuotationAdvanceSplit;
};

/**
 * The narrow column: "what do I do about it".
 *
 * The order is the order the client meets these decisions in. The booking sits
 * at the top because once a quote is accepted it is the only thing left to do,
 * and it should not sit below a response card that has gone empty. The terms
 * follow the response they commit the client to, and the ways out that change
 * nothing come last.
 *
 * Every card here decides its own absence — an unaccepted quote has no booking
 * card, a settled one has no response card, a quote with no terms has no terms
 * card. That is deliberate: the condition for showing a card about advance
 * terms belongs with the card, not in a layout file that would then have to
 * know what an advance rate means.
 */
export default function QuotationResponseColumn({
  quotation,
  vendor,
  event,
  pricing,
  advance,
}: Props) {
  return (
    <Stack spacing={3}>
      <QuotationBookingCard quotation={quotation} vendor={vendor} event={event} pricing={pricing} />
      <QuotationActionsCard quotation={quotation} />
      <QuotationAdvanceTermsCard
        pricing={pricing}
        advance={advance}
        daysBefore={quotation.advance_release_days_before}
      />
      <QuotationNextStepsCard vendorId={quotation.vendor_id} vendor={vendor} />
    </Stack>
  );
}
