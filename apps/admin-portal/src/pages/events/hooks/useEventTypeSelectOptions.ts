import { useMemo } from 'react';
import { useEventTypeOptions } from '@/hooks/queries';
import type { SelectOption } from '../schema';

/**
 * The occasion select's options, read from `event_types` rather than a constant.
 *
 * Two deliberate choices:
 *
 * A leading blank entry, because the type is optional — without it there is no
 * way to clear one back to null.
 *
 * Retired types are listed, marked, instead of being dropped. An event filed
 * under an occasion an admin has since deactivated must keep showing it: hiding
 * it would render the field blank and the next save would quietly wipe the
 * event's type. The marker is what stops a retired option reading as a normal
 * choice.
 */
export function useEventTypeSelectOptions() {
  const { data, isLoading, error } = useEventTypeOptions();

  const options = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Not specified' },
      ...(data ?? []).map((t) => ({
        value: t.id,
        label: t.is_active ? t.name : `${t.name} (inactive)`,
      })),
    ],
    [data],
  );

  return {
    options,
    isLoading,
    /** Surfaced by the form so a failed lookup reads as "couldn't load", not "none exist". */
    error: error instanceof Error ? error.message : null,
  };
}
