import { Button, Chip, Stack, Typography } from '@sinnapi/ui';
import {
  FACET_LABELS,
  PANEL_FACET_KEYS,
  facetOptions,
  type FacetKey,
  type FacetValues,
  type FilterOption,
} from '../../schema/filters';

type ActiveFilterChipsProps = {
  values: FacetValues;
  /** Occasions from `event_types`, so a chip can name the one in the URL. */
  typeOptions: FilterOption[];
  onRemove: (key: FacetKey, value: string) => void;
  /** Clears the facets and the search term in one go. */
  onClearAll: () => void;
};

/**
 * The facets currently narrowing the feed, each removable on its own.
 *
 * This is what makes folding the dropdowns away safe. The panel states what
 * *can* be filtered; these state what *is* — and once the controls live behind
 * a toggle, they are the only thing standing between a vendor and the question
 * "why is this feed so thin?". Removing one filter without touching the rest is
 * the common correction, and "Clear all" can't express it.
 */
export default function ActiveFilterChips({
  values,
  typeOptions,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps) {
  // `PANEL_FACET_KEYS` excludes source: it is the tab bar now, and a chip
  // repeating the open tab is a second control for one piece of state.
  const active = PANEL_FACET_KEYS.filter((key) => values[key]);
  if (active.length === 0) return null;

  // Falls back to the raw token if the occasions haven't landed yet, which is
  // the same fallback an unrecognised value in any other facet already gets.
  const options = facetOptions(typeOptions);

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ mb: 2 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Filtered by
      </Typography>

      {active.map((key) => {
        const value = values[key];
        const label = options[key].find((option) => option.value === value)?.label ?? value;
        return (
          <Chip
            key={key}
            size="small"
            variant="outlined"
            label={`${FACET_LABELS[key]}: ${label}`}
            onDelete={() => onRemove(key, '')}
            // Names the facet as well as its value, so a screen reader moving
            // through the row hears "Occasion: Wedding" rather than five chips
            // that differ only in the half it reads last.
            aria-label={`Remove filter ${FACET_LABELS[key]}: ${label}`}
          />
        );
      })}

      {active.length > 1 && (
        <Button size="small" color="inherit" onClick={onClearAll} sx={{ minHeight: 0, py: 0.25 }}>
          Clear all
        </Button>
      )}
    </Stack>
  );
}
