import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { disputeFormSchema, emptyDisputeValues } from '../schema';

/**
 * Raises a dispute against a held escrow. Lives with the form rather than with
 * `useEscrowActions` because it is the only escrow action that collects input —
 * the others are single confirmed clicks.
 */
export function useDisputeForm(escrowId: string, onSuccess: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(disputeFormSchema, { defaultValues: emptyDisputeValues });

  const submit = handleSubmit(async ({ reason }) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc('open_dispute', {
      p_escrow_id: escrowId,
      p_reason: reason.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['escrow'] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
