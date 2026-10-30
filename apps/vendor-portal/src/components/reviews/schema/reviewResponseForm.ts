import { z } from 'zod';

/**
 * A public reply to a review. Kept short-ish on purpose — the response renders
 * inline under the review on the vendor's public profile.
 */
export const reviewResponseSchema = z.object({
  body: z
    .string()
    .trim()
    .min(10, 'Write at least 10 characters.')
    .max(1000, 'Please keep your response under 1000 characters.'),
});

export type ReviewResponseValues = z.infer<typeof reviewResponseSchema>;

/** Seeds the editor with the existing response, if the vendor already replied. */
export function toReviewResponseValues(existing?: string): ReviewResponseValues {
  return { body: existing ?? '' };
}
