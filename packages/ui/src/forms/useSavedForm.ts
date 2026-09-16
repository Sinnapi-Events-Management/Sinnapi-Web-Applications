import type { FieldErrors, FieldValues } from 'react-hook-form';
import type { ZodType } from 'zod';
import { useZodForm } from './useZodForm';

/**
 * A form that edits a record and re-baselines itself against what was saved.
 *
 * The pattern every "edit this and press Save" card in the portals needs, and the
 * two halves of it that are easy to get wrong:
 *
 * - `values` (not `defaultValues`) keeps the fields in step with the query behind
 *   them, so a background refetch populates the form without a manual reset. This
 *   requires `values` to be referentially stable per record revision — a fresh
 *   object every render would reset the fields mid-typing.
 * - `reset(v)` runs only when `onSave` resolves true, which returns the form to
 *   clean and disables Save again. A failed save deliberately keeps both the edits
 *   and the dirty state, because silently reverting what someone typed is the
 *   worst possible response to a write that didn't land.
 *
 * `onSave` returns a boolean rather than throwing so the caller's own busy/error
 * state stays where it belongs — in the hook that owns the write.
 *
 * `save` is `submit` for callers that are not a `<form>` handler — a sticky save
 * bar committing several writes, say — and need to know how it went: it resolves
 * false on a validation failure as well as a failed write. `dirtyFields` and
 * `errors` let a sectioned form mark which of its sections holds edits or
 * mistakes, since the field that failed may be on a panel that isn't showing.
 */
export function useSavedForm<T extends FieldValues>(
  schema: ZodType<T>,
  values: T,
  onSave: (values: T) => Promise<boolean>,
) {
  const {
    control,
    reset,
    formState: { isDirty, dirtyFields, errors },
    handleSubmit,
  } = useZodForm(schema, { values });

  const commit = async (v: T) => {
    const ok = await onSave(v);
    if (ok) reset(v);
    return ok;
  };

  return {
    control,
    isDirty,
    dirtyFields,
    errors,
    /** Discards edits and returns to the last saved values. */
    revert: () => reset(values),
    submit: handleSubmit(async (v) => {
      await commit(v);
    }),
    /**
     * Validates and saves; resolves whether the record was actually written.
     * `onInvalid` receives the failing fields, so the caller can show them.
     */
    save: (onInvalid?: (errors: FieldErrors<T>) => void) =>
      new Promise<boolean>((resolve) => {
        void handleSubmit(
          async (v) => resolve(await commit(v)),
          (invalid) => {
            onInvalid?.(invalid);
            resolve(false);
          },
        )();
      }),
  };
}
