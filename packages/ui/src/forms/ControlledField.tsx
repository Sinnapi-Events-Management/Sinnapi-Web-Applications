'use client';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { MenuItem } from '@mui/material';
import { FormField, type FormFieldProps } from '../molecules/FormField';

/** One entry in a select-style `ControlledField`. */
export type SelectOption = { value: string; label: string };

export type ControlledFieldProps<T extends FieldValues> = Omit<
  FormFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'select' | 'children'
> & {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  /** Supplying options turns the field into a select. */
  options?: SelectOption[];
};

/**
 * A `FormField` bound to react-hook-form through `Controller`.
 *
 * `Controller` rather than `register`: FormField forwards its ref to MUI's root
 * element, not the inner input, so a registered field would never show its
 * pre-populated value. Passing `value` explicitly sidesteps that.
 *
 * The `onBlur` that `field` carries is what triggers validation — it is spread
 * onto the input, so a field only has to be rendered through this component to
 * pick up the blur behaviour. `fieldState.error` then renders as helper text.
 */
export function ControlledField<T extends FieldValues>({
  name,
  control,
  options,
  ...rest
}: ControlledFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField
          {...field}
          value={field.value ?? ''}
          select={!!options}
          fullWidth
          error={fieldState.error?.message}
          {...rest}
        >
          {options?.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </FormField>
      )}
    />
  );
}
