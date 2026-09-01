'use client';
import { useCallback, useState } from 'react';
import type { ControllerFieldState } from 'react-hook-form';

/** A field's message, plus the callback that decides when it may be shown. */
export type FieldErrorBinding = {
  /**
   * The validation message to render, or `undefined` while the user has not
   * yet engaged with this field and has not tried to submit.
   */
  error: string | undefined;
  /** Call from the control's own change handler. */
  onEngage: () => void;
};

/**
 * When a field is allowed to complain.
 *
 * WHY THIS EXISTS
 * `useZodForm` validates on blur, which is the right moment — but only when
 * the blur came from the user. It does not always. A field with `autoFocus`
 * inside a MUI `Dialog` is focused by React at commit and then blurred again
 * a tick later by the modal's own focus trap: under `React.StrictMode` the
 * trap's `[open]` effect mounts, cleans up, and remounts, and its cleanup
 * calls `nodeToRestore.focus()` — which pulls focus back to the button that
 * opened the dialog. React Hook Form sees a blur on an empty field and does
 * exactly what it was told to do.
 *
 * The result was a dialog that opened already accusing the vendor of
 * something ("Service title must be at least 3 characters.") on a field they
 * had not typed in and were not even focused on. Every `autoFocus`ed field in
 * a dialog across the four apps had it.
 *
 * THE RULE
 * A field speaks up once the user has actually put something into it, or once
 * they have tried to submit. Blur-time validation is unchanged for fields
 * they really used — the mistake still surfaces next to the input, in
 * context — and nothing can be hidden past the submit, because `isSubmitted`
 * opens every field at once.
 *
 * ENGAGEMENT IS TRACKED HERE, NOT INFERRED FROM `isDirty`
 * `fieldState.isDirty` compares against the default value, so a vendor who
 * types "ab", blurs into the error, then clears the field would watch the
 * message vanish — the field is back at its default and technically not
 * dirty, while still being exactly as invalid as it was. `isTouched` is worse:
 * the phantom blur sets it. A flag owned by the control is the only one of the
 * three that means "this person interacted with this input".
 */
export function useFieldError(
  fieldState: ControllerFieldState,
  formState: { isSubmitted: boolean },
): FieldErrorBinding {
  const [engaged, setEngaged] = useState(false);
  // React bails out of a re-render when the state is unchanged, so calling
  // this on every keystroke costs one render on the first one and nothing
  // afterwards.
  const onEngage = useCallback(() => setEngaged(true), []);

  return {
    error: engaged || formState.isSubmitted ? fieldState.error?.message : undefined,
    onEngage,
  };
}
