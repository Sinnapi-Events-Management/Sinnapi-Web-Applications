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
 * The payment schedule the vendor is proposing along with the price.
 *
 * These terms are agreed at the quote, not at checkout, so they bind the deal
 * whether or not it is ultimately settled through escrow — which is exactly why
 * they belong on this page rather than being first seen at the payment step.
 * Accepting the quote copies them, and the price they apply to, onto the
 * booking.
 *
 * Rendered under the total as a split rather than as more lines, because
 * nothing here is another charge: `afterTotal` exists so an advance can never
 * read as an addition to the price.
 *
 * The card decides its own absence. A quote with no terms on it has nothing to
 * say here, and gating it from the page above would put a rule about advance
 * terms in a file about layout — which is where the same condition used to
 * live, spelled slightly differently in two portals.
 */
export default function QuotationAdvanceTermsCard({ pricing, advance, daysBefore }: Props) {
  if (!advance.hasTerms) return null;

  return (
    <SectionCard
      title="Payment terms"
      icon={<HandshakeIcon />}
      accent="info"
      subtitle="Proposed by the vendor with this quote"
    >
      {advance.hasAdvance ? (
        <MoneyBreakdown
          currency={pricing.currency}
          dense
          lines={[{ label: 'Quoted total', amount: pricing.total, muted: true }]}
          afterTotal={[
            {
              label: `Advance (${formatRate(advance.rate)})`,
              amount: advance.advance,
              hint:
                daysBefore != null && daysBefore > 0
                  ? `Released to the vendor ${daysBefore} days before your event.`
                  : 'Released to the vendor once the booking is funded.',
            },
            {
              label: 'Balance held',
              amount: advance.balance,
              hint: 'Stays protected until you confirm the service was delivered.',
            },
          ]}
          footnote={
            daysBefore != null && daysBefore > 0
              ? `The advance leaves escrow ${daysBefore} days before your event date. Everything else is released only after you confirm delivery.`
              : 'The balance is released only after you confirm the service was delivered.'
          }
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          No advance is proposed. The full amount stays protected by Sinnapi until you confirm the
          service was delivered.
        </Typography>
      )}
    </SectionCard>
  );
}
