import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { Autocomplete, Chip, TextField } from '@sinnapi/ui';
import type { SelectOption } from '../../schema';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  disabled?: boolean;
};

/**
 * Multi-select for role assignment, bound to a `string[]` of role ids through
 * Controller. Options are the assignable staff roles; the field stores ids while
 * the Autocomplete works in option objects, so we map between the two at the
 * edges.
 */
export default function RoleMultiSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  disabled,
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedIds: string[] = Array.isArray(field.value) ? field.value : [];
        const selected = options.filter((o) => selectedIds.includes(o.value));
        return (
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={options}
            value={selected}
            disabled={disabled}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(o, v) => o.value === v.value}
            onChange={(_, next) => field.onChange(next.map((o) => o.value))}
            onBlur={field.onBlur}
            renderTags={(value, getTagProps) =>
              value.map((o, index) => {
                const { key, ...chipProps } = getTagProps({ index });
                return <Chip key={key} size="small" label={o.label} {...chipProps} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={label}
                placeholder={selected.length ? undefined : 'Select one or more roles'}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
        );
      }}
    />
  );
}
