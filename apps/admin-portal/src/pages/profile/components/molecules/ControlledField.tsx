import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FormField, type FormFieldProps } from '@sinnapi/ui';

type Props<T extends FieldValues> = Omit<
  FormFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error'
> & {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
};

/**
 * A `FormField` bound to react-hook-form through Controller.
 *
 * Controller rather than `register` on purpose: `register` drives an uncontrolled
 * input by assigning to its ref, but FormField forwards refs to MUI's root
 * element rather than the inner input, so a registered field would never show its
 * pre-populated value. Passing `value` explicitly sidesteps that entirely.
 */
export default function ControlledField<T extends FieldValues>({
  name,
  control,
  ...rest
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField
          {...field}
          value={field.value ?? ''}
          fullWidth
          error={fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}
