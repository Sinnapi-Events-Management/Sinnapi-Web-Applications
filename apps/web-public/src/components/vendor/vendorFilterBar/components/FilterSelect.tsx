import { TextField, MenuItem } from '@sinnapi/ui';
import type { FilterOption } from '../data/options';

type FilterSelectProps = {
  name: string;
  label: string;
  allLabel: string;
  options: FilterOption[];
  defaultValue?: string;
};

/**
 * Presentational native <select> used inside the server-rendered filter form.
 * Renders an "all" option followed by the supplied option list.
 */
export default function FilterSelect({
  name,
  label,
  allLabel,
  options,
  defaultValue,
}: FilterSelectProps) {
  return (
    <TextField name={name} label={label} select defaultValue={defaultValue ?? ''} size="small">
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
