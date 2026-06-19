'use client';
import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

export type FormFieldProps = Omit<TextFieldProps, 'error'> & {
  /** Error message string. When set, the field renders in the error state and
   *  shows the message as helper text (overriding `helperText`). */
  error?: string | boolean | null;
};

/**
 * Form-row convenience over TextField: pass a string `error` and it wires both
 * the error state and helper text. Plays well with react-hook-form:
 *   <FormField error={errors.email?.message} {...register("email")} />
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  { error, helperText, ...rest },
  ref,
) {
  const hasError = Boolean(error);
  const message = typeof error === 'string' ? error : helperText;
  return <TextField ref={ref} error={hasError} helperText={message} {...rest} />;
});
