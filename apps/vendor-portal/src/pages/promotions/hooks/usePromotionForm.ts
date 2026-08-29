import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import type { PromotionModel } from '@/lib/types';
import {
  promotionFormSchema,
  emptyPromotionValues,
  toPromotionInsert,
  toPromotionUpdate,
  toPromotionValues,
} from '../schema';

/**
 * Writing a promotion — one hook for creating and for editing.
 *
 * The two differ only in which statement runs and what the fields start as, and
 * splitting them would have meant maintaining the same validation, the same
 * error surface and the same invalidation twice. `promotion` being null is the
 * whole difference.
 *
 * Mounted with the dialog and torn down with it, so a cancelled draft is
 * discarded rather than lingering behind a closed dialog and reappearing on the
 * next campaign the vendor opens.
 */
export function usePromotionForm(
  vendorId: string,
  promotion: PromotionModel | null,
  onSuccess: () => void,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = promotion !== null;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(promotionFormSchema, {
    defaultValues: promotion ? toPromotionValues(promotion) : emptyPromotionValues,
  });

  const submit = handleSubmit(async (values) => {
    setError(null);

    const { error: writeError } = isEdit
      ? await supabase.from('promotions').update(toPromotionUpdate(values)).eq('id', promotion.id)
      : await supabase.from('promotions').insert(toPromotionInsert(values, vendorId));

    if (writeError) {
      setError(writeError.message);
      return;
    }

    qc.invalidateQueries({ queryKey: ['v-promotions', vendorId] });
    onSuccess();
  });

  return { control, error, busy: isSubmitting, isEdit, submit };
}
