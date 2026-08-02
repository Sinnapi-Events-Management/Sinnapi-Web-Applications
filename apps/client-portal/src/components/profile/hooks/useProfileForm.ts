import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import {
  profileFormSchema,
  toProfileFormValues,
  toProfileUpdate,
  type ProfileFormSource,
} from '../schema';

/**
 * Personal-details editing for the signed-in client.
 *
 * `values` (not `defaultValues`) keeps the fields in step with the profile
 * query, so a background refetch populates the form without a manual reset. A
 * successful save re-baselines from what was submitted, which returns the form
 * to clean and disables Save again; a failed one keeps the edits.
 */
export function useProfileForm(profile: ProfileFormSource & { id: string }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useZodForm(profileFormSchema, { values: toProfileFormValues(profile) });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update(toProfileUpdate(values))
      .eq('id', profile.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    reset(values);
    setToast(true);
    qc.invalidateQueries({ queryKey: ['profile'] });
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
