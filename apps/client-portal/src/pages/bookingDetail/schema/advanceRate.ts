import { z } from 'zod';

/** The one field the client edits at checkout, as the string the input yields. */
export type AdvanceRateValues = { advance_rate: string };

/** Whole or one-decimal percent — the precision `bookings.advance_rate` stores. */
const PERCENT_RE = /^\d{1,3}(\.\d{1,2})?$/;

/**
 * The advance the client is willing to release before the event.
 *
 * The ceiling is read through a getter rather than captured at build time
 * because it arrives with the server's quote, one render after the form
 * mounts — and a resolver frozen around a stale limit would validate against
 * a bound that is no longer the real one.
 *
 * Only an upper bound is enforced here. The floor is zero, which is a
 * legitimate choice: "release nothing until I confirm delivery".
 */
export function advanceRateSchema(getLimit: () => number) {
  return z.object({
    advance_rate: z
      .string()
      .trim()
      .min(1, 'Enter an advance percentage.')
      .refine((v) => PERCENT_RE.test(v), 'Enter a percentage, e.g. 20 or 12.5.')
      .refine((v) => Number(v) >= 0, 'Cannot be negative.')
      .superRefine((v, ctx) => {
        const limit = getLimit();
        if (Number(v) > limit) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Cannot exceed the ${limit}% your vendor proposed.`,
          });
        }
      }),
  });
}

/** The percentage as a number, or null when the field is not a usable value. */
export function parseRate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !PERCENT_RE.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
