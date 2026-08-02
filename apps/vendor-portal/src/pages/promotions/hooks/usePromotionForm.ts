import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { promotionFormSchema, emptyPromotionValues, toPromotionInsert } from '../schema';

/** Creates a promotion, then closes the dialog and refreshes the list. */
export function usePromotionForm(vendorId: string, onSuccess: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(promotionFormSchema, { defaultValues: emptyPromotionValues });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('promotions')
      .insert(toPromotionInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-promotions', vendorId] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, submit };
}
