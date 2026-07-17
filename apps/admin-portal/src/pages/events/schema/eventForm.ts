import { z } from 'zod';
import { EVENT_STATUSES } from '@/lib/status';
import { titleize } from '@/lib/config';
import type { EventDetailModel } from '@/lib/types';

// Option values mirror the Postgres enums in 20260618000001_extensions_and_enums.sql
// and the `currencies` seed (UGX/USD are the only active codes).
const CURRENCIES = ['UGX', 'USD'] as const;

// `event_type` is a free-text column in the DB, but the admin form constrains it
// to this curated set so events categorise consistently. Values are stored
// as-is; a legacy/other value coerces to '' ("Not specified") on load.
const EVENT_TYPES = [
  'wedding',
  'introduction',
  'birthday',
  'baby_shower',
  'graduation',
  'company_event',
  'anniversary',
  'company_launch',
  'fundraising',
  'conference',
] as const;

export type SelectOption = { value: string; label: string };

/** `event_status` values as form-select options, in lifecycle order. */
export const STATUS_OPTIONS: SelectOption[] = EVENT_STATUSES.map((status) => ({
  value: status,
  label: titleize(status),
}));

/** Leading blank entry lets the optional event type be cleared back to null. */
export const EVENT_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Not specified' },
  ...EVENT_TYPES.map((type) => ({ value: type, label: titleize(type) })),
];

export const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({ value: c, label: c }));

const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

/**
 * Validates the editable subset of an event. Every field is a string or boolean
 * so the form stays uncontrolled-friendly and the resolver's input and output
 * types match; nulls and numbers are reconstructed by the payload builders on
 * save.
 *
 * `source` is deliberately absent — the admin portal only ever authors
 * admin-sourced events, and a client event's origin must never be rewritten.
 */
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, 'Title must be at least 2 characters.')
      .max(200, 'Title must be 200 characters or fewer.'),
    description: z.string().trim().max(5000, 'Description must be 5000 characters or fewer.'),
    event_type: z.enum(EVENT_TYPES).or(z.literal('')),
    event_date: z.union([z.literal(''), z.string().date('Enter a valid date.')]),
    location: z.string().trim().max(200, 'Location must be 200 characters or fewer.'),
    budget_min: z.union([
      z.literal(''),
      z.string().regex(AMOUNT_RE, 'Enter an amount like 250000 or 250000.50.'),
    ]),
    budget_max: z.union([
      z.literal(''),
      z.string().regex(AMOUNT_RE, 'Enter an amount like 250000 or 250000.50.'),
    ]),
    currency: z.enum(CURRENCIES),
    status: z.enum(EVENT_STATUSES),
    is_public: z.boolean(),
  })
  // Mirrors the table's `budget_max >= budget_min` check so the DB never has to
  // reject the write — the error lands on the field the user can fix.
  .refine(
    (v) =>
      v.budget_min === '' || v.budget_max === '' || Number(v.budget_max) >= Number(v.budget_min),
    {
      path: ['budget_max'],
      message: 'Maximum budget must be greater than or equal to the minimum.',
    },
  );

export type EventFormValues = z.infer<typeof eventFormSchema>;

/** Blank form for the create drawer — a public draft in the platform currency. */
export const BLANK_EVENT: EventFormValues = {
  title: '',
  description: '',
  event_type: '',
  event_date: '',
  location: '',
  budget_min: '',
  budget_max: '',
  currency: 'UGX',
  status: 'published',
  is_public: true,
};

function asOption<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Projects a fetched event onto the form's all-strings shape (edit drawer). */
export function toFormValues(e: EventDetailModel): EventFormValues {
  return {
    title: e.title ?? '',
    description: e.description ?? '',
    event_type: EVENT_TYPES.includes(e.event_type as (typeof EVENT_TYPES)[number])
      ? (e.event_type as (typeof EVENT_TYPES)[number])
      : '',
    event_date: e.event_date ?? '',
    location: e.location ?? '',
    budget_min: e.budget_min != null ? String(e.budget_min) : '',
    budget_max: e.budget_max != null ? String(e.budget_max) : '',
    currency: asOption(e.currency, CURRENCIES, 'UGX'),
    status: asOption(e.status, EVENT_STATUSES, 'draft'),
    is_public: e.is_public ?? true,
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());
const amountOrNull = (s: string) => (s === '' ? null : Number(s));

// Fields shared by create and update. Empty strings become null so optional
// columns clear properly, and amounts return to numbers.
function toColumns(values: EventFormValues) {
  return {
    title: values.title.trim(),
    description: nullIfEmpty(values.description),
    event_type: nullIfEmpty(values.event_type),
    event_date: nullIfEmpty(values.event_date),
    location: nullIfEmpty(values.location),
    budget_min: amountOrNull(values.budget_min),
    budget_max: amountOrNull(values.budget_max),
    currency: values.currency,
    status: values.status,
    is_public: values.is_public,
  };
}

/** Insert row for a new admin-authored event. `postedBy` is the acting admin. */
export function toInsertPayload(values: EventFormValues, opts: { postedBy: string }) {
  return { ...toColumns(values), source: 'admin', posted_by: opts.postedBy };
}

/** Update row for an existing event — source and posted_by are never rewritten. */
export function toUpdatePayload(values: EventFormValues) {
  return toColumns(values);
}
