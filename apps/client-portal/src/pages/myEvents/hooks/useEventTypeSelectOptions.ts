import { useMemo } from 'react';
import { useEventTypeOptions } from '@/hooks/queries';
import type { SelectOption } from '@sinnapi/ui/forms';

/**
 * The occasion select's options, read from `event_types` instead of typed by
 * the client.
 *
 * A leading blank entry keeps the field genuinely optional — the schema allows
 * an unset occasion, so there has to be a way back to it after choosing one.
 *
 * Only active types come back from the query, which is what makes this list
 * safe to show as-is: nothing here can be an occasion an admin has retired.
 */
export function useEventTypeSelectOptions() {
  const { data, isLoading, error } = useEventTypeOptions();

  const options = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Not sure yet' },
      ...(data ?? []).map((t) => ({ value: t.id, label: t.name })),
    ],
    [data],
  );

  return {
    options,
    isLoading,
    /** Lets the form say "couldn't load" rather than showing an empty picker. */
    error: error instanceof Error ? error.message : null,
  };
}
