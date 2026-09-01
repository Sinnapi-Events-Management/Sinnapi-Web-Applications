import { Box, Stack, Typography, formatAmount } from '@sinnapi/ui';
import type { EventBudgetSummaryModel } from '@/lib/types';

type Props = {
  budget: EventBudgetSummaryModel | null;
  unallocatedCount: number;
};

/**
 * How the event budget divides across the lines below.
 *
 * A different question from the budget card upstairs, and the reason both
 * exist. That one asks "how much have I COMMITTED"; this asks "how much have I
 * PLANNED FOR". A client can easily have allocated every shilling and committed
 * none of it, and a page that only showed the first would tell them they were
 * fine right up until they started accepting quotes.
 *
 * Over-allocation is stated plainly and not treated as an error. Nothing
 * refuses it — the guard only ever acts on money that moves — and a client
 * sketching more than they have before trimming it is doing what the lines are
 * for. The number is what they need; a warning icon would be a scolding.
 */
export default function AllocationSummary({ budget, unallocatedCount }: Props) {
  if (!budget || budget.budget_amount == null) return null;

  const unallocated = budget.unallocated_amount ?? 0;
  const isOver = unallocated < 0;

  return (
    <Box
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1, sm: 3 }}
        justifyContent="space-between"
      >
        <Figure label="Event budget" value={formatAmount(budget.budget_amount, budget.currency)} />
        <Figure
          label="Set aside across lines"
          value={formatAmount(budget.allocated_amount, budget.currency)}
        />
        <Figure
          label={isOver ? 'Over-allocated by' : 'Not yet allocated'}
          value={formatAmount(Math.abs(unallocated), budget.currency)}
          tone={isOver ? 'error.main' : 'text.primary'}
        />
      </Stack>

      {unallocatedCount > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          {unallocatedCount === 1
            ? '1 line has no amount set aside yet, so it is not counted above.'
            : `${unallocatedCount} lines have no amount set aside yet, so they are not counted above.`}
        </Typography>
      )}
    </Box>
  );
}

function Figure({
  label,
  value,
  tone = 'text.primary',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: tone }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
