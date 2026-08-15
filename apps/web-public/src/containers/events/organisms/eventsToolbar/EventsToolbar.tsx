'use client';
import { Paper } from '@sinnapi/ui/atoms';
import type { EventFacetCounts, FilterOption } from '@/lib/types';
import { useEventsFilters } from '../../hooks/useEventsFilters';
import ToolbarSummary from './molecules/ToolbarSummary';
import ToolbarFacets from './molecules/ToolbarFacets';
import ActiveFilterChips from './atoms/ActiveFilterChips';

type EventsToolbarProps = {
  /** The managed occasions, fetched by the page and threaded down. */
  typeOptions: FilterOption[];
  loaded: number;
  total: number;
  facetCounts?: EventFacetCounts;
  isLoading: boolean;
};

/**
 * Refinement toolbar. Reads and writes the URL directly through
 * `useEventsFilters` rather than taking filter state as props — the hero's
 * search box writes to the same place, and routing both through a shared parent
 * would mean pulling the entire hero into the client bundle to do it.
 *
 * Counts flow *down* as props, because those belong to the grid's query and this
 * component only labels them.
 */
export default function EventsToolbar({
  typeOptions,
  loaded,
  total,
  facetCounts,
  isLoading,
}: EventsToolbarProps) {
  const { params, activeFilters, setFacet, setSort, clearFacet, clearAll } =
    useEventsFilters(typeOptions);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, mb: { xs: 3, md: 4 } }}>
      <ToolbarSummary
        loaded={loaded}
        total={total}
        activeFilters={activeFilters}
        isLoading={isLoading}
        onClear={clearAll}
      />
      <ToolbarFacets
        typeOptions={typeOptions}
        params={params}
        facetCounts={facetCounts}
        onFacetChange={setFacet}
        onSortChange={setSort}
      />
      <ActiveFilterChips typeOptions={typeOptions} params={params} onRemove={clearFacet} />
    </Paper>
  );
}
