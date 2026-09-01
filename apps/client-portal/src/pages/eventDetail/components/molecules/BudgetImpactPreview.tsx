import { Alert, Box, Divider, Stack, Typography, formatAmount } from '@sinnapi/ui';
import type { BudgetCheckModel } from '@/lib/types';

type Props = {
  impact: BudgetCheckModel;
  /** Nice-to-have allocations, for the "what could I trim" nudge. */
  trimmableAmount?: number;
  trimmableCount?: number;
  /** The quote's own currency, named when we could not convert it. */
  quoteCurrency?: string | null;
};

/**
 * What accepting this price does to the budget: before, this, after.
 *
 * ARITHMETIC THE CLIENT DOES NOT HAVE TO DO. The whole reason this component
 * exists rather than a sentence saying "you will be over" is that "over" is a
 * verdict and the client needs the numbers behind it — what they had, what this
 * costs, what is left. A verdict alone invites them to trust it or not; the
 * working invites them to decide.
 *
 * THE TONE IS NOT SCOLDING, and that is a deliberate design constraint rather
 * than a preference. Warnings that read as reprimands get dismissed and then
 * ignored, and the client stops reading the component meant to protect them. So
 * the over-budget case states the overage, then offers the one useful thing the
 * platform actually knows: which of their own lines they marked as trimmable.
 * That nudge is the entire reason `requirement_priority` exists.
 */
export default function BudgetImpactPreview({
  impact,
  trimmableAmount = 0,
  trimmableCount = 0,
  quoteCurrency,
}: Props) {
  // No budget to measure against — nothing honest to show.
  if (impact.budget_amount == null) {
    return (
      <Alert severity="info">
        You have not set a budget for this event, so there is nothing to measure this against.
      </Alert>
    );
  }

  const cur = impact.currency;
  const after = impact.projected;
  const leftAfter = impact.budget_amount - after;

  return (
    <Box>
      <Stack
        spacing={0}
        sx={{
          p: { xs: 1.75, sm: 2 },
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Row label="Already spoken for" value={formatAmount(impact.spoken_for, cur)} />
        <Row
          label="This quote"
          value={
            impact.convertible
              ? `+ ${formatAmount(impact.incoming_amount, cur)}`
              : 'Cannot be converted'
          }
        />
        <Divider sx={{ my: 1 }} />
        <Row label="Total after accepting" value={formatAmount(after, cur)} strong />
        <Row
          label={leftAfter < 0 ? 'Over your budget by' : 'Left of your budget'}
          value={formatAmount(Math.abs(leftAfter), cur)}
          strong
          tone={leftAfter < 0 ? 'error.main' : 'text.primary'}
        />
      </Stack>

      {!impact.convertible && (
        <Alert severity="info" sx={{ mt: 2 }}>
          We have no exchange rate from {quoteCurrency ?? 'that currency'} to {cur}, so we cannot
          say what this does to your budget. You can still accept it — it simply will not be counted
          in your totals until a rate is available.
        </Alert>
      )}

      {impact.would_exceed && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Accepting this puts you {formatAmount(impact.over_by, cur)} over budget.
          {trimmableCount > 0 && trimmableAmount > 0 && (
            <>
              {' '}
              You have marked {trimmableCount === 1 ? '1 line' : `${trimmableCount} lines`} as nice
              to have, worth {formatAmount(trimmableAmount, cur)} — trimming{' '}
              {trimmableCount === 1 ? 'it' : 'some of those'} would bring you back under.
            </>
          )}
        </Alert>
      )}

      {/* Over on the LINE but not on the budget. Worth saying and not worth
          warning about: the allocation is the client's own sketch and nothing
          refuses it, so this is information, not an obstacle. */}
      {!impact.would_exceed && impact.would_exceed_allocation && (
        <Alert severity="info" sx={{ mt: 2 }}>
          This is {formatAmount(impact.allocation_over_by, cur)} more than you set aside for this
          part of the event, but still within your overall budget.
        </Alert>
      )}

      {/* Already over before this quote, and this one adds nothing new — the
          second leg of a deal already agreed. The guard lets it through, and
          saying why stops the client wondering whether the warning is missing. */}
      {!impact.would_exceed && !impact.increases_exposure && impact.over_by > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          This price is already counted towards your budget, so accepting it does not change your
          total.
        </Alert>
      )}
    </Box>
  );
}

function Row({
  label,
  value,
  strong,
  tone = 'text.primary',
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: string;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.4 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: strong ? 700 : 500, fontVariantNumeric: 'tabular-nums', color: tone }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
