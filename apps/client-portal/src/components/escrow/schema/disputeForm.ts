import { z } from 'zod';

/**
 * A dispute freezes a payout and opens a case an admin has to arbitrate, so the
 * reason carries real weight — the minimum is there to stop a one-word "bad"
 * from becoming the entire evidence trail.
 */
export const disputeFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(20, 'Describe what went wrong in at least 20 characters.')
    .max(2000, 'Please keep the description under 2000 characters.'),
});

export type DisputeFormValues = z.infer<typeof disputeFormSchema>;

export const emptyDisputeValues: DisputeFormValues = { reason: '' };
