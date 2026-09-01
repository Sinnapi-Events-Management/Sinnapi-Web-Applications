import {
  BudgetMeter,
  BudgetStateChip,
  Skeleton,
  Stack,
  Typography,
  budgetHeadline,
  formatAmount,
} from '@sinnapi/ui';
import type { MyEventBudgetModel } from '@/lib/types';

type Props = {
  budget: MyEventBudgetModel | undefined;
  loading?: boolean;
};

/**
 * The budget block on an event card: what the client set aside, how much of it
 * is spoken for, and how much is left.
 *
 * THE HEADLINE FIGURE IS WHAT IS LEFT, not what has been spent. A client
 * scanning this grid is deciding whether they can still afford something, and
 * "12,500,000 still available" answers that where "7,500,000 committed" makes
 * them do the subtraction. The spend is on the bar, where it belongs.
 *
 * The compact meter carries no legend — three labelled figures under a card in
 * a three-across grid is more than the card can hold, and every one of them is
 * on the event page one tap away. What survives here is the shape of the bar
 * and one sentence.
 *
 * A missing row renders nothing rather than a zeroed meter. The budgets arrive
 * on a second request, so "not here yet" is a real and common state; drawing an
 * empty bar for it would tell the client they have committed nothing, which is
 * a claim we are not yet in a position to make.
 */
export default function EventBudgetRow({ budget, loading }: Props) {
  if (loading && !budget) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rounded" height={8} sx={{ borderRadius: 4 }} />
        <Skeleton variant="text" width="60%" />
      </Stack>
    );
  }

  if (!budget) return null;

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {budget.budget_amount == null
            ? 'No budget set'
            : formatAmount(budget.budget_amount, budget.currency)}
        </Typography>
        <BudgetStateChip state={budget.state} usagePercent={budget.usage_percent} />
      </Stack>

      <BudgetMeter figures={budget} compact />

      <Typography variant="caption" color="text.secondary">
        {budgetHeadline(budget, formatAmount)}
      </Typography>
    </Stack>
  );
}
