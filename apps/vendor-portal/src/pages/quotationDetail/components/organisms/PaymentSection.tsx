import type { QuotationAdvanceSplit, QuotationPricing } from '@sinnapi/ui';
import { EmptyState } from '@sinnapi/ui/router';
import QuotationAdvanceTermsCard from './QuotationAdvanceTermsCard';

type Props = {
  pricing: QuotationPricing;
  advance: QuotationAdvanceSplit;
  daysBefore: number | null;
};

/**
 * What this quote pays out, and when.
 *
 * A request the vendor has not priced yet carries no terms, so there is
 * genuinely nothing to divide. The tab stays anyway and says so: a tab that
 * vanished from under a vendor the moment they were reading it would be worse
 * than one that explains itself, and the section that reappeared on the next
 * poll would move every tab beside it sideways.
 *
 * The empty case is stated here rather than left to the card. The card also
 * refuses to draw without terms — that guard belongs with the thing that knows
 * what an advance rate means — but a section that renders nothing at all reads
 * as a panel that failed to load.
 */
export default function PaymentSection({ pricing, advance, daysBefore }: Props) {
  if (!advance.hasTerms) {
    return (
      <EmptyState
        title="No payment terms yet"
        description="Terms are set when you build the quote. Price this request and propose an advance, and the split you would be paid shows up here."
      />
    );
  }

  return <QuotationAdvanceTermsCard pricing={pricing} advance={advance} daysBefore={daysBefore} />;
}
