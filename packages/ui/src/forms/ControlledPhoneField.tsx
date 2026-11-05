'use client';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { PhoneField, type PhoneFieldProps } from '../phone/PhoneField';
import { phoneProblem } from '../phone/phone';
import { useFieldError } from './useFieldError';

/**
 * The zod rule for a phone field. Every form with a phone uses this, so every
 * portal accepts exactly what `profiles.phone_e164` (and WhatsApp) accepts.
 * Optional by default: '' passes, anything else must be a valid international
 * number.
 */
export const phoneSchema = (opts: { required?: boolean } = {}) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const problem = phoneProblem(value, opts.required);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    });

export type ControlledPhoneFieldProps<T extends FieldValues> = Omit<
  PhoneFieldProps,
  'value' | 'onChange' | 'onBlur' | 'error'
> & {
  name: FieldPath<T>;
  control: Control<T>;
};

/** `PhoneField` bound to react-hook-form. Pair with `phoneSchema()`. */
export function ControlledPhoneField<T extends FieldValues>({
  name,
  control,
  ...rest
}: ControlledPhoneFieldProps<T>) {
  const { field, fieldState, formState } = useController({ name, control });
  const { error, onEngage } = useFieldError(fieldState, formState);

  return (
    <PhoneField
      {...rest}
      name={field.name}
      value={(field.value as string | null | undefined) ?? ''}
      onChange={(value) => {
        onEngage();
        field.onChange(value);
      }}
      onBlur={field.onBlur}
      error={error}
    />
  );
}
