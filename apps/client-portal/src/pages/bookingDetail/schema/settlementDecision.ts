import { z } from 'zod';

/** The decision form, as the strings and booleans its controls yield. */
export type SettlementDecisionValues = {
  decision: 'full' | 'reduced';
  /** Only meaningful on a reduction; kept as a string, as the input yields it. */
  amount: string;
  reason: string;
  consent: boolean;
};

/** Money as typed: whole units or two decimals. No thousands separators. */
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

const MIN_REASON = 15;

/**
 * What the client is agreeing to pay their vendor after the event.
 *
 * Three rules, and each of them exists because of what happens next rather
 * than because a field should be tidy:
 *
 *   * A reduction has to be *less* than what was asked. Equal is a full
 *     approval and should be recorded as one — otherwise the vendor is asked
 *     to consent to a "reduction" that takes nothing from them, and the
 *     consent record stops meaning anything.
 *   * A reduction has to carry a reason of some substance. The vendor reads it
 *     and has to be able to answer it; "no" is not something anyone can act on,
 *     and a reason too thin to answer is how a settlement becomes a dispute.
 *   * Consent is required either way. The figure that leaves escrow is the
 *     figure somebody said out loud they were willing to pay, and a decision
 *     recorded without that is worth nothing the day it is questioned. The
 *     server refuses without it too; this is so the person is told before the
 *     round trip rather than after it.
 *
 * The maximum is read through a getter for the same reason the advance rate's
 * ceiling is: it belongs to the request being answered and a resolver frozen
 * around a stale figure would validate against a bound that is not the real one.
 */
export function settlementDecisionSchema(getRequested: () => number) {
  return z
    .object({
      decision: z.enum(['full', 'reduced']),
      amount: z.string().trim(),
      reason: z.string().trim(),
      consent: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (!values.consent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['consent'],
          message: 'Please confirm you agree to this amount.',
        });
      }

      if (values.decision !== 'reduced') return;

      const requested = getRequested();

      if (!values.amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'Enter the amount you are approving.',
        });
      } else if (!AMOUNT_RE.test(values.amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'Enter an amount, e.g. 250000.',
        });
      } else if (Number(values.amount) >= requested) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'This has to be less than the amount requested. To pay it all, approve in full.',
        });
      }

      if (values.reason.length < MIN_REASON) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['reason'],
          message: 'Tell the vendor why — they see this and can contest it.',
        });
      }
    });
}

/** The amount as a number, or null when the field is not a usable value. */
export function parseSettlementAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || !AMOUNT_RE.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
