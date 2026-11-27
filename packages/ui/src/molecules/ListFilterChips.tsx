'use client';
import { Button, Chip, Stack, Typography } from '@mui/material';
import type { ListFilterState } from '../data/listFilters';
import { formatIsoRange } from './datePicker/formatDate';

type ListFilterChipsProps<K extends string> = {
  list: ListFilterState<K>;
};

/**
 * One removable chip per filter that is folded away in the panel.
 *
 * Inline facets get no chip: their dropdown is already on screen, and a chip
 * repeating it is a second control for one piece of state. What is folded
 * behind the Filters toggle is exactly what someone can forget they set, and
 * "why is this list so thin?" is the question this row answers.
 */
export function ListFilterChips<K extends string>({ list }: ListFilterChipsProps<K>) {
  const { config, values, setFacet, dateRange, setDateRange, clearAll } = list;

  const facetChips = config.facets
    .filter((facet) => !facet.inline && values[facet.key])
    .map((facet) => {
      const value = values[facet.key];
      const label = facet.options.find((option) => option.value === value)?.label ?? value;
      return {
        key: facet.key as string,
        text: `${facet.label}: ${label}`,
        onDelete: () => setFacet(facet.key, ''),
      };
    });

  const dateText = config.dateRange ? formatIsoRange(dateRange) : '';
  const chips = dateText
    ? [
        ...facetChips,
        {
          key: '__date',
          text: `${config.dateRange!.label}: ${dateText}`,
          onDelete: () => setDateRange({ from: '', to: '' }),
        },
      ]
    : facetChips;

  if (chips.length === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ mt: 1.5 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Filtered by
      </Typography>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          size="small"
          variant="outlined"
          label={chip.text}
          onDelete={chip.onDelete}
          aria-label={`Remove filter ${chip.text}`}
        />
      ))}
      {chips.length > 1 && (
        <Button size="small" color="inherit" onClick={clearAll} sx={{ minHeight: 0, py: 0.25 }}>
          Clear all
        </Button>
      )}
    </Stack>
  );
}
