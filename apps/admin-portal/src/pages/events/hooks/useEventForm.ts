import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { eventFormSchema, type EventFormValues } from '../schema';

/**
 * Wires an event form (create or edit) to react-hook-form: zod validates, and
 * `values` seeds/re-seeds the fields. Edit passes the fetched record so the
 * drawer can render before it lands and re-populate when it does; create passes
 * the blank template.
 */
export function useEventForm(
  values: EventFormValues,
  onSave: (values: EventFormValues) => Promise<boolean>,
) {
  const {
    control,
    handleSubmit,
    formState: { isDirty },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
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
