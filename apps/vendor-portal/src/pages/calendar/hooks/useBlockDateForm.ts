import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { blockDateFormSchema, emptyBlockDateValues, toBlockedDateInsert } from '../schema';

/**
 * Blocks a date the vendor is unavailable.
 *
 * The form clears itself on success rather than re-baselining: blocking dates
 * is a repeated action, and leaving the last one in the field invites blocking
 * it twice.
 */
export function useBlockDateForm(vendorId: string) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useZodForm(blockDateFormSchema, { defaultValues: emptyBlockDateValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('vendor_blocked_dates')
      .insert(toBlockedDateInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    reset(emptyBlockDateValues);
    qc.invalidateQueries({ queryKey: ['v-blocked', vendorId] });
  });

  return { control, error, busy: isSubmitting, submit };
}
