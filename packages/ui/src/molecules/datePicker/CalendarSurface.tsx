'use client';
/**
 * The one place react-day-picker is configured.
 *
 * Every calendar in the product — inline, in a popover, single or range — comes
 * through here, so the conventions that must not drift (Monday-first weeks, the
 * month/year dropdowns, the themed skin) are set once. Callers pass only what
 * makes their calendar different.
 */
import { Box } from '@mui/material';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { calendarSx, type CalendarDensity } from './calendar.styles';
import { addMonths, endOfMonth, startOfMonth, startOfToday } from './isoDate';

/** How far the year dropdown reaches when the caller sets no bounds. */
const YEAR_REACH = 5;

export type CalendarSurfaceProps = DayPickerProps & {
  density?: CalendarDensity;
};

export function CalendarSurface({
  density,
  startMonth,
  endMonth,
  modifiers,
  modifiersClassNames,
  ...rest
}: CalendarSurfaceProps) {
  // The year dropdown builds its options from the navigable span, so it needs a
  // span even when the field itself is unbounded — otherwise it renders empty.
  const today = startOfToday();
  const navStart = startMonth ?? startOfMonth(addMonths(today, -12 * YEAR_REACH));
  const navEnd = endMonth ?? endOfMonth(addMonths(today, 12 * YEAR_REACH));

  // react-day-picker only emits a class for a *custom* modifier if it is told
  // which one — its built-in flags get `rdp-` names for free, but `blocked` and
  // friends would silently render as ordinary days. Naming them on the same
  // pattern is what lets the stylesheet above target them.
  const markerClassNames = modifiers
    ? Object.fromEntries(Object.keys(modifiers).map((name) => [name, `rdp-${name}`]))
    : undefined;

  return (
    <Box sx={calendarSx(density)}>
      <DayPicker
        modifiers={modifiers}
        modifiersClassNames={{ ...markerClassNames, ...modifiersClassNames }}
        // Monday-first: the East-Africa convention, and the one the rest of the
        // product's date language already assumes.
        weekStartsOn={1}
        showOutsideDays
        // Dropdown navigation turns "six months out" from six clicks into one.
        captionLayout="dropdown"
        startMonth={navStart}
        endMonth={navEnd}
        {...rest}
      />
    </Box>
  );
}
