import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import type { PromotionModel } from '@/lib/types';
import {
  discountFormSchema,
  discountWriteMessage,
  emptyDiscountValues,
  toDiscountInsert,
  toDiscountUpdate,
  toDiscountValues,
  toPromotionOptions,
  type DiscountRow,
} from '../schema';

/**
 * Writing a discount code — one hook for creating and for editing.
 *
 * The two differ only in which statement runs and what the fields start as, and
 * splitting them would have meant maintaining the same validation, the same
 * error surface and the same invalidation twice. `discount` being null is the
 * whole difference.
 *
 * The chosen type is watched so the value field can label itself — "%" versus
 * "UGX" — which is the difference between a vendor entering 10 meaning a tenth
 * off and 10 meaning ten shillings off.
 *
 * The code string is locked once a client has redeemed it. The code is not a
 * name, it is the token printed on a flyer and pasted into a checkout: editing
 * it after the fact does not rename an offer, it breaks every copy already in
 * circulation while the redemptions that used the old string stay attached to
 * the row. Everything else about a used code stays editable — extending a
 * window or raising a cap is exactly what a vendor opens this dialog to do.
 */
export function useDiscountForm(
  vendorId: string,
  discount: DiscountRow | null,
  promotions: PromotionModel[],
  onSuccess: () => void,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = discount !== null;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(discountFormSchema, {
    defaultValues: discount ? toDiscountValues(discount) : emptyDiscountValues,
  });

  const type = useWatch({ control, name: 'type' });

  const submit = handleSubmit(async (values) => {
    setError(null);

    const { error: writeError } = isEdit
      ? await supabase.from('discounts').update(toDiscountUpdate(values)).eq('id', discount.id)
      : await supabase.from('discounts').insert(toDiscountInsert(values, vendorId));

    const message = discountWriteMessage(writeError);
    if (message) {
      setError(message);
      return;
    }

    qc.invalidateQueries({ queryKey: ['v-discounts', vendorId] });
    // A code attached to, detached from or repriced under a campaign changes
    // what that campaign reports on the Promotions screen.
    qc.invalidateQueries({ queryKey: ['v-promotion-discounts', vendorId] });
    onSuccess();
  });

  return {
    control,
    error,
    busy: isSubmitting,
    isEdit,
    /** True once clients have used this code, which freezes the string. */
    codeLocked: isEdit && discount.used_count > 0,
    isFixed: type === 'fixed',
    valueLabel: type === 'fixed' ? 'Value (UGX)' : 'Value (%)',
    promotionOptions: toPromotionOptions(promotions, discount?.promotion_id),
    submit,
  };
}
