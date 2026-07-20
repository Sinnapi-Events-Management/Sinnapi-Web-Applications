import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userFormSchema, type UserFormValues } from '../schema';

/**
 * Wires the create/edit form to react-hook-form + zod. `values` keeps the fields
 * in step with whatever the drawer passes (blank defaults for create, the
 * projected record for edit), so the same form serves both modes.
 */
export function useUserForm(
  values: UserFormValues,
  onSave: (values: UserFormValues) => Promise<boolean>,
) {
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    values,
  });

  return {
    control,
    isDirty,
    submit: handleSubmit(async (v) => {
      await onSave(v);
    }),
  };
}
