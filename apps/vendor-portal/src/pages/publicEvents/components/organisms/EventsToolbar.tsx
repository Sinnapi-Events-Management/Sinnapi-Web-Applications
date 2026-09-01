import {
  Box,
  Paper,
  Stack,
  SearchField,
  FacetSelect,
  FilterDisclosure,
  FilterToggleButton,
} from '@sinnapi/ui';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import type { EventFacetCounts } from '@/lib/types';
import type { EventFilters } from '../../hooks/useEventFilters';
import type { FilterPanel } from '../../hooks/useFilterPanel';
import EventFacetGrid from '../molecules/EventFacetGrid';
import { SORT_OPTIONS, type FilterOption } from '../../schema/filters';
import { panelFilterCount } from '../../schema/presenter';

type EventsToolbarProps = {
  search: SearchTerm;
  filters: EventFilters;
  panel: FilterPanel;
  /** Occasions from `event_types` — fetched, so they arrive as a prop. */
  typeOptions: FilterOption[];
  facetCounts?: EventFacetCounts;
  /** Size of the current result set, for the mobile sheet's confirm button. */
  total: number;
  onClearAll: () => void;
};

/** Panel id, shared by the toggle's `aria-controls` and the panel it opens. */
const FILTER_PANEL_ID = 'public-events-filters';

/**
 * Search, sort, and the disclosure that holds the rest of the filters.
 *
 * The old toolbar kept six dropdowns permanently open above the feed. On a
 * phone that is a full screen of controls before a single result — the filter
 * bar outranking the content on the one device where the fold is tightest. What
 * stays out here is what is used on nearly every visit (search) and what is
 * cheap to leave open (sort, one control). The four narrowing facets fold into
 * `FilterDisclosure`, which is an inline expander on a wide viewport and a
 * bottom sheet on a narrow one.
 *
 * Nothing is hidden silently: the toggle badges how many filters are applied,
 * and the page renders a removable chip per active facet directly beneath.
 *
 * A real `<form>` with no submit button: Enter has to work — someone who
 * finishes typing and presses it has already said they're done, so submit
 * flushes the pending debounce instead of making them wait it out — and mobile
 * keyboards only offer a search action key inside a form.
 */
export default function EventsToolbar({
  search,
  filters,
  panel,
  typeOptions,
  facetCounts,
  total,
  onClearAll,
}: EventsToolbarProps) {
  // Source is a tab now, so it is not one of the filters this panel holds.
  const panelCount = panelFilterCount(filters.values);

  return (
    <Paper
      variant="outlined"
      component="form"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search.flush();
      }}
      sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 3 }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
        {/* Grows to absorb the leftover width; minWidth 0 lets it shrink
            politely rather than push the controls beside it off the line. */}
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

        {/* Toggle and sort share one line below the search box on a phone, so
            the search field keeps a full-width line of its own — it is the only
            control here whose usefulness scales with the room it gets. */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
          <FilterToggleButton
            open={panel.open}
            onToggle={panel.toggle}
            activeCount={panelCount}
            controls={FILTER_PANEL_ID}
          />
          <Box sx={{ flex: { xs: 1, md: '0 0 auto' }, minWidth: 0, width: { md: 200 } }}>
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
      </Stack>

      <FilterDisclosure
        id={FILTER_PANEL_ID}
        open={panel.open}
        onClose={panel.close}
        activeCount={panelCount}
        onClear={onClearAll}
        resultCount={total}
      >
        <EventFacetGrid filters={filters} typeOptions={typeOptions} facetCounts={facetCounts} />
      </FilterDisclosure>
    </Paper>
  );
}
