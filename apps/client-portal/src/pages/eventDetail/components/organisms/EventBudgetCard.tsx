import {
  Alert,
  BudgetMeter,
  BudgetStateChip,
  Skeleton,
  Stack,
  Typography,
  SectionCard,
  budgetHeadline,
  formatAmount,
} from '@sinnapi/ui';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import type { EventBudgetSummaryModel } from '@/lib/types';
import BudgetFigureGrid from '../molecules/BudgetFigureGrid';
import BudgetNotices from '../molecules/BudgetNotices';

type Props = {
  budget: EventBudgetSummaryModel | null;
  loading?: boolean;
  error?: unknown;
};

/**
 * The budget, as the subject of the page rather than a footnote on a card.
 *
 * Reads top-down in the order a client asks the questions: how am I doing
 * (chip + sentence), what does that look like (meter), and exactly what of
 * (figures). The notices come last because they qualify the figures above them
 * and would be read as headlines if they came first.
 *
 * The accent follows the state, so a card that is over budget is red from its
 * top rule down and does not need a second alert to say so. `secondary` — the
 * portals' gold — is the healthy default rather than green: a budget with room
 * in it is unremarkable, and green here would compete with the genuinely good
 * news elsewhere on the page.
 */
export default function EventBudgetCard({ budget, loading, error }: Props) {
  const accent =
    budget?.state === 'exceeded' ? 'error' : budget?.state === 'warning' ? 'warning' : 'secondary';

  return (
    <SectionCard
      title="Budget"
      icon={<SavingsOutlinedIcon />}
      accent={accent}
      action={
        budget && <BudgetStateChip state={budget.state} usagePercent={budget.usage_percent} />
      }
    >
      {error ? (
        <Alert severity="error">
          We could not work out this event&apos;s budget just now. Everything else on this page is
          up to date.
        </Alert>
      ) : loading || !budget ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={12} sx={{ borderRadius: 6 }} />
          <Skeleton variant="text" width="45%" />
          <Skeleton variant="rounded" height={56} />
        </Stack>
      ) : budget.budget_amount == null ? (
        // Not an error and not an empty state: an event with no budget is a
        // perfectly good event. It is an invitation, and it names the one thing
        // setting a budget buys the client.
        <Alert severity="info">
          You have not set a budget for this event yet. Add one and we will keep a running total as
          you accept quotes, and warn you before you go over.
        </Alert>
      ) : (
        <>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            {formatAmount(budget.spoken_for, budget.currency)}{' '}
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
              of {formatAmount(budget.budget_amount, budget.currency)} spoken for
            </Typography>
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {budgetHeadline(budget, formatAmount)}
          </Typography>

          <BudgetMeter figures={budget} />

          <Stack sx={{ mt: 3 }}>
            <BudgetFigureGrid budget={budget} />
          </Stack>

          <BudgetNotices budget={budget} />
        </>
      )}
    </SectionCard>
  );
}
