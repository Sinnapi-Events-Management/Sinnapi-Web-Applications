import { MoneyBreakdown, Stack, Typography } from '@sinnapi/ui';
import type { EscrowQuoteModel } from '@/lib/types';
import { escrowReleaseLines } from '../../schema/escrowCheckout';
import { breakdownMoney } from '../../utils/breakdownMoney';

type Props = {
  quote: EscrowQuoteModel;
  currency: string;
};

/**
 * The advance/balance split, under the total and titled as a release schedule
 * so it cannot be mistaken for more to pay.
 */
export default function EscrowReleaseSplit({ quote, currency }: Props) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        How Sinnapi releases it to your vendor
      </Typography>
      <MoneyBreakdown
        dense
        wrapLabels
        currency={currency}
        format={breakdownMoney}
        lines={escrowReleaseLines(quote)}
      />
    </Stack>
  );
}
