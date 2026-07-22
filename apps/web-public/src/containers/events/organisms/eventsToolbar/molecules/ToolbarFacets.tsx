'use client';
import { Grid, TextField, MenuItem } from '@sinnapi/ui/atoms';
import type { EventFacetCounts } from '@/lib/types';
import FacetSelect from '@/components/molecules/facetSelect';
import {
  EVENT_TYPE_OPTIONS,
  WHEN_OPTIONS,
  LOCATION_OPTIONS,
  SOURCE_OPTIONS,
  BUDGET_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_SORT,
} from '../../../utils/options';
import type { FacetKey, EventsSearchParams } from '../../../utils/searchParams';

type ToolbarFacetsProps = {
  params: EventsSearchParams;
  facetCounts?: EventFacetCounts;
  onFacetChange: (key: FacetKey, value: string) => void;
  onSortChange: (value: string) => void;
};

/**
 * The control row: five narrowing facets plus the sort order.
 *
 * Occasion, date, town and source carry counts — each is a discrete key the RPC
 * can group by (towns against the curated token list, since `location` is free
 * text). Budget is a continuous band, where counting every option costs a pass
 * per band for a number that changes whenever a poster edits a budget; it's left
 * uncounted rather than shown stale.
 *
 * Date sits second, right after occasion: on an events page "when" is the
 * question most visitors are actually asking, and burying it behind town and
 * budget would have it read as an afterthought.
 *
 * Sort sits last and visually apart because it doesn't narrow anything — mixing
 * it into the facet row invites the reading that it does.
 */
export default function ToolbarFacets({
  params,
  facetCounts,
  onFacetChange,
  onSortChange,
}: ToolbarFacetsProps) {
  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="Occasion"
          allLabel="All occasions"
          options={EVENT_TYPE_OPTIONS}
          value={params.type}
          counts={facetCounts?.type}
          onChange={(value) => onFacetChange('type', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="When"
          allLabel="Any date"
          options={WHEN_OPTIONS}
          value={params.when}
          counts={facetCounts?.when}
          onChange={(value) => onFacetChange('when', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="Location"
          allLabel="All locations"
          options={LOCATION_OPTIONS}
          value={params.location}
          counts={facetCounts?.location}
          onChange={(value) => onFacetChange('location', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="Type"
          allLabel="All types"
          options={SOURCE_OPTIONS}
          value={params.source}
          counts={facetCounts?.source}
          onChange={(value) => onFacetChange('source', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="Budget"
          allLabel="Any budget"
          options={BUDGET_OPTIONS}
          value={params.budget}
          onChange={(value) => onFacetChange('budget', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <TextField
          label="Sort by"
          select
          fullWidth
          size="small"
          value={params.sort ?? DEFAULT_SORT}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
}
