import { Box, FacetSelect } from '@sinnapi/ui';
import type { EventFacetCounts } from '@/lib/types';
import type { EventFilters } from '../../hooks/useEventFilters';
import {
  BUDGET_OPTIONS,
  LOCATION_OPTIONS,
  WHEN_OPTIONS,
  type FilterOption,
} from '../../schema/filters';

type EventFacetGridProps = {
  filters: EventFilters;
  /** Occasions from `event_types` — fetched, so they arrive as a prop. */
  typeOptions: FilterOption[];
  facetCounts?: EventFacetCounts;
};

/**
 * The four facets that *narrow* the feed. Source isn't among them: it changes
 * what a vendor can do with a result rather than how many there are, so it
 * lives in the tab bar above the feed.
 *
 * `minmax(0, 1fr)` rather than a bare `1fr` is load-bearing: a `1fr` track
 * refuses to go below its content's min-content width, so one long option label
 * ("UGX 5M – 15M", "Next 3 months") would push the row wider than its container
 * and overflow on the x-axis.
 *
 * The column counts are cut against the width this actually gets, not the
 * viewport: from `md` up the shell's 256px drawer is permanent, so even an `lg`
 * screen leaves under 900px here. One column on `xs` is deliberate — there this
 * renders inside a bottom sheet, where full-width controls are the thumb
 * target, not a space saving.
 */
const FACET_GRID_SX = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(4, minmax(0, 1fr))',
  },
} as const;

/** The facet dropdowns, laid out to re-column by breakpoint. Presentational. */
export default function EventFacetGrid({ filters, typeOptions, facetCounts }: EventFacetGridProps) {
  return (
    <Box sx={FACET_GRID_SX}>
      <FacetSelect
        label="Occasion"
        value={filters.values.type}
        onChange={(next) => filters.setFacet('type', next)}
        options={typeOptions}
        counts={facetCounts?.type}
        anyLabel="Any occasion"
        // Nothing to choose from until the vocabulary lands; an empty dropdown
        // that still opens reads as "no occasions exist".
        disabled={typeOptions.length === 0}
      />

      <FacetSelect
        label="Location"
        value={filters.values.location}
        onChange={(next) => filters.setFacet('location', next)}
        options={LOCATION_OPTIONS}
        counts={facetCounts?.location}
        anyLabel="Anywhere"
      />

      <FacetSelect
        label="Date"
        value={filters.values.when}
        onChange={(next) => filters.setFacet('when', next)}
        options={WHEN_OPTIONS}
        counts={facetCounts?.when}
        anyLabel="Any date"
      />

      <FacetSelect
        label="Budget"
        value={filters.values.budget}
        onChange={(next) => filters.setFacet('budget', next)}
        options={BUDGET_OPTIONS}
        anyLabel="Any budget"
      />
    </Box>
  );
}
