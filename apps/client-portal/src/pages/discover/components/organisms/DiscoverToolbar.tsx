import { Paper, Box, Stack, Button, SearchField, FacetSelect } from '@sinnapi/ui';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import type { SearchTerm } from '@/hooks/useSearchTerm';
import type { VendorFilters } from '../../hooks/useVendorFilters';
import {
  PRICE_OPTIONS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  type FilterOption,
} from '../../schema/filters';
import type { VendorFacetCounts } from '@/lib/types';

type DiscoverToolbarProps = {
  search: SearchTerm;
  filters: VendorFilters;
  options: { categories: FilterOption[]; regions: FilterOption[] };
  facetCounts?: VendorFacetCounts;
};

/**
 * The filter row: a grid that re-columns by breakpoint rather than a flex row
 * of fixed-width boxes.
 *
 * Five dropdowns plus a search box cannot share one line below a very wide
 * viewport. Sizing them individually — `width: 180, flexShrink: 0` — made that
 * arithmetic the browser's problem and it had no good answer: the fixed tracks
 * refused to shrink, so the row overflowed the page on the x-axis, and the only
 * flexible sibling left (the search box) absorbed the whole deficit and
 * collapsed to nothing behind the first dropdown. A grid states the wrap up
 * front, so nothing has to be squeezed to make the line fit.
 *
 * `minmax(0, 1fr)` rather than a bare `1fr` is load-bearing: a `1fr` track
 * refuses to go below its content's min-content width, so one long option label
 * ("UGX 3M – 8M", a category name out of the reference table) would push the
 * row wider than its container and put the overflow straight back.
 *
 * The column counts are cut against the width the toolbar actually gets, not
 * the viewport: from `md` up the shell's 256px drawer is permanent, so a `md`
 * screen leaves ~548px here and a five-column row would be 100px per control.
 * Hence the jump to five waits for `lg`, where each track lands at ~160px and
 * grows from there.
 */
const FILTER_GRID_SX = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))',
  },
} as const;

/**
 * Search + filters for Discover. Presentational: it renders the controls and
 * delegates every change to the hooks the page hook already owns, so nothing
 * about how a term is debounced or how a facet reaches the URL lives here.
 *
 * Laid out as two bands: search (with the clear affordance beside it) on top,
 * the facet grid beneath. Search keeps its own full-width line at every size
 * because it is the primary control and the only one whose usefulness scales
 * with the room it gets — a dropdown reads the same at 140px as at 300px, a
 * search box does not.
 *
 * There is no submit button. Search used to require one — the field wrote
 * nothing until you pressed it — but with the query debounced and paginated
 * server-side, typing can drive the grid directly, and a stale button that
 * re-submits what's already on screen is just a step to forget.
 *
 * It stays a real `<form>` regardless. Enter has to work — someone who finishes
 * typing and presses it has already said they're done, so submit flushes the
 * pending debounce instead of making them wait it out — and mobile keyboards
 * only offer a search action key inside a form.
 */
export default function DiscoverToolbar({
  search,
  filters,
  options,
  facetCounts,
}: DiscoverToolbarProps) {
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
              placeholder="Search vendors, services or towns…"
              ariaLabel="Search vendors"
              inputProps={{ 'aria-label': 'Search vendors', enterKeyHint: 'search' }}
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
            label="Category"
            value={filters.values.category}
            onChange={(next) => filters.setFacet('category', next)}
            options={options.categories}
            counts={facetCounts?.category}
            anyLabel="Any category"
            disabled={options.categories.length === 0}
          />

          <FacetSelect
            label="Location"
            value={filters.values.region}
            onChange={(next) => filters.setFacet('region', next)}
            options={options.regions}
            counts={facetCounts?.region}
            anyLabel="Anywhere"
            disabled={options.regions.length === 0}
          />

          <FacetSelect
            label="Price"
            value={filters.values.price}
            onChange={(next) => filters.setFacet('price', next)}
            options={PRICE_OPTIONS}
            anyLabel="Any price"
          />

          <FacetSelect
            label="Rating"
            value={filters.values.rating}
            onChange={(next) => filters.setFacet('rating', next)}
            options={RATING_OPTIONS}
            anyLabel="Any rating"
          />

          <FacetSelect
            label="Sort by"
            value={filters.sort}
            onChange={filters.setSort}
            options={SORT_OPTIONS}
            // Sort always holds a value: 'recommended' is the default order,
            // not the absence of one, so there is no "Any" entry to offer.
            hideAnyOption
          />
        </Box>
      </Stack>
    </Paper>
  );
}
