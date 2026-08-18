import { useState } from 'react';
import { useController } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import { blockDateFormSchema, emptyBlockDateValues, toBlockedDateInsert } from '../schema';

/**
 * Blocks a date the vendor is unavailable.
 *
 * The date is exposed as a plain value/setter pair rather than left to a
 * `Controller` in the markup: on this page the month grid *is* the date input,
 * and a grid is not a field the form can register. Binding it through
 * `useController` here keeps the calendar a presentational component while the
 * value, the error and the touched state all still belong to the form.
 *
 * The form clears itself on success rather than re-baselining: blocking dates
 * is a repeated action, and leaving the last one selected invites blocking it
 * twice.
 */
export function useBlockDateForm(vendorId: string) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useZodForm(blockDateFormSchema, { defaultValues: emptyBlockDateValues });

  const date = useController({ name: 'blocked_date', control });

  const submit = handleSubmit(async (values) => {
    setError(null);
    const { error: insertError } = await supabase
      .from('vendor_blocked_dates')
      .insert(toBlockedDateInsert(values, vendorId));
    if (insertError) {
      setError(insertError.message);
      return;
    }
    reset(emptyBlockDateValues);
    qc.invalidateQueries({ queryKey: ['v-blocked', vendorId] });
  });

  return {
    control,
    error,
    busy: isSubmitting,
    submit,
    selectedDate: date.field.value,
    selectDate: date.field.onChange,
    dateError: date.fieldState.error?.message,
  };
}
