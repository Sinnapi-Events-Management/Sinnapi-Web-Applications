import { Stack, Chip } from '@sinnapi/ui';
import {
  FACET_KEYS,
  FACET_LABELS,
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
};

/**
 * The facets currently narrowing the feed, each removable on its own.
 *
 * The dropdown row states what *can* be filtered; these state what *is* — which
 * matters most on mobile, where six controls collapse into a stacked column and
 * a vendor can otherwise forget why the feed looks so thin. Removing one filter
 * without touching the rest is the common correction, and "Clear" can't express
 * it.
 */
export default function ActiveFilterChips({
  values,
  typeOptions,
  onRemove,
}: ActiveFilterChipsProps) {
  const active = FACET_KEYS.filter((key) => values[key]);
  if (active.length === 0) return null;

  // Falls back to the raw token if the occasions haven't landed yet, which is
  // the same fallback an unrecognised value in any other facet already gets.
  const options = facetOptions(typeOptions);

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
