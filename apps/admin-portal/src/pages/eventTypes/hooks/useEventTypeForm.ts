import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { EventTypeModel } from '@/lib/types';
import {
  emptyEventTypeValues,
  eventTypeFormSchema,
  slugify,
  toFormValues,
  type EventTypeFormValues,
} from '../schema';

/**
 * Wires the event-type form to react-hook-form: zod validates, `values` keeps
 * the fields in step with the type being edited (or the blank defaults when
 * creating).
 *
 * The key has no input of its own — it's derived from the name. On create it
 * tracks the name live; on edit it stays exactly as loaded, because the key is
 * the token `search_events_public` matches on and the public site carries in
 * its URLs, so rewriting it on a rename would break every shared link filtered
 * by that occasion.
 *
 * `nextSortOrder` seeds the create form so an admin isn't guessing a number; it
 * stays editable, this only picks the starting value.
 */
export function useEventTypeForm(
  eventType: EventTypeModel | null,
  nextSortOrder: number,
  onSave: (values: EventTypeFormValues) => Promise<boolean>,
) {
  const values = useMemo(
    () =>
      eventType
        ? toFormValues(eventType)
        : { ...emptyEventTypeValues, sort_order: String(nextSortOrder) },
    [eventType, nextSortOrder],
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<EventTypeFormValues>({
    resolver: zodResolver(eventTypeFormSchema),
    values,
  });

  const name = useWatch({ control, name: 'name' });
  const isCreate = !eventType;
  useEffect(() => {
    if (isCreate) setValue('key', slugify(name ?? ''), { shouldDirty: true });
    // Only create mode auto-derives the key; `name`/`isCreate` are the only
    // real dependencies — `setValue` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, isCreate]);

  return {
    control,
    isDirty,
    submit: handleSubmit(async (v) => {
      await onSave(v);
    }),
  };
}
