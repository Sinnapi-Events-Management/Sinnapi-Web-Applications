import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  emptyPasswordValues,
  passwordFormSchema,
  passwordScore,
  type PasswordFormValues,
} from '../schema';

/**
 * Wires the change-password form and the affordances around it: the single
 * show/hide toggle that governs all three fields, and the live score that feeds
 * the strength meter.
 *
 * Validation runs `onChange` here — unlike the profile form — because the rules
 * are only useful while the password is being typed; finding out on submit that
 * it needed a digit is the failure this avoids.
 */
export function usePasswordForm(onSubmit: (values: PasswordFormValues) => Promise<boolean>) {
  const [visible, setVisible] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, isDirty },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: emptyPasswordValues,
    mode: 'onChange',
  });

  const password = useWatch({ control, name: 'password' }) ?? '';

  return {
    control,
    visible,
    toggleVisible: () => setVisible((v) => !v),
    password,
    score: passwordScore(password),
    canSubmit: isValid && isDirty,
    submit: handleSubmit(async (values) => {
      // Clear the fields on success — leaving a password sitting in the DOM
      // after the change has landed serves no purpose.
      if (await onSubmit(values)) reset(emptyPasswordValues);
    }),
  };
}
