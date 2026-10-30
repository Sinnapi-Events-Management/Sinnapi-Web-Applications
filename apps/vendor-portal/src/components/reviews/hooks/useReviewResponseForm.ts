import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { reviewError } from '@sinnapi/ui/reviews';
import { supabase } from '@/lib/supabase';
import { reviewResponseSchema, toReviewResponseValues } from '../schema/reviewResponseForm';

/**
 * Writes (or rewrites) the vendor's public reply to a review.
 *
 * Shared out of the Reviews page because the reply is now offered in two
 * places: that page's triage list, and the booking the review was left on —
 * where the vendor is already reading what the client said. One form, so the
 * ten-character floor, the thousand-character cap and the refusal copy cannot
 * drift between the two.
 */
export function useReviewResponseForm(
  reviewId: string,
  existing: string | undefined,
  onSuccess: () => void,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(reviewResponseSchema, { defaultValues: toReviewResponseValues(existing) });

  const submit = handleSubmit(async ({ body }) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc('respond_to_review', {
      p_review_id: reviewId,
      p_body: body.trim(),
    });
    if (rpcError) {
      // `rpcError.message` was shown raw, which for the guards this RPC now
      // raises would put `review_not_answerable` in front of a vendor — and for
      // an RLS refusal, a Postgres sentence about our schema. `reviewError`
      // maps every token the review RPCs raise; see `rpcError.ts` for why a
      // Supabase failure cannot be read with `instanceof Error`.
      setError(reviewError(rpcError));
      return;
    }
    // Both reads of this reply: the Reviews page's list, and the one-row read
    // on the booking the review was left on. A reply also closes the client's
    // edit window, so their own view of it is stale too — but that is their
    // portal's cache, refreshed when they next read it.
    qc.invalidateQueries({ queryKey: ['v-reviews'] });
    qc.invalidateQueries({ queryKey: ['v-booking-review'] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
