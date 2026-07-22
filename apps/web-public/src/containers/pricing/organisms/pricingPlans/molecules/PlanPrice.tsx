import { Stack, Typography } from '@sinnapi/ui/atoms';
import type { BillingCycle } from '@/lib/types';
import { formatPrice } from '../../../utils/formatPrice';

/**
 * The headline figure on a plan card, always expressed per month with the
 * billing basis spelled out underneath — comparing tiers is the job of this
 * page, and a yearly total sitting beside monthly ones makes that arithmetic
 * the visitor's problem.
 *
 * A tier the admin hasn't priced on the selected cycle says so plainly instead
 * of rendering a blank or falling back to the other cycle's number, which would
 * quote a price we don't actually offer on those terms.
 */
export default function PlanPrice({
  amount,
  currency,
  cycle,
}: {
  amount: number | null;
  currency: string;
  cycle: BillingCycle;
}) {
  if (amount == null) {
    return (
      <Stack sx={{ mt: 2.5, minHeight: 68, justifyContent: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Talk to us
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Not sold on {cycle === 'annual' ? 'yearly' : 'monthly'} billing
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack sx={{ mt: 2.5, minHeight: 68 }}>
      <Stack direction="row" alignItems="baseline" spacing={0.75}>
        <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {formatPrice(amount, currency)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          /mo
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {cycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
      </Typography>
    </Stack>
  );
}
