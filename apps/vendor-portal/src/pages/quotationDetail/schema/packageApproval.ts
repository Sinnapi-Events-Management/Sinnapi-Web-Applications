import { z } from 'zod';

/**
 * The vendor's answer to a package order.
 *
 * One field of substance and one of courtesy, and the asymmetry between them is
 * the whole design: approving is a click, because the client already agreed to
 * everything and the vendor is only saying yes. Declining takes a sentence,
 * because the client is holding what they believe is a made agreement and a
 * campaign use that is about to be handed back.
 *
 * `discountRate` is the ONE number the vendor may move, and only upwards. The
 * bound is not written here: `min_discount_rate` comes from the server on every
 * read, and a floor duplicated into a zod schema is a floor that drifts. What
 * this validates is the shape — that a percentage is a percentage.
 */
export const packageApprovalSchema = z.object({
  discountRate: z
    .string()
    .trim()
    .refine((v) => v === '' || !Number.isNaN(Number(v)), 'Enter a percentage.')
    .refine((v) => v === '' || (Number(v) >= 0 && Number(v) <= 100), 'Between 0 and 100.'),
});

export type PackageApprovalValues = z.infer<typeof packageApprovalSchema>;
