import { useMemo } from 'react';
import type { FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';
import { useZodForm } from '@sinnapi/ui/forms';
import { useVendorPatch } from './useVendorPatch';

/**
 * A wizard step that edits `vendors` columns: the form, the write, and the
 * hand-off to the next step.
 *
 * Every column-editing step is the same three things with a different schema, so
 * they share this rather than each growing its own hook.
 *
 * The `useMemo` is not an optimisation. `useZodForm` is given `values`, which it
 * tracks so a background refetch reaches the fields — a fresh object every render
 * would reset whatever the vendor was typing mid-step. Projecting the row here
 * rather than at each call site is what stops that from being something every
 * step has to remember; `toValues` must be module-level (stable) for it to hold.
 */
export function useStepForm<S, T extends FieldValues>(
  vendorId: string,
  schema: ZodType<T>,
  source: S,
  toValues: (source: S) => T,
  toPatch: (values: T) => Record<string, unknown>,
  onSaved: () => void,
) {
  const patch = useVendorPatch(vendorId);
  const values = useMemo(() => toValues(source), [source, toValues]);
  const form = useZodForm(schema, { values });

  const submit = form.handleSubmit(async (next) => {
    await patch.mutateAsync(toPatch(next));
    onSaved();
  });

  return {
    control: form.control,
    submit,
    saving: patch.isPending,
    // A `useMutation` error is `unknown`; narrowing it is this hook's job, not
    // the step component's.
    error: patch.error ? ((patch.error as Error).message ?? 'Could not save.') : null,
  };
}
