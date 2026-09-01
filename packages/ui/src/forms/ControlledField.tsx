'use client';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { MenuItem } from '@mui/material';
import { FormField, type FormFieldProps } from '../molecules/FormField';
import { useFieldError } from './useFieldError';

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
 * A `FormField` bound to react-hook-form.
 *
 * `useController` rather than `register`: FormField forwards its ref to MUI's
 * root element, not the inner input, so a registered field would never show
 * its pre-populated value. Passing `value` explicitly sidesteps that. It is
 * also `useController` rather than the `Controller` render prop so that
 * `useFieldError` is called from a component body — a hook inside a render
 * callback would attach to `Controller`'s own hook list, which works right up
 * until the day something makes that callback conditional.
 *
 * The `onBlur` that `field` carries is what triggers validation, and
 * `useFieldError` decides when the result of it may be shown. See that hook
 * for why the two are not the same question.
 */
export function ControlledField<T extends FieldValues>({
  name,
  control,
  options,
  ...rest
}: ControlledFieldProps<T>) {
  const { field, fieldState, formState } = useController({ name, control });
  const { error, onEngage } = useFieldError(fieldState, formState);

  return (
    <FormField
      {...field}
      value={field.value ?? ''}
      onChange={(event) => {
        onEngage();
        field.onChange(event);
      }}
      select={!!options}
      fullWidth
      error={error}
      {...rest}
    >
      {options?.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </FormField>
  );
}
