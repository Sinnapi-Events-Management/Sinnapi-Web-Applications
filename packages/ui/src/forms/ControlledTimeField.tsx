'use client';
/**
 * `TimeField` bound to react-hook-form. The `HH:mm` value goes straight into a
 * Postgres `time` column, so the form's schema needs no transform step.
 */
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { TimeField, type TimeFieldProps } from '../molecules/datePicker';
import { useFieldError } from './useFieldError';

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
  const { field, fieldState, formState } = useController({ name, control });
  const { error, onEngage } = useFieldError(fieldState, formState);

  return (
    <TimeField
      {...rest}
      name={field.name}
      value={field.value ?? ''}
      onChange={(next) => {
        onEngage();
        field.onChange(next);
      }}
      onBlur={field.onBlur}
      error={error}
    />
  );
}
