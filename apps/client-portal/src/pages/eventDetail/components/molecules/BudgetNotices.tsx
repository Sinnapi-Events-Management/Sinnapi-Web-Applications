import { Alert, Stack, formatAmount } from '@sinnapi/ui';
import type { EventBudgetSummaryModel } from '@/lib/types';

type Props = { budget: EventBudgetSummaryModel };

/**
 * The two things about a budget that need saying in words rather than as a bar.
 *
 * Both are `info`, not `warning`. Neither is the client's mistake and neither
 * blocks anything, and spending warning amber on them would put them at the same
 * volume as being over budget — which is the state that actually needs acting
 * on. Restraint here is what keeps the amber meaningful when it appears.
 *
 * OVER-ALLOCATED is a planning state, not an error: a client sketching lines
 * before trimming them is doing exactly what the lines are for. Nothing refuses
 * it — the guard only ever acts on money that actually moves — so this says what
 * is true and leaves the decision alone.
 *
 * UNCONVERTED is the honest disclosure behind the totals. Amounts in a currency
 * with no exchange rate are left OUT of every figure on this page rather than
 * guessed at, so without this line the client would be reading a total that is
 * quietly missing a commitment. Naming the count is what makes the total
 * trustworthy instead of merely confident.
 */
export default function BudgetNotices({ budget }: Props) {
  const overAllocated = budget.unallocated_amount != null && budget.unallocated_amount < 0;
  const unconverted = budget.unconverted_count > 0;

  if (!overAllocated && !unconverted) return null;

  return (
    <Stack spacing={1.5} sx={{ mt: 2.5 }}>
      {overAllocated && (
        <Alert severity="info">
          Your budget lines add up to{' '}
          {formatAmount(Math.abs(budget.unallocated_amount ?? 0), budget.currency)} more than the
          event budget. That is fine while you are planning — nothing is committed until you accept
          a quote.
        </Alert>
      )}

      {unconverted && (
        <Alert severity="info">
          {budget.unconverted_count === 1
            ? '1 commitment is in a currency we have no exchange rate for, so it is not counted in the figures above.'
            : `${budget.unconverted_count} commitments are in a currency we have no exchange rate for, so they are not counted in the figures above.`}
        </Alert>
      )}
    </Stack>
  );
}
