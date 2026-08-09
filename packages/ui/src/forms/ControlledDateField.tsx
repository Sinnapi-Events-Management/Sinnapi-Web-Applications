'use client';
/**
 * `DateField` bound to react-hook-form — the drop-in replacement for
 * `<ControlledField type="date" />`.
 *
 * `Controller` rather than `register`, for the same reason `ControlledField`
 * uses it: the picker is a controlled component whose value is a formatted
 * string, and a registered ref would never reach the underlying input.
 *
 * Validation is triggered by the picker closing rather than by a DOM blur —
 * focus enters the calendar the instant the field is clicked, so a real blur
 * would mark the field touched before anyone had chosen anything.
 */
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { DateField, type DateFieldProps } from '../molecules/datePicker';

export type ControlledDateFieldProps<T extends FieldValues> = Omit<
  DateFieldProps,
  'value' | 'onChange' | 'onBlur' | 'error' | 'name'
> & {
  name: FieldPath<T>;
  control: Control<T>;
};

export function ControlledDateField<T extends FieldValues>({
  name,
  control,
  ...rest
}: ControlledDateFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <DateField
          {...rest}
          name={field.name}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
