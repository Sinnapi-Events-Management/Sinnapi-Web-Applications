import { Alert, Skeleton, Stack, Typography } from '@sinnapi/ui';
import { formatDate } from '@/lib/config';
import type { SubscriptionQuoteModel } from '@/lib/types';
import { describeChange } from '../../schema';

type Props = {
  quote: SubscriptionQuoteModel | null;
  isLoading: boolean;
};

/**
 * What this payment buys and what happens to the current period.
 *
 * The figures come from `subscription_price_plan`, the same function the
 * charge is priced with, so nothing here is an estimate. The forfeit warning
 * sits with the dates rather than with the price because it is a consequence
 * of *when* the vendor pays, not of how much.
 */
export default function SubscriptionPeriodDetails({ quote, isLoading }: Props) {
  if (isLoading || !quote) {
    return (
      <Stack spacing={1}>
        <Skeleton height={24} />
        <Skeleton height={24} width="70%" />
      </Stack>
    );
  }

  const forfeits =
    (quote.change_kind === 'upgrade' || quote.change_kind === 'downgrade') && quote.unused_days > 0;

  return (
    <Stack spacing={1.5}>
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
