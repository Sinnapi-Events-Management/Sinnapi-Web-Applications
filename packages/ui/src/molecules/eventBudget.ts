/**
 * What an event budget means, as vocabulary — shared by every portal.
 *
 * Pure data (no React/MUI), for the same reason `statusColor` and `money` are:
 * the client's meter, the over-budget dialog that refuses their booking, and
 * the admin's view of the same event must all agree on when 82% is fine and
 * when it is a warning. The threshold and the four states are decided by the
 * database (`event_budget_summary.state`, `event_budget_warn_threshold`); this
 * file is how the UI *says* them.
 *
 * DELIBERATELY NOT `statusColor`. That map already binds `open` to `error` for
 * reconciliation exceptions, and an event requirement that is `open` is the
 * ordinary, healthy starting state of every line a client writes. Routing
 * budget states through it would paint a brand-new plan red.
 */

/** Mirrors `event_budget_summary.state`. */
export type BudgetState = 'unset' | 'healthy' | 'warning' | 'exceeded';

/** Mirrors the derived state of `event_requirement_summary`. */
export type RequirementState = 'open' | 'sourcing' | 'booked' | 'cancelled';

export type BudgetChipColor = 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';

/**
 * Colour is spent on meaning only.
 *
 * `healthy` is deliberately NOT green. A budget with room left is the
 * unremarkable case, and painting it green makes the ordinary state shout as
 * loudly as the two that need acting on — which is how a client stops reading
 * the meter at all. Green is reserved for `booked`, where something was
 * actually achieved.
 */
export function budgetStateColor(state: BudgetState): BudgetChipColor {
  switch (state) {
    case 'exceeded':
      return 'error';
    case 'warning':
      return 'warning';
    case 'healthy':
      return 'secondary';
    default:
      return 'default';
  }
}

export function requirementStateColor(state: RequirementState): BudgetChipColor {
  switch (state) {
    case 'booked':
      return 'success';
    case 'sourcing':
      return 'info';
    case 'cancelled':
      return 'default';
    default:
      // `open` — a line the client has written and not yet filled. Neutral:
      // it is the starting state, not a problem.
      return 'default';
  }
}

export function requirementStateLabel(state: RequirementState): string {
  switch (state) {
    case 'booked':
      return 'Booked';
    case 'sourcing':
      return 'Sourcing';
    case 'cancelled':
      return 'Not needed';
    default:
      return 'No vendor yet';
  }
}

/** The shape every budget surface reads. Matches the RPC row, loosely typed. */
export type BudgetFigures = {
  currency: string;
  /** Null when the client has never stated a budget. */
  budget_amount: number | null;
  committed_amount: number;
  pending_amount: number;
  spoken_for: number;
  remaining_amount: number | null;
  usage_percent: number | null;
  state: BudgetState;
  warn_threshold?: number | null;
  unconverted_count?: number | null;
};

/**
 * The geometry of the meter.
 *
 * The track is the budget — until the client goes past it, at which point the
 * track becomes what they have actually spoken for and a marker shows where
 * the budget was. That switch is the whole reason this is not a percentage bar
 * clamped at 100: a bar pinned to full tells a client they are over and
 * refuses to say by how much, and "112%" in a label beside a full bar is a
 * number the eye has to do arithmetic on.
 *
 * Both bands are measured against the same scale, so their widths stay
 * comparable across the switch.
 */
export type BudgetBandGeometry = {
  committedPercent: number;
  pendingPercent: number;
  /** Where the budget sits on an overflowing track, or null when it fits. */
  budgetMarkerPercent: number | null;
  isOver: boolean;
};

export function budgetBandGeometry(figures: {
  budget_amount: number | null;
  committed_amount: number;
  pending_amount: number;
}): BudgetBandGeometry {
  const committed = Math.max(figures.committed_amount ?? 0, 0);
  const pending = Math.max(figures.pending_amount ?? 0, 0);
  const spoken = committed + pending;
  const budget = figures.budget_amount ?? 0;

  // No budget and nothing spent: an empty track, not a division by zero.
  const scale = Math.max(budget, spoken);
  if (scale <= 0) {
    return { committedPercent: 0, pendingPercent: 0, budgetMarkerPercent: null, isOver: false };
  }

  const isOver = budget > 0 && spoken > budget;
  return {
    committedPercent: (committed / scale) * 100,
    pendingPercent: (pending / scale) * 100,
    budgetMarkerPercent: isOver ? (budget / scale) * 100 : null,
    isOver,
  };
}

/**
 * The sentence under the meter.
 *
 * Written to be supportive rather than scolding, which is the one thing the
 * research on budgeting interfaces is unanimous about: a paternalistic alert
 * gets dismissed and then ignored, and the client stops reading the component
 * that was supposed to protect them. So the over-budget line states the figure
 * and stops — it does not tell the client they have done something wrong, and
 * it never says "you cannot". They can; the dialog asks them to confirm it.
 *
 * The caller supplies `formatAmount` rather than this importing it, so the
 * copy stays free of the currency table and can be unit-tested on plain
 * numbers.
 */
export function budgetHeadline(
  figures: BudgetFigures,
  format: (amount: number | null, currency: string) => string,
): string {
  const { currency, state, remaining_amount: remaining } = figures;

  if (state === 'unset') return 'No budget set yet — add one to track what you commit.';

  if (state === 'exceeded') {
    const over = Math.abs(remaining ?? 0);
    return `${format(over, currency)} over your budget.`;
  }

  const left = format(remaining, currency);
  if (state === 'warning') return `${left} left — you are close to your budget.`;
  return `${left} still available.`;
}

/**
 * What the two bands are called, wherever they are labelled.
 *
 * Named here because the distinction is the subtle part of the whole feature
 * and it has to read identically on the card, the meter legend and the
 * over-budget dialog. "Committed" is a vendor who has taken the job;
 * "pending" is money the client has agreed to that has not landed as a booking
 * yet — an accepted quote, or a request the vendor has not answered.
 */
export const BUDGET_BAND_LABELS = {
  committed: 'Committed',
  pending: 'Pending',
  remaining: 'Remaining',
} as const;
