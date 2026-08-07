import { Paper, Box, Stack, Button, SearchField } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import type { EventFacetCounts } from '@/lib/types';
import FacetSelect from '../molecules/FacetSelect';
import type { EventFilters } from '../../hooks/useEventFilters';
import {
  EVENT_TYPE_OPTIONS,
  LOCATION_OPTIONS,
  WHEN_OPTIONS,
  BUDGET_OPTIONS,
  SOURCE_OPTIONS,
  SORT_OPTIONS,
} from '../../schema/filters';

type EventsToolbarProps = {
  search: SearchTerm;
  filters: EventFilters;
  facetCounts?: EventFacetCounts;
};

/**
 * The filter row: a grid that re-columns by breakpoint rather than a flex row
 * of fixed-width boxes.
 *
 * Six dropdowns only share one line on a wide viewport. Sizing them
 * individually — `width: 170, flexShrink: 0` — made that arithmetic the
 * browser's problem: the fixed tracks refused to shrink, so a narrow viewport
 * left ragged part-filled rows and handed the whole width deficit to the only
 * flexible sibling, the search box. A grid states the wrap up front, so nothing
 * has to be squeezed to make a line fit.
 *
 * `minmax(0, 1fr)` rather than a bare `1fr` is load-bearing: a `1fr` track
 * refuses to go below its content's min-content width, so one long option label
 * ("UGX 5M – 15M", "Next 3 months") would push the row wider than its container
 * and overflow the page on the x-axis.
 *
 * The column counts are cut against the width the toolbar actually gets, not
 * the viewport: from `md` up the shell's 256px drawer is permanent, so even an
 * `lg` screen leaves only ~848px here and six columns would be 131px per
 * control. Six waits for `xl`; everything between `sm` and there sits as two
 * roomy rows of three, which reads better than one cramped row of six.
 */
const FILTER_GRID_SX = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    xl: 'repeat(6, minmax(0, 1fr))',
  },
} as const;

/**
 * Search + filters for the public-events feed. Presentational: it renders the
 * controls and delegates every change to the hooks the page hook already owns.
 *
 * Laid out as two bands: search (with the clear affordance beside it) on top,
 * the facet grid beneath. Search keeps its own full-width line at every size
 * because it is the primary control and the only one whose usefulness scales
 * with the room it gets — a dropdown reads the same at 140px as at 300px, a
 * search box does not.
 *
 * A real `<form>` with no submit button: Enter has to work — someone who
 * finishes typing and presses it has already said they're done, so submit
 * flushes the pending debounce instead of making them wait it out — and mobile
 * keyboards only offer a search action key inside a form.
 */
export default function EventsToolbar({ search, filters, facetCounts }: EventsToolbarProps) {
  const showClear = filters.isActive || Boolean(search.input);

  const clearAll = () => {
    filters.reset();
    search.clear();
  };

  return (
    <Paper
      variant="outlined"
      component="form"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search.flush();
      }}
      sx={{ p: 2, mb: 2 }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Grows to absorb the leftover width; minWidth 0 lets it shrink
              politely rather than push the clear button off the line. */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SearchField
              value={search.input}
              onChange={search.setInput}
              onClear={search.clear}
              placeholder="Search events by title or town…"
              ariaLabel="Search events"
              inputProps={{ 'aria-label': 'Search events', enterKeyHint: 'search' }}
            />
          </Box>

          {/* Rides with the search box rather than trailing the filters: it is
              the undo for everything above, and at the end of a wrapping grid it
              would land in a different place at every breakpoint. */}
          {showClear && (
            <Button
              size="small"
              color="inherit"
              startIcon={<FilterAltOffIcon />}
              onClick={clearAll}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Clear
            </Button>
          )}
        </Stack>

        <Box sx={FILTER_GRID_SX}>
          <FacetSelect
            label="Occasion"
            value={filters.values.type}
            onChange={(next) => filters.setFacet('type', next)}
            options={EVENT_TYPE_OPTIONS}
            counts={facetCounts?.type}
            anyLabel="Any occasion"
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

          <FacetSelect
            label="Type"
            value={filters.values.source}
            onChange={(next) => filters.setFacet('source', next)}
            options={SOURCE_OPTIONS}
            counts={facetCounts?.source}
            anyLabel="All events"
          />

          <FacetSelect
            label="Sort by"
            value={filters.sort}
            onChange={filters.setSort}
            options={SORT_OPTIONS}
            // Sort always holds a value: 'soonest' is the default order, not
            // the absence of one, so there is no "Any" entry to offer.
            hideAnyOption
          />
        </Box>
      </Stack>
    </Paper>
  );
}
