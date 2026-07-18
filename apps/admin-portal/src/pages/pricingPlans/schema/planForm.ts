import { z } from 'zod';
import type { PlanModel } from '@/lib/types';

// Option values mirror the Postgres enums/columns in
// 20260618000005_subscriptions_and_events.sql and the 0718 flexible-plans
// migration.
const BILLING_CYCLES = ['monthly', 'annual'] as const;
/** Mirrors the `currencies` seed — UGX and USD are the only active codes. */
const CURRENCIES = ['UGX', 'USD'] as const;

export type SelectOption = { value: string; label: string };

export const BILLING_CYCLE_OPTIONS: SelectOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({ value: c, label: c }));

// Matches the DB check on `pricing_plans.key`: lowercase, digits, single
// separators — the same slug shape vendors use.
const SLUG_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;
const INT_RE = /^\d{1,6}$/;

/**
 * Validates the editable subset of a pricing plan. Numeric columns are held as
 * strings so the form stays uncontrolled-friendly and the resolver's input and
 * output types match; they are coerced back to numbers by `toWritePayload`.
 *
 * `features` is an array of `{ value }` objects rather than bare strings so
 * react-hook-form's `useFieldArray` can track each row by a stable field id.
 */
export const planFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2, 'Key is required.')
    .max(60, 'Key must be 60 characters or fewer.')
    .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens — e.g. pro-annual.'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(120, 'Name must be 120 characters or fewer.'),
  tagline: z.string().trim().max(200, 'Tagline must be 200 characters or fewer.'),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.'),
  price: z.string().regex(AMOUNT_RE, 'Enter an amount like 99000 or 99000.50.'),
  currency: z.enum(CURRENCIES),
  billing_cycle: z.enum(BILLING_CYCLES),
  trial_days: z.string().regex(INT_RE, 'Enter a whole number of days, e.g. 30.'),
  sort_order: z.string().regex(INT_RE, 'Enter a whole number, e.g. 1.'),
  is_active: z.boolean(),
  highlight: z.boolean(),
  features: z.array(
    z.object({
      value: z
        .string()
        .trim()
        .min(1, 'Feature can’t be empty.')
        .max(160, 'Feature must be 160 characters or fewer.'),
    }),
  ),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

/** Blank form for creating a plan, pre-filled with the schema defaults. */
export const emptyPlanValues: PlanFormValues = {
  key: '',
  name: '',
  tagline: '',
  description: '',
  price: '',
  currency: 'UGX',
  billing_cycle: 'monthly',
  trial_days: '30',
  sort_order: '0',
  is_active: true,
  highlight: false,
  features: [],
};

function asOption<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Projects a fetched plan onto the form's all-strings shape. */
export function toFormValues(p: PlanModel): PlanFormValues {
  return {
    key: p.key ?? '',
    name: p.name ?? '',
    tagline: p.tagline ?? '',
    description: p.description ?? '',
    price: p.price != null ? String(p.price) : '',
    currency: asOption(p.currency, CURRENCIES, 'UGX'),
    billing_cycle: asOption(p.billing_cycle, BILLING_CYCLES, 'monthly'),
    trial_days: p.trial_days != null ? String(p.trial_days) : '0',
    sort_order: String(p.sort_order ?? 0),
    is_active: p.is_active ?? true,
    highlight: p.highlight ?? false,
    features: (p.features ?? []).map((value) => ({ value })),
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/** Rebuilds the DB row from form values: strings coerce to numbers, empties to null. */
export function toWritePayload(values: PlanFormValues) {
  return {
    key: values.key.trim(),
    name: values.name.trim(),
    tagline: nullIfEmpty(values.tagline),
    description: nullIfEmpty(values.description),
    price: Number(values.price),
    currency: values.currency,
    billing_cycle: values.billing_cycle,
    trial_days: Number(values.trial_days),
    sort_order: Number(values.sort_order),
    is_active: values.is_active,
    highlight: values.highlight,
    features: values.features.map((f) => f.value.trim()),
  };
}
