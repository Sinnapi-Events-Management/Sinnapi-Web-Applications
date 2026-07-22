'use client';
import { Grid, TextField, MenuItem } from '@sinnapi/ui/atoms';
import type { VendorFacetCounts } from '@/lib/types';
import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  PRICE_OPTIONS,
  RATING_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_SORT,
} from '../../../utils/options';
import type { FacetKey, VendorsSearchParams } from '../../../utils/searchParams';
import FacetSelect from '@/components/molecules/facetSelect';

type ToolbarFacetsProps = {
  params: VendorsSearchParams;
  facetCounts?: VendorFacetCounts;
  onFacetChange: (key: FacetKey, value: string) => void;
  onSortChange: (value: string) => void;
};

/**
 * The control row: four narrowing facets plus the sort order.
 *
 * Only category and region carry counts — they map to discrete reference tables
 * the RPC can group by. Price and rating are continuous bands, where counting
 * every option costs a scan per band for a number that changes as vendors
 * re-price; they're left uncounted rather than shown stale.
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
      <Grid item xs={6} md={3}>
        <FacetSelect
          label="Category"
          allLabel="All categories"
          options={CATEGORY_OPTIONS}
          value={params.category}
          counts={facetCounts?.category}
          onChange={(value) => onFacetChange('category', value)}
        />
      </Grid>
      <Grid item xs={6} md={3}>
        <FacetSelect
          label="Region"
          allLabel="All regions"
          options={REGION_OPTIONS}
          value={params.region}
          counts={facetCounts?.region}
          onChange={(value) => onFacetChange('region', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="Price"
          allLabel="Any price"
          options={PRICE_OPTIONS}
          value={params.price}
          onChange={(value) => onFacetChange('price', value)}
        />
      </Grid>
      <Grid item xs={6} md={2}>
        <FacetSelect
          label="Rating"
          allLabel="Any rating"
          options={RATING_OPTIONS}
          value={params.rating}
          onChange={(value) => onFacetChange('rating', value)}
        />
      </Grid>
      <Grid item xs={12} md={2}>
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
