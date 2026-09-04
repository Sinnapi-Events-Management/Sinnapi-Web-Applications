import { Alert, MoneyBreakdown, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { SubscriptionQuoteModel } from '@/lib/types';
import { describeChange } from '../../schema';

type Props = {
  quote: SubscriptionQuoteModel | null;
  isLoading: boolean;
};

/**
 * The priced preview: plan, cycle, amount, the period it buys, and what
 * happens to the current one.
 *
 * The figures come from `subscription_price_plan`, the same function the
 * charge is priced with, so nothing here is an estimate. The processing fee
 * is shown as a line at zero on purpose: the client-side escrow checkout
 * charges it on, and a vendor who has seen that page should be told plainly
 * that this one does not.
 */
export default function SubscriptionQuotePreview({ quote, isLoading }: Props) {
  if (isLoading || !quote) {
    return (
      <Stack spacing={1}>
        <Skeleton height={22} />
        <Skeleton height={22} />
        <Skeleton height={32} />
      </Stack>
    );
  }

  const cycle = quote.billing_cycle === 'annual' ? 'year' : 'month';
  const forfeits =
    (quote.change_kind === 'upgrade' || quote.change_kind === 'downgrade') && quote.unused_days > 0;

  return (
    <Stack spacing={2}>
      <MoneyBreakdown
        currency={quote.currency}
        lines={[
          { label: `${quote.plan_name} plan · 1 ${cycle}`, amount: quote.amount },
          {
            label: 'Processing fee',
            amount: quote.psp_fee_amount,
            hint: 'Sinnapi absorbs the payment provider’s fee on subscriptions. You pay the plan price shown on the pricing page, on any payment method.',
            additive: true,
          },
        ]}
        total={{ label: 'You pay', amount: quote.amount + quote.psp_fee_amount }}
        afterTotal={[
          {
            label: 'Period starts',
            amount: null,
            muted: true,
            hint: formatDate(quote.period_start),
          },
          { label: 'Period ends', amount: null, muted: true, hint: formatDate(quote.period_end) },
        ]}
      />

      <Typography variant="body2">
        <b>
          From {formatDate(quote.period_start)} to {formatDate(quote.period_end)}.
        </b>{' '}
        {describeChange(quote, formatDate)}
      </Typography>

      {forfeits && (
        <Alert severity="warning" variant="outlined">
          Switching plans mid-period forfeits the {quote.unused_days} day
          {quote.unused_days === 1 ? '' : 's'} left on your {quote.current_plan_name ?? 'current'}{' '}
          plan. To keep them, wait until{' '}
          {quote.current_period_end ? formatDate(quote.current_period_end) : 'the period ends'} and
          pay for the new plan then.
        </Alert>
      )}

      <Typography variant="caption" color="text.secondary">
        There is no automatic charge. We will remind you before this period ends so you can renew in
        time.
      </Typography>
    </Stack>
  );
}
