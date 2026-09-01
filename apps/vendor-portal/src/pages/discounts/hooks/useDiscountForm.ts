import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { usePackages, useServices, useOfferTargets } from '@/hooks/queries';
import { useOfferTargetPicker } from '@/components/offers/hooks/useOfferTargetPicker';
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
 * THE TARGETS ARE A SECOND WRITE, AND DELIBERATELY NOT PART OF THE FORM
 * They live in `offer_targets`, and a brand-new code has no id to hang them off
 * until its insert returns. So the code is written first and its scope second.
 * A scope write that fails after the code is saved does NOT fail the save — the
 * row exists, and reporting a failure would have the vendor create the same code
 * twice (and hit the unique index doing it). The warning surfaces on the screen
 * behind instead, where the code now is.
 *
 * A code with no targets of its own inherits its CAMPAIGN's, which is why the
 * picker sits under the campaign field rather than above it: choosing a campaign
 * is often all the scoping a code needs, and the picker below is how a vendor
 * narrows it further.
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
  onSuccess: (warning?: string) => void,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = discount !== null;

  const packages = usePackages(vendorId);
  const services = useServices(vendorId);
  const targets = useOfferTargets(vendorId);

  const mine = (targets.data ?? []).filter((row) => row.discount_id === discount?.id);
  const picker = useOfferTargetPicker(discount ? mine : []);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(discountFormSchema, {
    defaultValues: discount ? toDiscountValues(discount) : emptyDiscountValues,
  });

  const type = useWatch({ control, name: 'type' });
  const isAutomatic = useWatch({ control, name: 'is_automatic' });

  const submit = handleSubmit(async (values) => {
    setError(null);

    let discountId = discount?.id ?? null;

    if (isEdit) {
      const { error: writeError } = await supabase
        .from('discounts')
        .update(toDiscountUpdate(values))
        .eq('id', discount.id);
      const message = discountWriteMessage(writeError);
      if (message) {
        setError(message);
        return;
      }
    } else {
      // `select('id').single()`: the targets need the id, and looking the row
      // back up by code would fail for an automatic discount, which has none.
      const { data, error: writeError } = await supabase
        .from('discounts')
        .insert(toDiscountInsert(values, vendorId))
        .select('id')
        .single();
      const message = discountWriteMessage(writeError);
      if (message || !data) {
        setError(message ?? 'Could not create this discount.');
        return;
      }
      discountId = data.id as string;
    }

    const targetError = discountId
      ? await picker.save({ discount_id: discountId })
      : 'Could not attach this discount to your packages.';

    qc.invalidateQueries({ queryKey: ['v-discounts', vendorId] });
    // A code attached to, detached from or repriced under a campaign changes
    // what that campaign reports on the Promotions screen.
    qc.invalidateQueries({ queryKey: ['v-promotion-discounts', vendorId] });
    qc.invalidateQueries({ queryKey: ['v-offer-targets', vendorId] });
    onSuccess(targetError ?? undefined);
  });

  return {
    control,
    error,
    busy: isSubmitting,
    isEdit,
    /** True once clients have used this code, which freezes the string. */
    codeLocked: isEdit && discount.used_count > 0,
    isFixed: type === 'fixed',
    isAutomatic,
    valueLabel: type === 'fixed' ? 'Value (UGX)' : 'Value (%)',
    promotionOptions: toPromotionOptions(promotions, discount?.promotion_id),
    submit,
    picker,
    packages: packages.data ?? [],
    services: services.data ?? [],
    catalogueLoading: packages.isLoading || services.isLoading,
  };
}
