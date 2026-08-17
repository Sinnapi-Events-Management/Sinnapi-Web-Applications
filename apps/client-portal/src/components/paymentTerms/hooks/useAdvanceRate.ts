import { useEffect, useMemo, useRef } from 'react';
import { useZodForm } from '@sinnapi/ui/forms';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { advanceRateSchema, parseRate, type AdvanceRateValues } from '../schema';

/** Until the first quote lands there is no server-supplied ceiling to check. */
const FALLBACK_LIMIT = 100;

type Options = {
  /**
   * The rate the field starts at, as the server resolved it: the vendor's
   * proposal where a quotation carried one, otherwise the platform's suggested
   * figure (`advance_rate_default`).
   *
   * Named for what it is rather than where it might have come from. It was
   * `proposedRate`, which read as "the vendor proposed this" — true on a
   * booking made from a quote, false on every booking made without one, and
   * the misreading leaked all the way out to a validation message that told
   * clients their vendor had set a limit the admin console had set.
   */
  startingRate: number | null;
  /** The most the client may choose: the platform maximum. */
  limit: number | null;
};

/**
 * The client's chosen advance: the field, its validation, and the value the
 * pricing query should ask the server for.
 *
 * Two things are kept deliberately apart. What the client is *typing* drives
 * the form and its errors; what they have *settled on* drives re-pricing. A
 * quote is a round trip on a money screen, so it is debounced and only ever
 * requested for a value that passes validation — an intermediate "5" on the
 * way to "50" should not fetch a price nobody asked for, and an out-of-range
 * figure should be answered by the field, not by an RPC error.
 */
export function useAdvanceRate({ startingRate, limit }: Options) {
  // Read through a ref so the resolver sees the live ceiling without being
  // rebuilt — see the note in `advanceRateSchema`.
  const limitRef = useRef(FALLBACK_LIMIT);
  limitRef.current = limit ?? FALLBACK_LIMIT;

  const schema = useMemo(() => advanceRateSchema(() => limitRef.current), []);
  const form = useZodForm<AdvanceRateValues>(schema, {
    defaultValues: { advance_rate: '' },
  });

  const { reset, trigger, watch, formState } = form;
  const value = watch('advance_rate');

  // The field mounts before the price arrives, so it starts blank and adopts
  // the starting rate once priced — clamped, because a quotation drafted
  // before an admin tightened the maximum can propose more than is now
  // allowed. Seeded once: re-seeding would overwrite what the client chose.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || startingRate == null || limit == null) return;
    seeded.current = true;
    reset({ advance_rate: String(Math.min(startingRate, limit)) });
  }, [startingRate, limit, reset]);

  // A tightened ceiling can invalidate a value that was fine when it was typed.
  useEffect(() => {
    if (limit != null && formState.isDirty) void trigger('advance_rate');
  }, [limit, formState.isDirty, trigger]);

  const parsed = parseRate(value ?? '');
  const isValid = parsed != null && limit != null && parsed >= 0 && parsed <= limit;

  /**
   * The last figure that was worth pricing. Held rather than reset so that
   * clearing the field to retype it leaves the previous split on screen
   * instead of snapping back to the vendor's proposal mid-edit.
   *
   * Written during render, which is safe because it is idempotent: the same
   * inputs always write the same value.
   */
  const settled = useRef<number | null>(null);
  if (isValid) settled.current = parsed;

  const pricedRate = useDebouncedValue(settled.current, 350);

  return {
    form,
    /** What the pricing query should ask the server for. */
    pricedRate,
    /** The quote on screen reflects exactly what is in the field. */
    isSettled: isValid && pricedRate === parsed,
    /** The client has moved the figure off the one they were started on. */
    isCustomised: parsed != null && startingRate != null && parsed !== startingRate,
    /** Drives the slider, which has no meaningful "invalid" position. */
    sliderValue: parsed != null && limit != null ? Math.min(Math.max(parsed, 0), limit) : 0,
    setRate: (next: number) =>
      form.setValue('advance_rate', String(next), { shouldValidate: true, shouldDirty: true }),
    error: formState.errors.advance_rate?.message ?? null,
  };
}
