import { TextField, MenuItem } from '@sinnapi/ui';
import type { FilterOption } from '../../schema/filters';

type FacetSelectProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: FilterOption[];
  /**
   * How many vendors each option would yield under the *other* active filters.
   * Omit for facets the server doesn't count (price, rating) and the options
   * render plain and fully enabled.
   */
  counts?: Record<string, number>;
  /** Copy for the "no constraint" entry. */
  anyLabel?: string;
  /**
   * Drop the "no constraint" entry, for a control that always holds a value —
   * sort has a default order, not an absent one.
   */
  hideAnyOption?: boolean;
  disabled?: boolean;
};

/**
 * One filter dropdown, optionally annotated with result counts.
 *
 * The counts are the difference between a filter bar a client explores and one
 * that keeps dead-ending them in an empty grid: an option that would return
 * nothing says so and can't be picked. The currently-selected option is never
 * disabled, even at zero — locking a client out of the control they'd need to
 * undo their own selection is worse than showing an empty grid.
 */
export default function FacetSelect({
  label,
  value,
  onChange,
  options,
  counts,
  anyLabel = 'Any',
  hideAnyOption = false,
  disabled = false,
}: FacetSelectProps) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      fullWidth
    >
      {!hideAnyOption && <MenuItem value="">{anyLabel}</MenuItem>}
      {options.map((option) => {
        const count = counts?.[option.value] ?? (counts ? 0 : undefined);
        return (
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={count === 0 && option.value !== value}
          >
            {count === undefined ? option.label : `${option.label} (${count})`}
          </MenuItem>
        );
      })}
    </TextField>
  );
}
