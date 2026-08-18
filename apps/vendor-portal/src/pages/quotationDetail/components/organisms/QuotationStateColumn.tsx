import { Stack } from '@sinnapi/ui';
import type { QuotationAdvanceSplit, QuotationPricing } from '@sinnapi/ui';
import type { QuotationDetailModel } from '@/lib/types';
import QuotationBookingCard from './QuotationBookingCard';
import QuotationActionsCard from './QuotationActionsCard';
import QuotationAdvanceTermsCard from './QuotationAdvanceTermsCard';
import QuotationTimelineCard from './QuotationTimelineCard';

type Props = {
  quotationId: string;
  quotation: QuotationDetailModel;
  pricing: QuotationPricing;
  advance: QuotationAdvanceSplit;
  isLapsed: boolean;
};

/**
 * The narrow column: the state. What has happened to this quote, what the
 * vendor can still do about it, what they will be paid and when, and how it got
 * here.
 *
 * The booking sits at the top because it is what happened *after* the client
 * accepted — the one live thing on this column once the manage panel empties
 * out. The payment terms follow the actions rather than lead them: they are
 * what the quote already commits to, not a decision left to make.
 *
 * That order mirrors the client's response column deliberately. The two sides
 * are looking at one object and should recognise each other's screen.
 */
export default function QuotationStateColumn({
  quotationId,
  quotation,
  pricing,
  advance,
  isLapsed,
}: Props) {
  return (
    <Stack spacing={3}>
      <QuotationBookingCard quotation={quotation} />
      <QuotationActionsCard quotation={quotation} isLapsed={isLapsed} />
      <QuotationAdvanceTermsCard
        pricing={pricing}
        advance={advance}
        daysBefore={quotation.advance_release_days_before}
      />
      <QuotationTimelineCard quotationId={quotationId} status={quotation.status} />
    </Stack>
  );
}
