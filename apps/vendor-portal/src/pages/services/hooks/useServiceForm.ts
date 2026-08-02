import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { serviceFormSchema, emptyServiceValues, toServiceInsert } from '../schema';

/** Creates a vendor service, then closes the dialog and refreshes the list. */
export function useServiceForm(vendorId: string, onSuccess: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(serviceFormSchema, { defaultValues: emptyServiceValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('vendor_services')
      .insert(toServiceInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-services', vendorId] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
