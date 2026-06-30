import { TextField, MenuItem } from '@sinnapi/ui';

export type FilterOption = { value: string; label: string };

type FilterSelectProps = {
  name: string;
  label: string;
  allLabel: string;
  options: FilterOption[];
  defaultValue?: string;
};

/**
 * Presentational native <select> for the server-rendered filter forms (vendors,
 * events). Renders an "all" option followed by the supplied list. Pure Server
 * Component — works without client JS and submits as part of its parent GET form.
 */
export default function FilterSelect({
  name,
  label,
  allLabel,
  options,
  defaultValue,
}: FilterSelectProps) {
  return (
    <TextField
      name={name}
      label={label}
      select
      fullWidth
      defaultValue={defaultValue ?? ''}
      size="small"
    >
      <MenuItem value="">{allLabel}</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
