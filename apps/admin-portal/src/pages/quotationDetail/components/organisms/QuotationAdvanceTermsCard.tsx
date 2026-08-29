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
  note: string | null;
};

/**
 * The payment terms this quote carries, told from neither side.
 *
 * The client's card frames the split as money going out and the vendor's as
 * money coming in; the console's names both halves for what they are, because
 * an operator is asked about this schedule by whichever party is unhappy with
 * it and should not be reading one of their two framings back at them.
 *
 * Worth showing on a quote that never became a booking: these terms are the
 * origin of a release schedule, and "why did the advance go out when it did"
 * is answered here, one step before the booking that acted on it.
 *
 * Rendered under the total as a split rather than as more lines: `afterTotal`
 * exists so that nothing below a total can read as another charge on top of it.
 */
export default function QuotationAdvanceTermsCard({ pricing, advance, daysBefore, note }: Props) {
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
              label: `Vendor advance (${formatRate(advance.rate)})`,
              amount: advance.advance,
              hint:
                daysBefore != null && daysBefore > 0
                  ? `Released to the vendor ${daysBefore} days before the event, once the booking is funded.`
                  : 'Released to the vendor as soon as the client funds the booking.',
            },
            {
              label: 'Held until delivery',
              amount: advance.balance,
              hint: 'Released after the client confirms the service was delivered.',
            },
          ]}
          footnote={note ?? undefined}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          The vendor proposed no advance on this quote. The full amount would stay in escrow until
          the client confirmed delivery, and be paid out then.
        </Typography>
      )}
    </SectionCard>
  );
}
