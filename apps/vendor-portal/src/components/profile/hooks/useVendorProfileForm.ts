import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import {
  vendorProfileFormSchema,
  toVendorProfileValues,
  toVendorProfileUpdate,
  type VendorProfileSource,
} from '../schema';

/**
 * Business-details editing for the signed-in vendor.
 *
 * `values` keeps the fields in step with the vendor query, so a background
 * refetch populates the form without a manual reset. A successful save
 * re-baselines from what was submitted; a failed one keeps the edits.
 */
export function useVendorProfileForm(vendor: VendorProfileSource & { id: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useZodForm(vendorProfileFormSchema, { values: toVendorProfileValues(vendor) });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: updateError } = await supabase
      .from('vendors')
      .update(toVendorProfileUpdate(values))
      .eq('id', vendor.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    reset(values);
    setToast(true);
    qc.invalidateQueries({ queryKey: ['my-vendor'] });
  });

  return {
    control,
    error,
    busy: isSubmitting,
    isDirty,
    toast,
    dismissToast: () => setToast(false),
    submit,
  };
}
