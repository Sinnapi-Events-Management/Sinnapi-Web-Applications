'use client';
import { TextField, MenuItem } from '@sinnapi/ui/atoms';
import type { FilterOption } from '@/lib/types';

type FacetSelectProps = {
  label: string;
  allLabel: string;
  options: FilterOption[];
  value?: string;
  /** Result count per option value. Omit entirely for facets that aren't counted. */
  counts?: Record<string, number>;
  onChange: (value: string) => void;
};

/**
 * A single filter dropdown, shared by the vendors and events grids — the two
 * browse experiences differ in what they filter, not in how a facet behaves.
 *
 * Applies the moment it changes — there is no Apply button, because the query
 * behind it is a cache lookup rather than a page load.
 *
 * When `counts` are supplied, each option carries the number of results it would
 * return and options with none are disabled: the visitor can see where the
 * catalogue is thin before spending a click on an empty grid. Counts come from a
 * facet-count RPC that releases this facet's own selection, so the numbers stay
 * stable as they browse across options rather than collapsing to "the one I
 * already picked".
 *
 * A currently-selected option is never disabled even at zero — otherwise a
 * filter combination that yields nothing would trap the visitor on a value they
 * can no longer change.
 */
export default function FacetSelect({
  label,
  allLabel,
  options,
  value = '',
  counts,
  onChange,
}: FacetSelectProps) {
  return (
    <TextField
      label={label}
      select
      fullWidth
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((option) => {
        const count = counts?.[option.value] ?? 0;
        const isEmpty = counts != null && count === 0;
        return (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={isEmpty && option.value !== value}
          >
            {counts ? `${option.label} (${count})` : option.label}
          </MenuItem>
        );
      })}
    </TextField>
  );
}
