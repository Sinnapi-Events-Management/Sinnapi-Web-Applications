import { useMemo, useState } from 'react';
import { parseIsoDate, startOfMonth, todayIso, type DayModifierLabels } from '@sinnapi/ui';
import { useVendorUnavailability } from '@/hooks/useVendorUnavailability';
import {
  dayState,
  findNextOpenDate,
  isSameMonth,
  summariseMonth,
  toClosedDays,
  type AvailabilityDayState,
} from '../schema';

/**
 * Everything the availability card knows, in one place.
 *
 * The month is owned here rather than left inside the grid because three things
 * have to agree about which month is on screen: the grid drawing it, the strip
 * counting it, and the callout deciding whether the next free date is already
 * visible or needs jumping to. A grid that owned its own month would leave the
 * other two describing a different one.
 *
 * `today` is captured once per mount instead of read per call. A component that
 * asks `todayIso()` in three places gets three answers across a midnight tick,
 * and the day that changed underneath it is exactly the one being rendered.
 */
export function useVendorAvailability(vendorId: string) {
  const { dates, isLoading, error } = useVendorUnavailability(vendorId);
  const today = useMemo(() => todayIso(), []);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const closed = useMemo(() => toClosedDays(dates), [dates]);
  const summary = useMemo(() => summariseMonth(month, closed, today), [month, closed, today]);
  const nextOpen = useMemo(() => findNextOpenDate(closed, today), [closed, today]);

  // Whether the callout needs to offer a jump, or the day is already on screen.
  const nextOpenInView = useMemo(() => {
    const date = parseIsoDate(nextOpen ?? '');
    return date ? isSameMonth(date, month) : false;
  }, [nextOpen, month]);

  // Memoised because `DateCalendar` keys its day component on this object: a
  // fresh map each render remounts the grid and drops keyboard focus
  // mid-navigation. Bounded by how many days the vendor has closed, so there is
  // nothing here worth deferring.
  const modifiers = useMemo(() => ({ booked: dates }), [dates]);

  // The markers are a fill and a hatch, which a screen reader cannot see at all.
  // This is what makes a closed day announce as closed. One `booked` key for
  // both kinds of block, matching what the grid draws.
  const modifierLabels = useMemo<DayModifierLabels>(() => ({ booked: 'Unavailable' }), []);

  return {
    isLoading,
    error,
    /** Closed dates, in the order the query returned them. */
    dates,
    month,
    onMonthChange: setMonth,
    summary,
    /** The first free day from today, or `null` if the vendor is solid for a year. */
    nextOpen,
    /** True when `nextOpen` is already on screen, so the callout needn't offer a jump. */
    nextOpenInView,
    modifiers,
    modifierLabels,
    /** Jumps the grid to whichever month holds `date`. */
    showMonthOf: (date: string) => {
      const parsed = parseIsoDate(date);
      if (parsed) setMonth(startOfMonth(parsed));
    },
    /** What one date is. Used by the grid's tap handler and the tooltips. */
    stateOf: (date: string): AvailabilityDayState => dayState(date, closed, today),
  };
}
