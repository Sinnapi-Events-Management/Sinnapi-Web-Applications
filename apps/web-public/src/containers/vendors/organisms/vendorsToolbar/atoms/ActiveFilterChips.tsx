'use client';
import { Chip, Stack } from '@sinnapi/ui/atoms';
import {
  CATEGORY_OPTIONS,
  REGION_OPTIONS,
  PRICE_OPTIONS,
  RATING_OPTIONS,
} from '../../../utils/options';
import type { FacetKey, VendorsSearchParams } from '../../../utils/searchParams';

/** Label lookup per facet, so a chip reads "Kampala" rather than "kampala". */
const LABELS: Record<FacetKey, Record<string, string>> = {
  category: Object.fromEntries(CATEGORY_OPTIONS.map((o) => [o.value, o.label])),
  region: Object.fromEntries(REGION_OPTIONS.map((o) => [o.value, o.label])),
  price: Object.fromEntries(PRICE_OPTIONS.map((o) => [o.value, o.label])),
  rating: Object.fromEntries(RATING_OPTIONS.map((o) => [o.value, o.label])),
};

const FACET_ORDER: FacetKey[] = ['category', 'region', 'price', 'rating'];

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
  params: VendorsSearchParams;
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
