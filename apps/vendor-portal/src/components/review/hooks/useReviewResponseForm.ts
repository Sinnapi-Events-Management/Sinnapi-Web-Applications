import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { reviewResponseSchema, toReviewResponseValues } from '../schema';

/** Writes (or rewrites) the vendor's public reply to a review. */
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
      setError(rpcError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-reviews'] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
