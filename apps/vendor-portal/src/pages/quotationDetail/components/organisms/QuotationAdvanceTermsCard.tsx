import {
  MoneyBreakdown,
  SectionCard,
  Typography,
  formatRate,
  type QuotationAdvanceSplit,
  type QuotationPricing,
} from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';

type Props = {
  pricing: QuotationPricing;
  advance: QuotationAdvanceSplit;
  daysBefore: number | null;
};

/**
 * The payment terms this quote carries, from the side that proposed them.
 *
 * The vendor sets these in the builder and then never sees them again: once the
 * quote is sent the builder is replaced by the breakdown, and the terms
 * survived only as one line of prose in the details card. That is the wrong
 * half of the information. The rate is not the question a vendor has — "how
 * much of this do I actually get up front, and when" is — and it was the one
 * figure only the client's screen answered.
 *
 * So this is the client's Payment terms card, told from the other side: same
 * split, same total, the amounts labelled as money coming in rather than money
 * going out. Both parties can now read the same schedule off their own page,
 * which is the point — an advance is a thing two people have to agree about.
 *
 * Rendered under the total as a split rather than as more lines: `afterTotal`
 * exists so that nothing below a total can read as another charge on top of it.
 *
 * The card decides its own absence. A request the vendor has not quoted yet has
 * no terms to show, and that condition belongs here rather than in the page.
 */
export default function QuotationAdvanceTermsCard({ pricing, advance, daysBefore }: Props) {
  if (!advance.hasTerms) return null;

  return (
    <SectionCard
      title="Payment terms"
      icon={<HandshakeIcon />}
      accent="info"
      subtitle="What you proposed with this quote"
    >
      {advance.hasAdvance ? (
        <MoneyBreakdown
          currency={pricing.currency}
          dense
          lines={[{ label: 'Quoted total', amount: pricing.total, muted: true }]}
          afterTotal={[
            {
              label: `Your advance (${formatRate(advance.rate)})`,
              amount: advance.advance,
              hint:
                daysBefore != null && daysBefore > 0
                  ? `Paid out to you ${daysBefore} days before the event, once the booking is funded.`
                  : 'Paid out to you as soon as the client funds the booking.',
            },
            {
              label: 'Held until delivery',
              amount: advance.balance,
              hint: 'Released after the client confirms the service was delivered.',
            },
          ]}
          footnote={
            daysBefore != null && daysBefore > 0
              ? `Sinnapi releases your advance ${daysBefore} days before the event date. The balance follows once the client confirms delivery. Commission and processing fees are deducted at payout.`
              : 'The balance is released once the client confirms delivery. Commission and processing fees are deducted at payout.'
          }
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          You proposed no advance on this quote. The full amount stays in escrow until the client
          confirms the service was delivered, and is paid out to you then.
        </Typography>
      )}
    </SectionCard>
  );
}
