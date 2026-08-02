import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { FormField, MenuItem, type FormFieldProps } from '@sinnapi/ui';
import type { SelectOption } from '../../schema';

type Props<T extends FieldValues> = Omit<
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
 * A `FormField` bound to react-hook-form through Controller.
 *
 * Controller rather than `register`: FormField forwards refs to MUI's root
 * element, not the inner input, so a registered field would never show its
 * pre-populated value. Passing `value` explicitly sidesteps that.
 */
export default function ControlledField<T extends FieldValues>({
  name,
  control,
  options,
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
