import { Box, Stack, Typography, formatAmount } from '@sinnapi/ui';
import type { EventBudgetSummaryModel } from '@/lib/types';

type Props = { budget: EventBudgetSummaryModel };

type Figure = { label: string; value: string; hint?: string; emphasis?: boolean };

/**
 * The four numbers behind the meter, spelled out.
 *
 * The meter answers "roughly where am I"; this answers "exactly what of". They
 * are separate because they are read at different moments — the bar while
 * scanning, these while deciding — and because a bar with four figures crammed
 * into its legend stops being scannable.
 *
 * `Remaining` is the emphasised one and is allowed to go negative rather than
 * clamping at zero. A client who is 2.5m over needs to see "−2,500,000", not a
 * cheerful zero: the amount they are over by is the number they will act on.
 *
 * Tabular numerals throughout, so the column of figures lines up on the decimal
 * and can be compared by eye down the page rather than read one at a time.
 */
export default function BudgetFigureGrid({ budget }: Props) {
  const cur = budget.currency;

  const figures: Figure[] = [
    { label: 'Budget', value: formatAmount(budget.budget_amount, cur) },
    {
      label: 'Committed',
      value: formatAmount(budget.committed_amount, cur),
      hint: `${budget.committed_count} booking${budget.committed_count === 1 ? '' : 's'}`,
    },
    {
      label: 'Pending',
      value: formatAmount(budget.pending_amount, cur),
      hint: `${budget.pending_count} awaiting`,
    },
    {
      label: budget.state === 'exceeded' ? 'Over by' : 'Remaining',
      value: formatAmount(
        budget.state === 'exceeded'
          ? Math.abs(budget.remaining_amount ?? 0)
          : budget.remaining_amount,
        cur,
      ),
      emphasis: true,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        // Two up on a phone, four across from `sm`. Four 1fr columns on a
        // narrow screen would wrap each amount mid-number.
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        gap: { xs: 2, sm: 2.5 },
      }}
    >
      {figures.map((f) => (
        <Stack key={f.label} spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {f.label}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              // Only the overage is coloured. Emphasis on the others is
              // carried by weight, so red means one thing on this card.
              color: f.emphasis && budget.state === 'exceeded' ? 'error.main' : 'text.primary',
            }}
          >
            {f.value}
          </Typography>
          {f.hint && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {f.hint}
            </Typography>
          )}
        </Stack>
      ))}
    </Box>
  );
}
