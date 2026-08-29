'use client';
/**
 * A single calendar date.
 *
 * The replacement for `<TextField type="date">`: same shape in a form row, but
 * the calendar is ours rather than the browser's — so it looks identical in
 * Chrome, Safari and Firefox, follows the theme into dark mode, can grey out
 * days the domain forbids, and reads back as `12 Aug 2026` instead of a raw
 * `2026-08-12`.
 *
 * Value in, value out is still `YYYY-MM-DD`, so every zod schema and Supabase
 * write it feeds keeps working untouched.
 */
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import CalendarIcon from '@mui/icons-material/CalendarTodayOutlined';
import { CalendarSurface } from './CalendarSurface';
import { PickerFooter } from './PickerFooter';
import { PickerSurface } from './PickerSurface';
import { PickerTrigger } from './PickerTrigger';
import { useDateField } from './hooks/useDateField';
import { useDayModifiers } from './hooks/useDayBounds';
import type { IsoDate } from './isoDate';
import type { CalendarDayEmphasis } from './calendar.styles';
import type { DateBoundsProps, DayModifiers, PickerFieldProps } from './types';

export type DateFieldProps = PickerFieldProps &
  DateBoundsProps & {
    /** `YYYY-MM-DD`, or `''` for no date. */
    value: IsoDate;
    onChange: (next: IsoDate) => void;
    /** Extra day markers — `blocked` and `booked` come pre-styled. */
    modifiers?: DayModifiers;
    /**
     * How those markers read. `solid` fills the day rather than dotting it — for
     * a field whose markers are advisory rather than forbidden, where a 4px dot
     * is too quiet to change anyone's mind before they click.
     */
    dayEmphasis?: CalendarDayEmphasis;
    /**
     * Rendered between the grid and the footer — a `CalendarLegend` saying what
     * the markers mean. A marked calendar without a key is a puzzle.
     */
    calendarFooter?: ReactNode;
  };

export function DateField({
  value,
  onChange,
  modifiers,
  dayEmphasis,
  calendarFooter,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  disabledDates,
  label,
  placeholder = 'Select date',
  // Pulled out of the rest: the trigger has no use for it — the picker's own
  // close is what counts as leaving the field.
  onBlur,
  ...fieldProps
}: DateFieldProps) {
  const {
    popover,
    bounds,
    defaultMonth,
    selected,
    display,
    selectDay,
    selectToday,
    todayAllowed,
    clear,
  } = useDateField({
    value,
    onChange,
    onBlur,
    disabled: fieldProps.disabled,
    minDate,
    maxDate,
    disablePast,
    disableFuture,
    disabledDates,
  });

  const dayModifiers = useDayModifiers(modifiers);

  return (
    <>
      <PickerTrigger
        {...fieldProps}
        ref={popover.anchorRef}
        label={label}
        placeholder={placeholder}
        display={display}
        open={popover.open}
        onOpen={popover.openPicker}
        onClear={clear}
        clearLabel={label ? `Clear ${label.toLowerCase()}` : 'Clear date'}
        icon={<CalendarIcon fontSize="small" color="action" />}
      />
      <PickerSurface popover={popover} ariaLabel={label ? `Choose ${label}` : 'Choose a date'}>
        <Box sx={{ p: 1.5, pb: 0 }}>
          <CalendarSurface
            mode="single"
            selected={selected}
            onSelect={selectDay}
            defaultMonth={defaultMonth}
            disabled={bounds.disabled}
            startMonth={bounds.startMonth}
            endMonth={bounds.endMonth}
            modifiers={dayModifiers}
            dayEmphasis={dayEmphasis}
            autoFocus
          />
        </Box>
        {calendarFooter}
        <PickerFooter
          summary={display}
          emptyHint="No date selected"
          onClear={clear}
          clearDisabled={!value}
          action={todayAllowed ? { label: 'Today', onClick: selectToday } : undefined}
        />
      </PickerSurface>
    </>
  );
}
