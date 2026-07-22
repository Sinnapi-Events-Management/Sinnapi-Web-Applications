'use client';
import { Chip, Stack } from '@sinnapi/ui/atoms';
import {
  EVENT_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  LOCATION_OPTIONS,
  WHEN_OPTIONS,
  BUDGET_OPTIONS,
} from '../../../utils/options';
import type { FacetKey, EventsSearchParams } from '../../../utils/searchParams';

/** Label lookup per facet, so a chip reads "Baby Shower" rather than "baby_shower". */
const LABELS: Record<FacetKey, Record<string, string>> = {
  type: Object.fromEntries(EVENT_TYPE_OPTIONS.map((o) => [o.value, o.label])),
  source: Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.value, o.label])),
  location: Object.fromEntries(LOCATION_OPTIONS.map((o) => [o.value, o.label])),
  when: Object.fromEntries(WHEN_OPTIONS.map((o) => [o.value, o.label])),
  budget: Object.fromEntries(BUDGET_OPTIONS.map((o) => [o.value, o.label])),
};

/** Reading order of the chips — matches the dropdown order in `ToolbarFacets`. */
const FACET_ORDER: FacetKey[] = ['type', 'when', 'location', 'source', 'budget'];

/**
 * What's currently narrowing the grid, as individually removable chips.
 *
 * The dropdowns already show their own value, so this exists for the one thing
 * they can't do: undo a single decision. Without it, a visitor four filters deep
 * who wants to widen slightly has to remember which control holds which value —
 * or nuke everything with Clear and start over.
 */
export default function ActiveFilterChips({
  params,
  onRemove,
}: {
  params: EventsSearchParams;
  onRemove: (key: FacetKey | 'q') => void;
}) {
  const chips: { key: FacetKey | 'q'; label: string }[] = [];
  if (params.q) chips.push({ key: 'q', label: `“${params.q}”` });
  for (const key of FACET_ORDER) {
    const value = params[key];
    if (value) chips.push({ key, label: LABELS[key][value] ?? value });
  }

  if (chips.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          size="small"
          color="primary"
          variant="outlined"
          onDelete={() => onRemove(chip.key)}
          // The visible label can be a bare value like "Kampala"; the accessible
          // name has to say what deleting it actually does.
          aria-label={`Remove filter ${chip.label}`}
          sx={{ fontWeight: 600 }}
        />
      ))}
    </Stack>
  );
}
