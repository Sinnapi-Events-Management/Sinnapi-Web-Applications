import { TextField } from '@sinnapi/ui/atoms';
import { Autocomplete } from '@sinnapi/ui/molecules';
import type { ReferenceOption } from '@/lib/queries';

type Props = {
  id: string;
  categories: ReferenceOption[];
  value: string[];
  error?: string;
  disabled?: boolean;
  onChange: (keys: string[]) => void;
};

/** Searchable multi-select of the service categories a vendor offers, shown as chips. */
export default function ServicesField({ id, categories, value, error, disabled, onChange }: Props) {
  const names = new Map(categories.map((c) => [c.key, c.name]));

  return (
    <Autocomplete
      id={id}
      multiple
      disableCloseOnSelect
      filterSelectedOptions
      disabled={disabled}
      options={categories.map((c) => c.key)}
      value={value}
      onChange={(_, keys) => onChange(keys)}
      getOptionLabel={(key) => names.get(key) ?? key}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Services you offer"
          placeholder={value.length ? undefined : 'Search or pick all that apply'}
          required
          error={!!error}
          helperText={error ?? 'Pick every service you provide.'}
        />
      )}
    />
  );
}
