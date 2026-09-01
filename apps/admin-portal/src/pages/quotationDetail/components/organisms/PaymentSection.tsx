import type { QuotationAdvanceSplit, QuotationPricing } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import QuotationAdvanceTermsCard from './QuotationAdvanceTermsCard';

type Props = {
  pricing: QuotationPricing;
  advance: QuotationAdvanceSplit;
  daysBefore: number | null;
  note: string | null;
};

/**
 * What this quote would have paid out, and when.
 *
 * A request the vendor never priced carries no terms, so there is genuinely
 * nothing to divide. The tab stays anyway and says so: a tab that vanished
 * between one quotation and the next would move every tab beside it sideways,
 * and a section rendering nothing at all reads as a panel that failed to load
 * rather than as an absence with a reason.
 *
 * The empty case is decided here, on `hasTerms`, rather than inside the card.
 * The card's own job is to render whichever of the two shapes the terms take —
 * a split, or a stated absence of advance — and both of those are still terms.
 */
export default function PaymentSection({ pricing, advance, daysBefore, note }: Props) {
  if (!advance.hasTerms) {
    return (
      <EmptyState
        title="No payment terms"
        description="The vendor never proposed an advance on this quote — it was not priced, or it predates payment terms. Nothing here would have been carried to a booking."
      />
    );
  }

  return (
    <QuotationAdvanceTermsCard
      pricing={pricing}
      advance={advance}
      daysBefore={daysBefore}
      note={note}
    />
  );
}
