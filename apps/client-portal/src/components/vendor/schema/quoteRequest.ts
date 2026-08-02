import { z } from 'zod';

/**
 * A quote request is the vendor's only brief, so a bare "hi" wastes a round
 * trip for both sides — the minimum asks for enough to price against.
 */
export const quoteRequestSchema = z.object({
  details: z
    .string()
    .trim()
    .min(20, 'Describe your event and requirements in at least 20 characters.')
    .max(2000, 'Please keep the description under 2000 characters.'),
});

export type QuoteRequestValues = z.infer<typeof quoteRequestSchema>;

export const emptyQuoteRequestValues: QuoteRequestValues = { details: '' };
