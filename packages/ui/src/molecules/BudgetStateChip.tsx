'use client';
import { Chip, type ChipProps } from '@mui/material';
import {
  budgetStateColor,
  requirementStateColor,
  requirementStateLabel,
  type BudgetState,
  type RequirementState,
} from './eventBudget';

/**
 * How a budget is doing, as a chip.
 *
 * Its own component rather than `StatusChip`, because the two vocabularies
 * genuinely collide: `StatusChip` reads its colour from `statusColor`, which
 * maps `open` to error for reconciliation exceptions — and an event
 * requirement that is `open` is the ordinary state of every line a client has
 * just written. Sharing the map would paint a brand-new plan red.
 *
 * The percentage is on the chip rather than beside it because "82%" and
 * "Warning" are one fact, and splitting them across two elements is how they
 * end up wrapping apart on a narrow card.
 */
export type BudgetStateChipProps = {
  state: BudgetState;
  /** Shown alongside the label when known. Omitted for an unset budget. */
  usagePercent?: number | null;
  size?: ChipProps['size'];
};

function budgetStateLabel(state: BudgetState): string {
  switch (state) {
    case 'exceeded':
      return 'Over budget';
    case 'warning':
      return 'Near budget';
    case 'healthy':
      return 'On budget';
    default:
      return 'No budget set';
  }
}

export function BudgetStateChip({ state, usagePercent, size = 'small' }: BudgetStateChipProps) {
  const label =
    state === 'unset' || usagePercent == null
      ? budgetStateLabel(state)
      : `${budgetStateLabel(state)} · ${Math.round(usagePercent)}%`;

  const color = budgetStateColor(state);

  return (
    <Chip
      size={size}
      label={label}
      color={color === 'default' ? undefined : color}
      variant={color === 'default' ? 'outlined' : 'filled'}
    />
  );
}

/** The sibling for one budget line: open / sourcing / booked / cancelled. */
export function RequirementStateChip({
  state,
  size = 'small',
}: {
  state: RequirementState;
  size?: ChipProps['size'];
}) {
  const color = requirementStateColor(state);
  return (
    <Chip
      size={size}
      label={requirementStateLabel(state)}
      color={color === 'default' ? undefined : color}
      variant={color === 'default' ? 'outlined' : 'filled'}
    />
  );
}
