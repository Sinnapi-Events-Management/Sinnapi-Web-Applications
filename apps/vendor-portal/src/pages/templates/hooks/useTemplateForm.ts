import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { templateFormSchema, emptyTemplateValues, toTemplateInsert } from '../schema';

/** Creates a quote template, then closes the dialog and refreshes the list. */
export function useTemplateForm(vendorId: string, onSuccess: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(templateFormSchema, { defaultValues: emptyTemplateValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('quote_templates')
      .insert(toTemplateInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-templates', vendorId] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
