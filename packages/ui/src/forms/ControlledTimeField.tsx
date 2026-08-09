'use client';
/**
 * `TimeField` bound to react-hook-form. The `HH:mm` value goes straight into a
 * Postgres `time` column, so the form's schema needs no transform step.
 */
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { TimeField, type TimeFieldProps } from '../molecules/datePicker';

export type ControlledTimeFieldProps<T extends FieldValues> = Omit<
  TimeFieldProps,
  'value' | 'onChange' | 'onBlur' | 'error' | 'name'
> & {
  name: FieldPath<T>;
  control: Control<T>;
};

export function ControlledTimeField<T extends FieldValues>({
  name,
  control,
  ...rest
}: ControlledTimeFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TimeField
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
