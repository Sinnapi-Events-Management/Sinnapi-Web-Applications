'use client';
/**
 * The calendar without a field around it.
 *
 * For surfaces where the month grid *is* the page rather than a popover behind
 * an input — the vendor's availability screen being the case in hand, where
 * seeing which days are already spoken for matters more than typing one in.
 * Selection is optional: pass `onChange` for a pickable calendar, omit it for a
 * read-only view of the marked days.
 */
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { CalendarSurface, type DayModifierLabels, type DayTooltips } from './CalendarSurface';
import type { CalendarDayEmphasis, CalendarDensity } from './calendar.styles';
import { useDayBounds, useDayModifiers, useDefaultMonth } from './hooks/useDayBounds';
import { parseIsoDate, toIsoDate, type IsoDate } from './isoDate';
import type { DateBoundsProps, DayModifiers } from './types';

export type DateCalendarProps = DateBoundsProps & {
  value?: IsoDate;
  /** Omit to render a read-only calendar. */
  onChange?: (next: IsoDate) => void;
  /** Day markers — `blocked` (red) and `booked` (gold) are pre-styled. */
  modifiers?: DayModifiers;
  numberOfMonths?: number;
  density?: CalendarDensity;
  /**
   * Stretch the grid to fill its container. Off by default so existing inline
   * calendars keep their natural width; on for a calendar that owns its card.
   */
  fullWidth?: boolean;
  /**
   * `dot` (default), `solid` filled days, or `hatched` — a filled day plus a
   * diagonal rule and a struck-through number, for markers that must still read
   * without colour.
   */
  dayEmphasis?: CalendarDayEmphasis;
  /**
   * The displayed month, when the caller needs to know or drive it — a page
   * summarising "this month" has to read the same month the grid is showing.
   * Omit both for an uncontrolled calendar that opens on the value.
   */
  month?: Date;
  onMonthChange?: (next: Date) => void;
  /**
   * Detail shown on hovering a day, keyed by `YYYY-MM-DD`. Memoise it — a fresh
   * object each render remounts the grid.
   */
  dayTooltips?: DayTooltips;
  /**
   * Words appended to a marked day's accessible name — `{ booked: 'Unavailable' }`.
   * Without it the markers are invisible to a screen reader. Memoise it.
   */
  dayModifierLabels?: DayModifierLabels;
  /** Rendered under the grid, inside the calendar's own padding. */
  footer?: ReactNode;
};

export function DateCalendar({
  value = '',
  onChange,
  modifiers,
  numberOfMonths,
  density,
  fullWidth,
  dayEmphasis,
  month,
  onMonthChange,
  dayTooltips,
  dayModifierLabels,
  footer,
  ...boundProps
}: DateCalendarProps) {
  const bounds = useDayBounds(boundProps);
  const defaultMonth = useDefaultMonth(value, bounds);
  const dayModifiers = useDayModifiers(modifiers);

  const shared = {
    density,
    fullWidth,
    dayEmphasis,
    dayTooltips,
    dayModifierLabels,
    // `month` and `defaultMonth` are mutually exclusive in react-day-picker:
    // passing both makes the grid controlled *and* seeds it, and the seed wins
    // on first render, so the caller's month would be ignored until they moved.
    ...(month ? { month, onMonthChange } : { defaultMonth, onMonthChange }),
    numberOfMonths,
    disabled: bounds.disabled,
    startMonth: bounds.startMonth,
    endMonth: bounds.endMonth,
    modifiers: dayModifiers,
  };

  return (
    <Box>
      {/* Two branches rather than a conditional `mode` prop: react-day-picker's
          props are a discriminated union, so `mode` has to be a literal for the
          selection props to type-check against it. */}
      {onChange ? (
        <CalendarSurface
          {...shared}
          mode="single"
          selected={parseIsoDate(value) ?? undefined}
          onSelect={(next) => onChange(toIsoDate(next ?? null))}
        />
      ) : (
        <CalendarSurface {...shared} />
      )}
      {footer}
    </Box>
  );
}
