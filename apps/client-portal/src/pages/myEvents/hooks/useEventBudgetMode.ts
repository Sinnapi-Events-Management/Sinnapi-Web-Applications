import { useCallback, useState } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

/**
 * Whether the budget is being stated as one figure or as a range.
 *
 * A presentation decision, not a stored one: the columns are the same either
 * way, and the mode is simply which of them the client is being shown. It is
 * derived from what the event already carries, so an event saved with a floor
 * reopens as a range rather than silently hiding half of what the client said.
 *
 * Collapsing back to a single figure clears the lower field. Leaving it set but
 * hidden would submit a floor the client can no longer see — the worst kind of
 * form state, because the value they cannot see is the one they would have to
 * change to fix the error the field they can see is showing.
 *
 * Owning this here rather than in the fields component keeps that reasoning out
 * of the layout, and lets a caller drive the mode itself if it ever needs to.
 */
export function useEventBudgetMode<T extends FieldValues>(control: Control<T>) {
  // The controller is here only to write the field, not to render it — the
  // fields component renders `budget_min` through its own `ControlledField`.
  // Two subscriptions to one field is how react-hook-form expects a field to be
  // shared, and it is cheaper than threading `setValue` through every caller.
  const { field } = useController({ name: 'budget_min' as FieldPath<T>, control });
  const currentMin = String(field.value ?? '');

  const [isRange, setIsRange] = useState(() => currentMin !== '');

  const setRange = useCallback(
    (next: boolean) => {
      if (!next) field.onChange('');
      setIsRange(next);
    },
    [field],
  );

  return {
    /** True while both ends of the budget are on screen. */
    isRange,
    setRange,
    toggle: useCallback(() => setRange(!isRange), [isRange, setRange]),
  };
}
