import { Stack, Chip } from '@sinnapi/ui';
import { FACET_KEYS, FACET_LABELS, type FacetKey, type FacetValues } from '../../schema/filters';
import type { FilterOption } from '../../schema/filters';

type ActiveFilterChipsProps = {
  values: FacetValues;
  /** Option lists per facet, used to turn a stored token back into its label. */
  options: Record<FacetKey, FilterOption[]>;
  onRemove: (key: FacetKey, value: string) => void;
};

/**
 * The facets currently narrowing the grid, each removable on its own.
 *
 * A dropdown row states what *can* be filtered; these state what *is* — which
 * matters most on mobile, where the controls collapse behind a stacked column
 * and a client can otherwise forget why the grid looks so thin. Removing one
 * filter without touching the rest is the common correction, and "Clear all"
 * can't express it.
 */
export default function ActiveFilterChips({ values, options, onRemove }: ActiveFilterChipsProps) {
  const active = FACET_KEYS.filter((key) => values[key]);
  if (active.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
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
          />
        );
      })}
    </Stack>
  );
}
