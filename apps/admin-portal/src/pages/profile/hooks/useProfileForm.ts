import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileFormValues } from '../schema';

/**
 * Wires the personal-details form to react-hook-form + zod. `values` keeps the
 * fields in step with the profile query, so the form populates itself the moment
 * the read resolves without a manual reset.
 */
export function useProfileForm(
  values: ProfileFormValues,
  onSave: (values: ProfileFormValues) => Promise<boolean>,
) {
  const {
    control,
    reset,
    formState: { isDirty },
    handleSubmit,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values,
  });

  return {
    control,
    isDirty,
    /** Discards edits and returns to the last saved values. */
    revert: () => reset(values),
    submit: handleSubmit(async (v) => {
      // Re-baseline on success so the form goes clean and the Save button
      // disables again; a failed save keeps the edits (and the dirty state).
      if (await onSave(v)) reset(v);
    }),
  };
}
