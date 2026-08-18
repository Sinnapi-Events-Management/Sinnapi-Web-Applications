'use client';
import { useCallback, useState } from 'react';
import { DELETION_CONFIRM_PHRASE, DELETION_REASON_MAX } from '../schema/deletionRequest';
import type { RequestDeletionHandler } from '../types';
import { useAsyncAction } from './useAsyncAction';

export type UseDeletionRequestFormOptions = {
  onSubmit: RequestDeletionHandler;
  /** Called once the request is recorded — the dialog uses it to close itself. */
  onSuccess?: () => void;
};

export type DeletionRequestFormState = ReturnType<typeof useDeletionRequestForm>;

/**
 * State for the erasure-request dialog: an optional reason, and the typed
 * confirmation that arms the submit.
 *
 * Type-to-confirm rather than a plain "are you sure", because this is the one
 * control on the settings page whose consequence the user cannot undo
 * themselves — the request goes into a compliance queue, and withdrawing it
 * means talking to a human. The friction is the point: a misclick should not be
 * able to reach it.
 *
 * Not a zod form, deliberately. There is one free-text field with no rule
 * beyond a length cap and one literal-match box, so a resolver, a schema and a
 * controller per field would be more machinery than the screen has decisions.
 */
export function useDeletionRequestForm({ onSubmit, onSuccess }: UseDeletionRequestFormOptions) {
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const action = useAsyncAction(
    useCallback(async () => {
      await onSubmit(reason.trim());
    }, [onSubmit, reason]),
    {
      // Emptying the fields on success is not tidiness — the dialog stays
      // mounted when it closes, so without this it reopens with the reason
      // still typed and the confirmation box still reading DELETE. The next
      // open would present an already-armed destructive button, which is
      // precisely what type-to-confirm exists to prevent.
      onSuccess: useCallback(() => {
        setReason('');
        setConfirmation('');
        onSuccess?.();
      }, [onSuccess]),
    },
  );

  const confirmed = confirmation.trim().toUpperCase() === DELETION_CONFIRM_PHRASE;

  /** Wipes the dialog back to its opening state, including any failure shown. */
  const clear = useCallback(() => {
    setReason('');
    setConfirmation('');
    action.reset();
  }, [action]);

  return {
    reason,
    setReason: useCallback((next: string) => setReason(next.slice(0, DELETION_REASON_MAX)), []),
    reasonLimit: DELETION_REASON_MAX,
    confirmation,
    setConfirmation,
    confirmed,
    submit: action.run,
    submitting: action.busy,
    error: action.error,
    clear,
  };
}
