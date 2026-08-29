import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useZodForm } from '@sinnapi/ui/forms';
import { supabase } from '@/lib/supabase';
import {
  blockDateDefaults,
  blockDateFormSchema,
  describeBlockOutcome,
  planBlockInserts,
  type BlockMode,
} from '../schema';
import { blockedDatesKey } from './useCalendar';

type Options = {
  /** The day the grid has selected — where the form opens, not where it is stuck. */
  date: string;
  /** Today, resolved once by the page so every panel agrees on it. */
  today: string;
  /** Days a booking or an earlier block already holds. These are never written. */
  unavailable: string[];
  /** Handed the sentence describing what was written. */
  onSuccess: (outcome: string) => void;
};

/**
 * Blocking one day, or a run of them.
 *
 * The date is seeded from the grid rather than fixed to it: the same dialog is
 * reached from a day the vendor tapped and from the rail's own button, and only
 * the first of those has already chosen a day. The picker refuses the days that
 * are gone or spoken for, so an editable field cannot reach a date the grid
 * would have ruled out.
 *
 * A range is expanded and written as one statement. `ignoreDuplicates` is what
 * makes that safe under `(vendor, date, source)`: the plan already drops the days
 * it knows are taken, and the conflict clause covers the ones it could not know
 * about — a booking confirmed in another tab since this page last read.
 *
 * The hook is mounted with the dialog and dies with it, which is what keeps the
 * reason from carrying over: blocking dates is a repeated action, and the reason
 * for last Tuesday is rarely the reason for this one.
 */
export function useBlockDateForm(
  vendorId: string,
  { date, today, unavailable, onSuccess }: Options,
) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useZodForm(blockDateFormSchema, { defaultValues: blockDateDefaults(date) });
  const {
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const mode = watch('mode') as BlockMode;

  // A Set for the plan's per-day lookup, and the array the picker wants for its
  // disabled days. One memo so a re-render does not rebuild either.
  const taken = useMemo(() => new Set(unavailable), [unavailable]);

  const submit = handleSubmit(async (values) => {
    setError(null);
    const plan = planBlockInserts(values, vendorId, taken, today);

    // Nothing to write is not a failure of the insert — it is the answer, and
    // it is the one thing a silent success would hide.
    if (plan.rows.length === 0) {
      setError('Every day in that range is already booked or blocked.');
      return;
    }

    const { error: writeError } = await supabase.from('vendor_blocked_dates').upsert(plan.rows, {
      onConflict: 'vendor_id,blocked_date,source',
      ignoreDuplicates: true,
    });

    if (writeError) {
      setError(writeError.message);
      return;
    }

    qc.invalidateQueries({ queryKey: blockedDatesKey(vendorId) });
    onSuccess(describeBlockOutcome(plan));
  });

  return {
    control,
    mode,
    /** Switching to a single day drops the end date, so a stale one cannot be
        revalidated the next time the vendor switches back to a range. */
    setMode: (next: BlockMode) => {
      setValue('mode', next, { shouldValidate: false });
      if (next === 'single') setValue('end_date', '', { shouldValidate: false });
    },
    disabledDates: unavailable,
    error,
    busy: isSubmitting,
    submit,
  };
}
