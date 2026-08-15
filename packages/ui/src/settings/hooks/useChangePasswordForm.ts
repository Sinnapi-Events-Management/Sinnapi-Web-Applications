'use client';
import { useCallback, useMemo, useState } from 'react';
import { useZodForm } from '../../forms/useZodForm';
import {
  createChangePasswordSchema,
  emptyChangePasswordFormValues,
  type ChangePasswordFormValues,
} from '../schema/changePassword';
import type { ChangePasswordHandler } from '../types';
import { errorMessage } from './useAsyncAction';

export type UseChangePasswordFormOptions = {
  minLength: number;
  onSubmit: ChangePasswordHandler;
  /** Called once the write succeeded — the dialog uses it to close itself. */
  onSuccess?: () => void;
};

export type ChangePasswordFormState = ReturnType<typeof useChangePasswordForm>;

/**
 * All the state behind the change-password dialog: validation, the write, and
 * the failure that write can produce.
 *
 * The submit error is held here rather than pushed onto a form field because
 * the two failures it represents belong in different places. A rejected current
 * password is about a field the user can fix, so it is set on `currentPassword`
 * and renders under that box; anything else (network, GoTrue policy, a session
 * that expired mid-dialog) is not attributable to any one input and renders as
 * a banner. Sending both to a banner would leave the commonest mistake — a
 * mistyped current password — pointing at nothing in particular.
 */
export function useChangePasswordForm({
  minLength,
  onSubmit,
  onSuccess,
}: UseChangePasswordFormOptions) {
  const schema = useMemo(() => createChangePasswordSchema(minLength), [minLength]);
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm<ChangePasswordFormValues>(schema, {
    defaultValues: emptyChangePasswordFormValues,
  });
  const {
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
    watch,
    formState: { isSubmitting },
  } = form;

  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await onSubmit({
        currentPassword: values.currentPassword,
        newPassword: values.password,
      });
    } catch (cause) {
      const message = errorMessage(cause);
      if (isCurrentPasswordRejection(message)) {
        setFieldError('currentPassword', { type: 'server', message });
      } else {
        setError(message);
      }
      return;
    }
    reset(emptyChangePasswordFormValues);
    onSuccess?.();
  });

  /** Clears both the fields and the banner — used when the dialog is dismissed. */
  const clear = useCallback(() => {
    reset(emptyChangePasswordFormValues);
    setError(null);
  }, [reset]);

  return {
    control,
    error,
    submitting: isSubmitting,
    submit,
    clear,
    /** Live value of the new-password box, for the strength meter. */
    newPassword: watch('password'),
  };
}

/**
 * Does this failure belong under the current-password box?
 *
 * Matched on our own handlers' wording, which is fixed by
 * `CURRENT_PASSWORD_REJECTED` in each portal's account API — not on GoTrue's,
 * which we do not control and which changes between releases.
 */
function isCurrentPasswordRejection(message: string): boolean {
  return /current password/i.test(message);
}
