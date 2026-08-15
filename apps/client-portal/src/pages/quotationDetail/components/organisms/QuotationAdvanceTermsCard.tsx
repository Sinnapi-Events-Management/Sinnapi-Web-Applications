import { MoneyBreakdown, SectionCard, Typography, formatRate } from '@sinnapi/ui';
import HandshakeIcon from '@mui/icons-material/Handshake';
import type { QuotationDetailModel } from '@/lib/types';

type Props = { quotation: QuotationDetailModel };

/**
 * The payment schedule the vendor is proposing along with the price.
 *
 * These terms are agreed at the quote, not at checkout, so they bind the deal
 * whether or not it is ultimately settled through escrow — which is exactly why
 * they belong on this page rather than being first seen at the payment step.
 * Accepting the quote copies them onto the booking.
 *
 * Rendered under the total as a split rather than as more lines, because
 * nothing here is another charge: `afterTotal` exists so an advance can never
 * read as an addition to the price.
 */
export default function QuotationAdvanceTermsCard({ quotation: q }: Props) {
  const rate = Number(q.advance_rate ?? 0);
  const total = Number(q.total ?? 0);
  const advance = (total * rate) / 100;
  const days = q.advance_release_days_before;

  return (
    <SectionCard
      title="Payment terms"
      icon={<HandshakeIcon />}
      accent="info"
      subtitle="Proposed by the vendor with this quote"
    >
      {rate > 0 ? (
        <MoneyBreakdown
          currency={q.currency ?? 'UGX'}
          dense
          lines={[{ label: 'Quoted total', amount: total, muted: true }]}
          afterTotal={[
            {
              label: `Advance (${formatRate(rate)})`,
              amount: advance,
              hint:
                days != null && days > 0
                  ? `Released to the vendor ${days} days before your event.`
                  : 'Released to the vendor once the booking is funded.',
            },
            {
              label: 'Balance held',
              amount: total - advance,
              hint: 'Stays protected until you confirm the service was delivered.',
            },
          ]}
          footnote={
            days != null && days > 0
              ? `The advance leaves escrow ${days} days before your event date. Everything else is released only after you confirm delivery.`
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
