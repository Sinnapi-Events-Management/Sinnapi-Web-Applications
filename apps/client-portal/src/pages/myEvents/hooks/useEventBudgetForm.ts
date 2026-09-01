import { useCallback } from 'react';
import { useWatch } from 'react-hook-form';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { MyEventModel } from '@/lib/types';
import {
  budgetPreviewAmount,
  budgetValuesFromEvent,
  eventBudgetSchema,
  toBudgetColumns,
} from '../schema';

/**
 * Editing the budget of one event.
 *
 * The write is a plain update on `events` rather than an RPC: the budget has no
 * side effects — no booking is re-proposed, no vendor is notified — and the
 * `events_owner_write` policy already scopes it to the row's poster. The
 * payment-terms RPC exists because setting terms *does* reach into bookings;
 * copying that ceremony for three columns would be ceremony for its own sake.
 *
 * `values` rather than `defaultValues` so the form follows the event when it
 * changes underneath an open dialog — a refetch after a save, or another tab.
 * The amount is watched rather than read on submit because the terms comparison
 * beside these fields reprices as the client types: seeing what 20m costs is
 * how a client decides whether 20m is the number, and making them save first
 * would be making them commit to find out.
 */
export function useEventBudgetForm(event: MyEventModel) {
  const {
    control,
    handleSubmit,
    getValues,
    formState: { isDirty },
  } = useZodForm(eventBudgetSchema, { values: budgetValuesFromEvent(event) });

  const [budgetMin = '', budgetMax = '', currency] = useWatch({
    control,
    name: ['budget_min', 'budget_max', 'currency'],
  });

  // Typed figures are debounced before they are priced, the same way the
  // advance-rate control debounces before hitting the same RPC. "20000000" is
  // eight keystrokes and would otherwise be eight round trips for seven answers
  // nobody reads — and on a phone connection the cards would flicker through
  // every prefix of the number on the way to the one the client meant.
  const pricedAmount = useDebouncedValue(
    budgetPreviewAmount({ budget_min: budgetMin, budget_max: budgetMax }),
    350,
  );

  /**
   * Whether the fields are safe to write, and — when they are not — the reason
   * on the field that carries it.
   *
   * `handleSubmit` rather than `trigger`, and the difference matters: every
   * `Controlled*` field keeps its message hidden until the user has engaged
   * with that particular input *or* the form has been submitted. The range rule
   * puts its error on the upper figure while the mistake is usually made on the
   * lower one, so a bare `trigger` could block the save with the explanation
   * still invisible. Submitting opens every field at once, which is exactly the
   * moment this is.
   */
  const validate = useCallback(async (): Promise<boolean> => {
    let ok = false;
    await handleSubmit(() => {
      ok = true;
    })();
    return ok;
  }, [handleSubmit]);

  /** Persists the budget. Returns an error message, or null on success. */
  const save = useCallback(async (): Promise<string | null> => {
    const { error } = await supabase
      .from('events')
      .update(toBudgetColumns(getValues()))
      .eq('id', event.id);
    return error ? error.message : null;
  }, [event.id, getValues]);

  return {
    control,
    /** True once the client has actually moved a figure. */
    isDirty,
    validate,
    save,
    /**
     * The figure the terms comparison is priced against — null until one is
     * stated. Settled rather than live: it follows the fields a beat behind, so
     * the cards answer the number the client has finished typing.
     */
    previewAmount: pricedAmount,
    currency,
  };
}
