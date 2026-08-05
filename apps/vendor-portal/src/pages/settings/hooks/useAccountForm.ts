import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import type { ProfileModel } from '@/lib/types';
import { accountFormSchema, toAccountFormValues, toAccountUpdate } from '../schema';

/**
 * Account-details editing on the settings page.
 *
 * The previous version discarded the update's error entirely and showed the
 * "Account updated" toast either way; a failed save now says so instead of
 * quietly claiming success.
 */
export function useAccountForm(profile: ProfileModel) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useZodForm(accountFormSchema, { values: toAccountFormValues(profile) });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update(toAccountUpdate(values))
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
