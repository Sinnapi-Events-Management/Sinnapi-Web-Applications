import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { usePackages, useServices, useOfferTargets } from '@/hooks/queries';
import { useOfferTargetPicker } from '@/components/offers/hooks/useOfferTargetPicker';
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
 *
 * THE TARGETS ARE A SECOND WRITE, AND DELIBERATELY NOT PART OF THE FORM
 * They live in `offer_targets`, and a brand-new campaign has no id to hang them
 * off until its insert returns. So the campaign is written first and its scope
 * second, in that order, always.
 *
 * A FAILED TARGET WRITE DOES NOT FAIL THE SAVE
 * The campaign row exists by then. Reporting "could not save" would have the
 * vendor create the same campaign again; reporting nothing would leave them
 * believing a sale covers four packages when it covers everything they sell.
 * So the dialog closes, the campaign stands, and the scope failure is surfaced
 * as its own message on the screen behind — which is where the campaign they
 * just made is now sitting, ready to be edited.
 */
export function usePromotionForm(
  vendorId: string,
  promotion: PromotionModel | null,
  onSuccess: (warning?: string) => void,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const isEdit = promotion !== null;

  const packages = usePackages(vendorId);
  const services = useServices(vendorId);
  const targets = useOfferTargets(vendorId);

  const mine = (targets.data ?? []).filter((row) => row.promotion_id === promotion?.id);
  const picker = useOfferTargetPicker(promotion ? mine : []);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useZodForm(promotionFormSchema, {
    defaultValues: promotion ? toPromotionValues(promotion) : emptyPromotionValues,
  });

  const submit = handleSubmit(async (values) => {
    setError(null);

    let promotionId = promotion?.id ?? null;

    if (isEdit) {
      const { error: writeError } = await supabase
        .from('promotions')
        .update(toPromotionUpdate(values))
        .eq('id', promotion.id);
      if (writeError) {
        setError(writeError.message);
        return;
      }
    } else {
      // `select('id').single()` rather than a bare insert: the targets need the
      // id, and a second read to find the row we just wrote would have to guess
      // which one it was.
      const { data, error: writeError } = await supabase
        .from('promotions')
        .insert(toPromotionInsert(values, vendorId))
        .select('id')
        .single();
      if (writeError || !data) {
        setError(writeError?.message ?? 'Could not create this campaign.');
        return;
      }
      promotionId = data.id as string;
    }

    const targetError = promotionId
      ? await picker.save({ promotion_id: promotionId })
      : 'Could not attach this campaign to your packages.';

    qc.invalidateQueries({ queryKey: ['v-promotions', vendorId] });
    qc.invalidateQueries({ queryKey: ['v-offer-targets', vendorId] });
    onSuccess(targetError ?? undefined);
  });

  return {
    control,
    error,
    busy: isSubmitting,
    isEdit,
    submit,
    picker,
    packages: packages.data ?? [],
    services: services.data ?? [],
    catalogueLoading: packages.isLoading || services.isLoading,
  };
}
