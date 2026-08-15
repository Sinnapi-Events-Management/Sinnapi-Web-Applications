import { useZodForm } from '@sinnapi/ui/forms';
import { eventFormSchema, type EventFormValues } from '../schema';

/**
 * Wires the event form to react-hook-form: zod validates on blur, and `values`
 * seeds the fields. Submission itself belongs to the caller — `onSave` returns
 * whether the write succeeded, so the drawer owns closing and error display.
 */
export function useEventForm(
  values: EventFormValues,
  onSave: (values: EventFormValues) => Promise<boolean>,
) {
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useZodForm(eventFormSchema, { values });

  return {
    control,
    isDirty,
    submit: handleSubmit(async (v) => {
      await onSave(v);
    }),
  };
}
