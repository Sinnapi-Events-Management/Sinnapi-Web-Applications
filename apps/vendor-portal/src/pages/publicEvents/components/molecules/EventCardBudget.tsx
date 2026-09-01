import { Box, Typography } from '@sinnapi/ui';

type EventCardBudgetProps = {
  /** Formatted budget, or null when the brief doesn't quote one. */
  budget: string | null;
};

/**
 * What the brief is worth — the value anchor a vendor decides on.
 *
 * It occupies the slot the client portal's card gives its budget meter, and for
 * the same reason: the budget is why the card is more than a label. What a
 * vendor may read is only the range the client published, never the meter —
 * `event_budget_summary` refuses any caller who is not the poster, because how
 * much of a budget is still unspent is the client's negotiating position.
 *
 * "Not stated" rather than an omitted row: on a card that a vendor is pricing
 * against, "they didn't say" is itself information, and a row that sometimes
 * vanishes takes the grid's shared baseline with it.
 */
export default function EventCardBudget({ budget }: EventCardBudgetProps) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        Budget
      </Typography>
      <Typography variant="subtitle2" fontWeight={700} noWrap>
        {budget ?? 'Not stated'}
      </Typography>
    </Box>
  );
}
