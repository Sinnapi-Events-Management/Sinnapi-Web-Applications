import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { discountFormSchema, emptyDiscountValues, toDiscountInsert } from '../schema';

/**
 * Creates a discount code, then closes the dialog and refreshes the list.
 *
 * The chosen type is watched so the value field can label itself — "%" versus
 * "UGX" — which is the difference between a vendor entering 10 meaning a tenth
 * off and 10 meaning ten shillings off.
 */
export function useDiscountForm(vendorId: string, onSuccess: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(discountFormSchema, { defaultValues: emptyDiscountValues });

  const type = useWatch({ control, name: 'type' });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('discounts')
      .insert(toDiscountInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-discounts', vendorId] });
    onSuccess();
  });

  return {
    control,
    error,
    busy: isSubmitting,
    valueLabel: type === 'fixed' ? 'Value (UGX)' : 'Value (%)',
    submit,
  };
}
