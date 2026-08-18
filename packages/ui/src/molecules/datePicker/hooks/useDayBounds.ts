'use client';
/**
 * Turns the field-level bound props into the matchers react-day-picker wants.
 *
 * Bounds arrive as ISO strings because that is what call sites already hold
 * (`minDate={startsAt}`); the calendar wants `Date`s. Doing the conversion in
 * one memoised hook keeps every field from rebuilding matcher arrays on each
 * render — a new array identity would remount the grid and lose keyboard focus.
 */
import { useMemo } from 'react';
import type { Matcher } from 'react-day-picker';
import { parseIsoDate, startOfToday, addDays } from '../isoDate';
import type { DateBoundsProps, DayModifiers } from '../types';

export type DayBounds = {
  /** Passed straight to `<DayPicker disabled>`. */
  disabled: Matcher[];
  /** The earliest month the nav will show, or `undefined` for no floor. */
  startMonth?: Date;
  endMonth?: Date;
};

export function useDayBounds({
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  disabledDates,
}: DateBoundsProps): DayBounds {
  const disabledKey = disabledDates?.join('|') ?? '';

  return useMemo(() => {
    const min = parseIsoDate(minDate);
    const max = parseIsoDate(maxDate);
    const matchers: Matcher[] = [];

    // `before`/`after` are exclusive of the bound itself, which is what makes
    // both bounds inclusive: `{ before: min }` disables everything up to but
    // not including `min`.
    if (min) matchers.push({ before: min });
    if (max) matchers.push({ after: max });
    if (disablePast) matchers.push({ before: startOfToday() });
    if (disableFuture) matchers.push({ after: startOfToday() });

    const explicit = (disabledDates ?? []).map(parseIsoDate).filter((d): d is Date => d !== null);
    if (explicit.length) matchers.push(...explicit);

    // Clamping the navigable months stops the arrows walking through years of
    // dead calendar when the range is bounded anyway.
    const floors = [min, disablePast ? startOfToday() : null].filter((d): d is Date => d !== null);
    const ceilings = [max, disableFuture ? startOfToday() : null].filter(
      (d): d is Date => d !== null,
    );

    return {
      disabled: matchers,
      startMonth: floors.length ? new Date(Math.max(...floors.map((d) => d.getTime()))) : undefined,
      endMonth: ceilings.length
        ? new Date(Math.min(...ceilings.map((d) => d.getTime())))
        : undefined,
    };
    // `disabledKey` stands in for the array so a fresh array of the same dates
    // does not invalidate the memo on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDate, maxDate, disablePast, disableFuture, disabledKey]);
}

/** ISO-keyed day markers → the `Date[]` modifier map react-day-picker expects. */
export function useDayModifiers(modifiers?: DayModifiers): Record<string, Date[]> | undefined {
  const key = modifiers
    ? Object.entries(modifiers)
        .map(([name, dates]) => `${name}:${dates.join(',')}`)
        .join('|')
    : '';

  return useMemo(() => {
    if (!modifiers) return undefined;
    return Object.fromEntries(
      Object.entries(modifiers).map(([name, dates]) => [
        name,
        dates.map(parseIsoDate).filter((d): d is Date => d !== null),
      ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/** The month a calendar should open on: the value, else the nearest allowed month. */
export function useDefaultMonth(value: string | undefined, bounds: DayBounds): Date {
  return useMemo(() => {
    const selected = parseIsoDate(value ?? '');
    if (selected) return selected;
    const today = startOfToday();
    if (bounds.startMonth && today < bounds.startMonth) return bounds.startMonth;
    if (bounds.endMonth && today > bounds.endMonth) return bounds.endMonth;
    return today;
  }, [value, bounds.startMonth, bounds.endMonth]);
}

/** Re-exported so callers building bounds inline don't reach past the barrel. */
export { addDays };
