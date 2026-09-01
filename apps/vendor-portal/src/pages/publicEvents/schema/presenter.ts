import type { EventFacetCounts } from '@/lib/types';
import { PANEL_FACET_KEYS, SOURCE_OPTIONS, type FacetValues } from './filters';

/**
 * Presentation logic for the public-events FEED — the derivations the toolbar
 * and the source tabs need, kept out of the components that render them.
 *
 * Derivations about an *event* itself (its budget line, how soon it is, whether
 * a vendor may act on it) are not here: the event page needs the same answers,
 * so they live in `@/lib/events` where both screens read them.
 */

/**
 * How many filters the collapsed panel is holding — the number its toggle
 * badges.
 *
 * Deliberately not `EventFilters.activeCount`: that one counts every facet in
 * the URL, and source no longer lives in the panel. Badging a filter the panel
 * doesn't contain sends a vendor looking for a control that isn't there.
 */
export function panelFilterCount(values: FacetValues): number {
  return PANEL_FACET_KEYS.reduce((count, key) => count + (values[key] ? 1 : 0), 0);
}

export type SourceTabOption = { value: string; label: string; count?: number };

/**
 * The source facet as a tab bar: All, then each source with its result count.
 *
 * Source is promoted out of the dropdown row because it is the one facet that
 * changes what a vendor can *do* — admin events take no expression of interest
 * — so it is a mode, not a way of narrowing. "All" carries no token and clears
 * the filter; the counts come from `count_event_facets_public`, which ignores
 * a facet's own selection, so All's total is their sum and stays correct
 * whichever tab is open.
 */
export function sourceTabOptions(counts?: EventFacetCounts['source']): SourceTabOption[] {
  const withCount = SOURCE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    count: counts?.[option.value],
  }));

  return [
    {
      value: '',
      label: 'All events',
      count: counts
        ? withCount.reduce((total, option) => total + (option.count ?? 0), 0)
        : undefined,
    },
    ...withCount,
  ];
}
