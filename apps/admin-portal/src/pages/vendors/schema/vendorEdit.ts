import { z } from 'zod';
import type { VendorDetailModel } from '@/lib/types';

// Option values mirror the Postgres enums in 20260618000001_extensions_and_enums.sql.
// Labels are spelled out rather than `titleize`d — the raw values ('lt_1y', '10y_plus')
// don't humanise cleanly.
const YEARS_IN_OPERATION = ['lt_1y', '1_3y', '3_5y', '5_10y', '10y_plus'] as const;
const PRICING_MODELS = ['fixed', 'hourly', 'custom', 'combination'] as const;
const VISIBILITIES = ['public', 'hidden'] as const;
/** Mirrors the `currencies` seed — UGX and USD are the only active codes. */
const CURRENCIES = ['UGX', 'USD'] as const;

export type SelectOption = { value: string; label: string };

/** Leading blank entry lets an optional select be cleared back to null. */
export const YEARS_IN_OPERATION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Not specified' },
  { value: 'lt_1y', label: 'Less than 1 year' },
  { value: '1_3y', label: '1–3 years' },
  { value: '3_5y', label: '3–5 years' },
  { value: '5_10y', label: '5–10 years' },
  { value: '10y_plus', label: '10+ years' },
];

export const PRICING_MODEL_OPTIONS: SelectOption[] = [
  { value: '', label: 'Not specified' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'custom', label: 'Custom' },
  { value: 'combination', label: 'Combination' },
];

export const VISIBILITY_OPTIONS: SelectOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'hidden', label: 'Hidden' },
];

export const CURRENCY_OPTIONS: SelectOption[] = CURRENCIES.map((c) => ({ value: c, label: c }));

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

/**
 * Validates the editable subset of a vendor. Every field is a string or boolean
 * so the form stays uncontrolled-friendly and the resolver's input and output
 * types match; nulls and numbers are reconstructed by `toUpdatePayload` on save.
 *
 * `status` is deliberately absent — the active/suspended transition is owned by
 * `useVendorStatus`, which also records a reason.
 */
export const vendorEditSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, 'Business name must be at least 2 characters.')
    .max(120, 'Business name must be 120 characters or fewer.'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug is required.')
    .max(120, 'Slug must be 120 characters or fewer.')
    .regex(SLUG_RE, 'Use lowercase letters, numbers and single hyphens — e.g. kampala-catering.'),
  biography: z.string().trim().max(2000, 'Biography must be 2000 characters or fewer.'),
  base_city: z.string().trim().max(120, 'Base city must be 120 characters or fewer.'),
  website: z.union([z.literal(''), z.string().trim().url('Enter a full URL, including https://.')]),
  years_in_operation: z.enum(YEARS_IN_OPERATION).or(z.literal('')),
  pricing_model: z.enum(PRICING_MODELS).or(z.literal('')),
  starting_price: z.union([
    z.literal(''),
    z.string().regex(AMOUNT_RE, 'Enter an amount like 250000 or 250000.50.'),
  ]),
  starting_price_currency: z.enum(CURRENCIES),
  visibility: z.enum(VISIBILITIES),
  is_featured: z.boolean(),
});

export type VendorEditValues = z.infer<typeof vendorEditSchema>;

function asOption<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : '';
}

/** Projects a fetched vendor onto the form's all-strings shape. */
export function toFormValues(v: VendorDetailModel): VendorEditValues {
  return {
    business_name: v.business_name ?? '',
    slug: v.slug ?? '',
    biography: v.biography ?? '',
    base_city: v.base_city ?? '',
    website: v.website ?? '',
    years_in_operation: asOption(v.years_in_operation, YEARS_IN_OPERATION),
    pricing_model: asOption(v.pricing_model, PRICING_MODELS),
    starting_price: v.starting_price != null ? String(v.starting_price) : '',
    starting_price_currency: asOption(v.starting_price_currency, CURRENCIES) || 'UGX',
    visibility: asOption(v.visibility, VISIBILITIES) || 'hidden',
    is_featured: v.is_featured ?? false,
  };
}

const nullIfEmpty = (s: string) => (s.trim() === '' ? null : s.trim());

/**
 * Rebuilds the DB row from form values: empty strings become null so optional
 * columns clear properly, and the amount returns to a number.
 *
 * `suspended` forces `visibility` to hidden — `useVendorStatus` derives visibility
 * from status on every transition, so letting an edit publish a suspended vendor
 * would leave the two columns contradicting each other.
 */
export function toUpdatePayload(values: VendorEditValues, opts: { suspended: boolean }) {
  return {
    business_name: values.business_name.trim(),
    slug: values.slug.trim(),
    biography: nullIfEmpty(values.biography),
    base_city: nullIfEmpty(values.base_city),
    website: nullIfEmpty(values.website),
    years_in_operation: nullIfEmpty(values.years_in_operation),
    pricing_model: nullIfEmpty(values.pricing_model),
    starting_price: values.starting_price === '' ? null : Number(values.starting_price),
    starting_price_currency: values.starting_price_currency,
    visibility: opts.suspended ? 'hidden' : values.visibility,
    is_featured: values.is_featured,
  };
}
