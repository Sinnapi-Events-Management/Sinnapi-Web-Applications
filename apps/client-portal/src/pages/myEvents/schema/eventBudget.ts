import { z } from 'zod';
import type { SelectOption } from '@sinnapi/ui/forms';
import { optionalAmountField } from '@/lib/schema';

/**
 * What a client says they expect to spend on an event.
 *
 * Lives apart from `eventForm` because two surfaces write these same three
 * columns — the create drawer, where the budget is one field among many, and
 * the payment-terms dialog, where it is the figure the whole comparison is
 * priced against. One definition means the two can never disagree about what a
 * valid budget is, and the database only ever has one shape to reject.
 *
 * Amounts are strings, like every other form value in this app: that is what a
 * text input yields, and it keeps the resolver's input and output types the
 * same. `toBudgetColumns` puts them back to numbers on the way out.
 */

// The `currencies` seed has UGX and USD active; the admin event form offers the
// same pair. A client picking a third would fail the FK, not a validator.
const CURRENCIES = ['UGX', 'USD'] as const;

export type EventCurrency = (typeof CURRENCIES)[number];

export const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({ value: c, label: c }));

/** The currency a budget defaults to when the event has never carried one. */
export const DEFAULT_CURRENCY: EventCurrency = 'UGX';

/**
 * An optional budget figure.
 *
 * Builds on the shared amount primitive rather than restating it, then adds the
 * two rules that are specific to a budget: it must be worth something, and it
 * must fit `numeric(14,2)`. A budget of zero passes every generic amount check
 * and is still not a budget — it prices the terms comparison at nothing and
 * leaves the client wondering why the cards are empty.
 */
const budgetAmountField = (label: string) =>
  optionalAmountField(label)
    .refine((v) => v === '' || Number(v) > 0, `${label} must be more than zero.`)
    .refine(
      (v) => v === '' || /^\d{1,12}(\.\d{1,2})?$/.test(v.trim()),
      `${label} can have at most two decimal places.`,
    );

/**
 * The budget fields, as a spreadable shape.
 *
 * Exported open rather than closed so `eventFormSchema` can merge them into its
 * own object — a nested `budget: {...}` would mean the create form's fields no
 * longer match the column names they are written to.
 */
export const eventBudgetShape = {
  /** The lower end of a range. Blank whenever the client gave a single figure. */
  budget_min: budgetAmountField('The lower figure'),
  /** The figure the payment-terms comparison is priced against. */
  budget_max: budgetAmountField('Your budget'),
  currency: z.enum(CURRENCIES),
};

/**
 * Mirrors the `budget_max >= budget_min` check on `events` so the error lands
 * on the field the client can fix instead of arriving as a constraint
 * violation. Deliberately no stricter than the database: a floor with no
 * ceiling is a real answer ("from 5m, upwards"), and the preview knows to fall
 * back to it.
 */
const checkBudgetRange = (v: { budget_min: string; budget_max: string }, ctx: z.RefinementCtx) => {
  if (v.budget_min === '' || v.budget_max === '') return;
  if (Number(v.budget_max) < Number(v.budget_min)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['budget_max'],
      message: 'The upper figure must be at least the lower one.',
    });
  }
};

/** The budget on its own — what the payment-terms dialog edits. */
export const eventBudgetSchema = z.object(eventBudgetShape).superRefine(checkBudgetRange);

export type EventBudgetValues = z.infer<typeof eventBudgetSchema>;

/** Re-exported so `eventFormSchema` applies the identical range rule. */
export { checkBudgetRange };

export const BLANK_BUDGET: EventBudgetValues = {
  budget_min: '',
  budget_max: '',
  currency: DEFAULT_CURRENCY,
};

const asCurrency = (value: string | null | undefined): EventCurrency =>
  CURRENCIES.includes(value as EventCurrency) ? (value as EventCurrency) : DEFAULT_CURRENCY;

/** Projects a stored event onto the form's all-strings budget shape. */
export function budgetValuesFromEvent(event: {
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
}): EventBudgetValues {
  return {
    budget_min: event.budget_min != null ? String(event.budget_min) : '',
    budget_max: event.budget_max != null ? String(event.budget_max) : '',
    currency: asCurrency(event.currency),
  };
}

/**
 * The `events` columns for a budget. Blanks become null rather than zero, so
 * "I haven't said" and "I expect to spend nothing" stay different answers —
 * the first leaves the terms comparison unpriced, the second would price it at
 * nothing.
 */
export function toBudgetColumns(values: EventBudgetValues) {
  const amount = (s: string) => (s.trim() === '' ? null : Number(s));
  return {
    budget_min: amount(values.budget_min),
    budget_max: amount(values.budget_max),
    currency: values.currency,
  };
}

/**
 * The single figure a payment-terms preview is priced against.
 *
 * The ceiling, falling back to the floor: a client who said "up to 20m" is
 * asking what 20m costs them, and one who only gave a floor has given us the
 * one number they stated. Null when neither was given — an illustration built
 * on a figure the client never supplied is a number we invented.
 */
export function budgetPreviewAmount(values: {
  budget_min: string;
  budget_max: string;
}): number | null {
  const max = values.budget_max.trim();
  const min = values.budget_min.trim();
  const chosen = max !== '' ? max : min;
  if (chosen === '') return null;
  const n = Number(chosen);
  return Number.isFinite(n) && n > 0 ? n : null;
}
