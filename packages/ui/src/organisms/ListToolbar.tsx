'use client';
import { useState } from 'react';
import { Box, Button, Paper, Stack } from '@mui/material';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import type { ListFacetConfig, ListFacetCounts, ListFilterState } from '../data/listFilters';
import { FacetSelect } from '../molecules/FacetSelect';
import { FilterDisclosure, FilterToggleButton } from '../molecules/FilterDisclosure';
import { ListFilterChips } from '../molecules/ListFilterChips';
import { SearchField } from '../molecules/SearchField';
import { DateRangeField } from '../molecules/datePicker/DateRangeField';

export type ListToolbarProps<K extends string> = {
  /** From `useListFilters(config)`. */
  list: ListFilterState<K>;
  /** From the list's `*_list_facets` RPC. Omit and dropdowns render uncounted. */
  counts?: ListFacetCounts;
  /** Size of the filtered set, for the phone sheet's "Show N results" button. */
  resultCount?: number;
};

/**
 * Search + filters above a server-paginated list. Shared by the vendor and
 * client portals' Bookings and Quotations pages, so the four lists search and
 * filter identically.
 *
 * The search box and the `inline` facet (status) stay on the row: they are used
 * on nearly every visit. Everything else folds into `FilterDisclosure` — an
 * inline expander on a wide screen, a bottom sheet on a phone — with the toggle
 * badging how many are applied and `ListFilterChips` naming each one beneath.
 *
 * A real `<form role="search">` with no submit button: Enter flushes the search
 * debounce, and mobile keyboards only offer a search key inside a form.
 *
 * Every item on the row states its own width. The portal theme defaults
 * `MuiTextField` to `fullWidth`; on a flex row that claims the whole line and
 * squeezes the elastic search box to zero (see OffersToolbar). Only the search
 * box is elastic.
 */
export function ListToolbar<K extends string>({ list, counts, resultCount }: ListToolbarProps<K>) {
  const { config, search, values, setFacet, dateRange, setDateRange, isFiltered } = list;
  const inlineFacets = config.facets.filter((facet) => facet.inline);
  const panelFacets = config.facets.filter((facet) => !facet.inline);
  const panelCount =
    panelFacets.filter((facet) => values[facet.key]).length +
    (dateRange.from || dateRange.to ? 1 : 0);
  const hasPanel = panelFacets.length > 0 || Boolean(config.dateRange);
  const [open, setOpen] = useState(false);

  const facetSelect = (facet: ListFacetConfig<K>) => (
    <FacetSelect
      label={facet.label}
      anyLabel={facet.anyLabel}
      value={values[facet.key]}
      onChange={(next) => setFacet(facet.key, next)}
      options={facet.options}
      counts={counts ? (counts[facet.key] ?? {}) : undefined}
    />
  );

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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <SearchField
            value={search.input}
            onChange={search.setInput}
            onClear={search.clear}
            placeholder={config.searchPlaceholder}
            ariaLabel={config.searchLabel}
            inputProps={{ enterKeyHint: 'search' }}
            // Below the minimum nothing is sent; say so, rather than leave a
            // typed letter looking like a search that found everything.
            helperText={
              search.tooShort ? `Type at least ${search.minLength} characters to search` : undefined
            }
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
          {inlineFacets.map((facet) => (
            <Box
              key={facet.key}
              sx={{ flex: { xs: 1, md: '0 0 auto' }, minWidth: 0, width: { md: 200 } }}
            >
              {facetSelect(facet)}
            </Box>
          ))}
          {hasPanel && (
            <FilterToggleButton
              open={open}
              onToggle={() => setOpen((prev) => !prev)}
              activeCount={panelCount}
              controls={config.id}
            />
          )}
          {isFiltered && (
            <Button
              size="small"
              color="inherit"
              startIcon={<FilterAltOffIcon />}
              onClick={list.clearAll}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Stack>

      {hasPanel && (
        <FilterDisclosure
          id={config.id}
          open={open}
          onClose={() => setOpen(false)}
          activeCount={panelCount}
          onClear={list.clearAll}
          resultCount={resultCount}
        >
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            }}
          >
            {panelFacets.map((facet) => (
              <Box key={facet.key} sx={{ minWidth: 0 }}>
                {facetSelect(facet)}
              </Box>
            ))}
            {config.dateRange && (
              <DateRangeField
                label={config.dateRange.label}
                size="small"
                value={dateRange}
                onChange={setDateRange}
                presets={config.dateRange.presets}
              />
            )}
          </Box>
        </FilterDisclosure>
      )}

      <ListFilterChips list={list} />
    </Paper>
  );
}
