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
import { CalendarSurface } from './CalendarSurface';
import type { CalendarDensity } from './calendar.styles';
import { useDayBounds, useDayModifiers, useDefaultMonth } from './hooks/useDayBounds';
import { parseIsoDate, toIsoDate, type IsoDate } from './isoDate';
import type { DateBoundsProps, DayModifiers } from './types';

export type DateCalendarProps = DateBoundsProps & {
  value?: IsoDate;
  /** Omit to render a read-only calendar. */
  onChange?: (next: IsoDate) => void;
  /** Day markers — `blocked` (red dot) and `booked` (gold dot) are pre-styled. */
  modifiers?: DayModifiers;
  numberOfMonths?: number;
  density?: CalendarDensity;
  /** Rendered under the grid, inside the calendar's own padding. */
  footer?: ReactNode;
};

export function DateCalendar({
  value = '',
  onChange,
  modifiers,
  numberOfMonths,
  density,
  footer,
  ...boundProps
}: DateCalendarProps) {
  const bounds = useDayBounds(boundProps);
  const defaultMonth = useDefaultMonth(value, bounds);
  const dayModifiers = useDayModifiers(modifiers);

  const shared = {
    density,
    defaultMonth,
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
