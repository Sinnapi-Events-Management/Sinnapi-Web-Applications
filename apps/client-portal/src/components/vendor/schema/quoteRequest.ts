import { z } from 'zod';

/** The shape a discount code is allowed to take, matching the column's own. */
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,23}$/;

/**
 * A quote request is the vendor's only brief, so a bare "hi" wastes a round
 * trip for both sides — the minimum asks for enough to price against.
 *
 * The code is optional and validated only for SHAPE. Whether it exists, is in
 * date, covers this package and has uses left is the server's answer and only
 * the server's: a browser that decides a code is good is a browser making a
 * promise `request_quotation` may refuse a moment later. What this catches is
 * the typo — a space, a stray comma — which is worth catching before a round
 * trip and is the only thing about a code a form can know.
 */
export const quoteRequestSchema = z.object({
  // Required here as well as on a package order, and for the same reason: a
  // vendor cannot price work without knowing where it is. Travel is a cost, and
  // a brief that omits it is one the vendor has to answer with a question.
  //
  // 160 to match the cap the booking form puts on `bookings.location`, which is
  // where this ends up.
  eventAddress: z
    .string()
    .trim()
    .min(1, 'Tell them where the event is.')
    .max(160, 'Please keep the address under 160 characters.'),

  details: z
    .string()
    .trim()
    .min(20, 'Describe your event and requirements in at least 20 characters.')
    .max(2000, 'Please keep the description under 2000 characters.'),
  discountCode: z.union([
    z.string().trim().regex(CODE_RE, 'A code is 2–24 letters, numbers or hyphens.'),
    z.literal(''),
  ]),
});

export type QuoteRequestValues = z.infer<typeof quoteRequestSchema>;

export const emptyQuoteRequestValues: QuoteRequestValues = {
  eventAddress: '',
  details: '',
  discountCode: '',
};
