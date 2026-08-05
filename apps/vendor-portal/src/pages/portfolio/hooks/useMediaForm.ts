import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { mediaFormSchema, emptyMediaValues, toMediaInsert } from '../schema';

/** Registers a portfolio media item, then closes the dialog and refreshes. */
export function useMediaForm(vendorId: string, onSuccess: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(mediaFormSchema, { defaultValues: emptyMediaValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('vendor_media')
      .insert(toMediaInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-media', vendorId] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
