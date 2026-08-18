import { z } from 'zod';

/**
 * Field builders shared by more than one form schema.
 *
 * These are primitives, not schemas: each form's own `schema/` folder composes
 * them into the shape it writes. They live here so a rule that has to agree
 * across features — what counts as a date, what counts as a phone number — has
 * exactly one definition to change.
 */

/** `DateField` always hands back `YYYY-MM-DD` or an empty string. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `TimeField` always hands back `HH:mm` on a 24-hour clock, or an empty string. */
const ISO_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Deliberately permissive: digits, spaces and the usual grouping punctuation.
 * Real validation of a dialable number belongs to a phone library, not a regex.
 */
const PHONE_RE = /^[+()\-\s\d]{6,20}$/;

const isRealDate = (v: string) => !Number.isNaN(Date.parse(v));

/** A required date. Rejects both blanks and impossible days like 2024-02-31. */
export const requiredDateField = (label = 'Date') =>
  z
    .string()
    .min(1, `${label} is required.`)
    .regex(ISO_DATE_RE, `Enter a valid ${label.toLowerCase()}.`)
    .refine(isRealDate, `Enter a valid ${label.toLowerCase()}.`);

/** An optional date: blank stays blank, anything present must be real. */
export const optionalDateField = (label = 'date') =>
  z.union([
    z
      .string()
      .regex(ISO_DATE_RE, `Enter a valid ${label}.`)
      .refine(isRealDate, `Enter a valid ${label}.`),
    z.literal(''),
  ]);

/**
 * An optional time of day. Blank stays blank; anything present is `HH:mm`,
 * which is what a Postgres `time` column takes verbatim.
 */
export const optionalTimeField = (label = 'time') =>
  z.union([z.string().regex(ISO_TIME_RE, `Enter a valid ${label}.`), z.literal('')]);

/** An optional money/number input, as the string the field actually yields. */
export const optionalAmountField = (label = 'Amount') =>
  z.union([
    z
      .string()
      .trim()
      .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Enter a number.')
      .refine((v) => v === '' || Number(v) >= 0, `${label} cannot be negative.`),
    z.literal(''),
  ]);

/** A required whole number ≥ `min`, as the string the field yields. */
export const requiredIntField = (label: string, min = 1) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((v) => /^\d+$/.test(v), `Enter a whole number.`)
    .refine((v) => Number(v) >= min, `${label} must be at least ${min}.`);

/** An optional phone number. */
export const optionalPhoneField = () =>
  z.union([z.string().trim().regex(PHONE_RE, 'Enter a valid phone number.'), z.literal('')]);

/** An optional URL. Blank stays blank; anything present must parse. */
export const optionalUrlField = (message = 'Enter a valid URL, e.g. https://example.com.') =>
  z.union([z.string().trim().url(message), z.literal('')]);
