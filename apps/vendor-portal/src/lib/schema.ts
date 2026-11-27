import { z } from 'zod';
import { phoneSchema } from '@sinnapi/ui/forms';

/**
 * Field builders shared by more than one form schema.
 *
 * These are primitives, not schemas: each form's own `schema/` folder composes
 * them into the shape it writes. They live here so a rule that has to agree
 * across features — what counts as a date, what counts as a phone number — has
 * exactly one definition to change.
 */

/** `<input type="date">` always hands back `YYYY-MM-DD` or an empty string. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

/**
 * An optional phone number, international (E.164) — the shared rule every portal
 * uses, so a saved number is one WhatsApp can reach. Render it with
 * `ControlledPhoneField`, which produces that format.
 */
export const optionalPhoneField = () => phoneSchema();

/** An optional URL. Blank stays blank; anything present must parse. */
export const optionalUrlField = (message = 'Enter a valid URL, e.g. https://example.com.') =>
  z.union([z.string().trim().url(message), z.literal('')]);
