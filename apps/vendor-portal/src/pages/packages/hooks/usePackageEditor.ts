import { useMemo, useState } from 'react';
import { useFieldArray, useWatch, type Control } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { packageActionError } from '@sinnapi/ui';
import { supabase } from '@/lib/supabase';
import type { PackageModel } from '@/lib/types';
import {
  emptyPackageLine,
  emptyPackageTier,
  emptyPackageValues,
  formValuesToPreview,
  packageFormSchema,
  packageToFormValues,
  toSavePackageArgs,
  type PackageFormValues,
} from '../schema';

/**
 * The package editor: one form over a three-level tree, saved in one call.
 *
 * WHY ONE FORM AND NOT A WIZARD
 * The tiers are priced against each other — a vendor setting Gold at 1.35m is
 * deciding what Silver is worth at the same moment — so a flow that shows them
 * one tier at a time makes the vendor hold the comparison in their head. The
 * preview beside the form is the other half of that: it prices from the live
 * values, so what they are about to publish is on screen while they type.
 *
 * WHY THE PREVIEW GOES THROUGH THE SHARED RENDERER
 * `formValuesToPreview` builds the same shape the read query returns, so the
 * preview and the published card are one code path. A preview with arithmetic
 * of its own is a preview that can flatter the thing it is previewing, which is
 * the one bug in an editor a vendor would never think to check for.
 */
export function usePackageEditor(vendorId: string, pkg: PackageModel | null, onSaved: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const defaultValues = useMemo<PackageFormValues>(
    () => (pkg ? packageToFormValues(pkg) : emptyPackageValues),
    [pkg],
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, errors },
  } = useZodForm(packageFormSchema, { defaultValues });

  const tiers = useFieldArray({ control, name: 'tiers' });
  const addOns = useFieldArray({ control, name: 'add_ons' });

  // Watched rather than read on submit, because the preview is the point: the
  // total has to move as the vendor types or it is not telling them anything.
  const values = useWatch({ control }) as PackageFormValues;
  const preview = useMemo(
    () => formValuesToPreview({ ...emptyPackageValues, ...values }),
    [values],
  );

  const submit = handleSubmit(async (formValues) => {
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      'save_quote_package',
      toSavePackageArgs(formValues, vendorId),
    );
    if (rpcError) {
      setError(packageActionError(rpcError));
      return;
    }
    qc.invalidateQueries({ queryKey: ['v-packages', vendorId] });
    onSaved();
  });

  /**
   * Adding a tier names it after its position rather than leaving it blank,
   * because an unnamed tier fails validation on submit — several fields away
   * from where the vendor is looking — and "Tier 2" is a name they can accept.
   */
  const addTier = () => tiers.append(emptyPackageTier(`Tier ${tiers.fields.length + 1}`, false));

  /**
   * Marking a tier recommended clears the others.
   *
   * A radio in all but appearance, and enforced here rather than left to the
   * schema's refinement: a vendor who ticks a second tier means "this one
   * instead", and refusing the save to tell them so would be pedantry.
   */
  const recommend = (index: number) => {
    tiers.fields.forEach((_, i) => setValue(`tiers.${i}.is_recommended`, i === index));
  };

  return {
    control,
    error,
    busy: isSubmitting,
    isEditing: pkg != null,
    preview,
    tiers: {
      fields: tiers.fields,
      add: addTier,
      remove: tiers.remove,
      /** A package must keep one tier; the last one's remove is disabled. */
      canRemove: tiers.fields.length > 1,
      recommend,
      error: errors.tiers?.root?.message ?? errors.tiers?.message,
    },
    addOns: {
      fields: addOns.fields,
      add: () => addOns.append({ ...emptyPackageLine }),
      remove: addOns.remove,
    },
    setValue,
    submit,
  };
}

/**
 * One tier's lines.
 *
 * A hook of its own because `useFieldArray` needs a concrete name and the tier
 * only learns its index from where it is rendered. Mounted by the tier
 * component, so a removed tier's array unmounts with it rather than lingering
 * under a stale index.
 */
export function useTierLines(control: Control<PackageFormValues>, tierIndex: number) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `tiers.${tierIndex}.items`,
  });

  return {
    fields,
    add: () => append({ ...emptyPackageLine }),
    remove,
    /** A tier must keep one line; the last one's remove is disabled. */
    canRemove: fields.length > 1,
  };
}
