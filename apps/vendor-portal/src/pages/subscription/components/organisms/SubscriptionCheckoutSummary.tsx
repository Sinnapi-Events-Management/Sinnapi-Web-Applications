import { MoneyBreakdown, Stack, Typography } from '@sinnapi/ui';
import {
  CheckoutSummaryPanel,
  SecureCheckoutNote,
  type CheckoutRailOption,
} from '@sinnapi/ui/payments';
import { formatDate } from '@/lib/config';
import type { SubscriptionQuoteModel } from '@/lib/types';
import { breakdownMoney } from '../../utils/breakdownMoney';

type Props = {
  quote: SubscriptionQuoteModel | null;
  rail: CheckoutRailOption;
  formattedTotal: string | null;
  isLoading: boolean;
};

/**
 * The subscription checkout's summary: plan price, the processing fee, the
 * total, the period it buys, and where the vendor finishes.
 *
 * The processing fee is shown as a line at zero on purpose: the client-side
 * escrow checkout charges it on, and a vendor who has seen that page should be
 * told plainly that this one does not.
 */
export default function SubscriptionCheckoutSummary({
  quote,
  rail,
  formattedTotal,
  isLoading,
}: Props) {
  const cycle = quote?.billing_cycle === 'annual' ? 'year' : 'month';

  return (
    <CheckoutSummaryPanel
      totalLabel="You pay"
      totalAmount={formattedTotal}
      isLoading={isLoading || !quote}
      split={
        quote && (
          <Stack spacing={0.5}>
            <PeriodRow label="Period starts" value={formatDate(quote.period_start)} />
            <PeriodRow label="Period ends" value={formatDate(quote.period_end)} />
          </Stack>
        )
      }
      footer={<SecureCheckoutNote rail={rail} />}
    >
      {quote && (
        <MoneyBreakdown
          wrapLabels
          currency={quote.currency}
          format={breakdownMoney}
          lines={[
            { label: `${quote.plan_name} plan · 1 ${cycle}`, amount: quote.amount },
            {
              label: 'Processing fee',
              amount: quote.psp_fee_amount,
              hint: 'Sinnapi absorbs the payment provider’s fee on subscriptions. You pay the plan price shown on the pricing page, on any payment method.',
              additive: true,
            },
          ]}
        />
      )}
    </CheckoutSummaryPanel>
  );
}

/** A dated fact under the total — never a charge, so never a money row. */
function PeriodRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
