import { useMemo } from 'react';
import { useEventTypeOptions } from '@/hooks/queries';
import type { FilterOption } from '../schema/filters';

/**
 * The occasion facet's options, projected from `event_types` onto the
 * `{ value, label }` shape every other facet already uses — `value` is the key
 * the RPC matches and the URL carries, `label` is what an admin named it.
 *
 * An empty array while loading (or on failure) is deliberate and load-bearing:
 * `useEventFilters` reads it as "can't verify yet" and leaves the URL's
 * occasion alone, so a shared filtered link doesn't lose its filter before the
 * vocabulary lands.
 */
export function useEventTypeFacetOptions(): FilterOption[] {
  const { data } = useEventTypeOptions();

  return useMemo(() => (data ?? []).map((t) => ({ value: t.key, label: t.name })), [data]);
}
