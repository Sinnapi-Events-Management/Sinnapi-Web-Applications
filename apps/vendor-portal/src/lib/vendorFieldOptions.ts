import { PRICING_MODELS, pricingModelLabel } from '@sinnapi/ui';
import type { SelectOption } from '@sinnapi/ui/forms';

/**
 * The option lists for the `vendors` enum-ish columns.
 *
 * Shared by the onboarding wizard and the profile page, which collect the same
 * columns at different moments. Two copies is how "1–3 years" on one screen
 * becomes "1-3 years" on the other, and how an option quietly goes missing from
 * whichever list nobody updated.
 */

/** Empty means "not answered" for every optional select below. */
export const NOT_SET = '';

export const YEARS_OPTIONS: SelectOption[] = [
  { value: NOT_SET, label: 'Prefer not to say' },
  { value: 'lt_1y', label: 'Less than 1 year' },
  { value: '1_3y', label: '1–3 years' },
  { value: '3_5y', label: '3–5 years' },
  { value: '5_10y', label: '5–10 years' },
  { value: '10y_plus', label: '10+ years' },
];

export const LEAD_TIME_OPTIONS: SelectOption[] = [
  { value: NOT_SET, label: 'No preference' },
  { value: 'same_week', label: 'Same week' },
  { value: '1_2_weeks', label: '1–2 weeks' },
  { value: '2_4_weeks', label: '2–4 weeks' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_plus_months', label: '3+ months' },
];

/**
 * Built from the shared vocabulary rather than relabelled here: the pricing
 * enum's wording lives once in `@sinnapi/ui`, and a second set of labels is how
 * "Fixed packages" quietly becomes "Fixed price" on one screen out of four.
 */
export const PRICING_OPTIONS: SelectOption[] = [
  { value: NOT_SET, label: 'No preference' },
  ...PRICING_MODELS.map((model) => ({ value: model, label: pricingModelLabel(model) ?? model })),
];

/** Tri-state, because "we never asked" and "they said no" are different answers. */
export const ALUMNI_OPTIONS: SelectOption[] = [
  { value: NOT_SET, label: 'Prefer not to say' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: 'UGX', label: 'UGX' },
  { value: 'USD', label: 'USD' },
];

/** Blank string → null, so an emptied optional field clears its column. */
export const nullIfEmpty = (value: string) => (value.trim() === '' ? null : value.trim());
