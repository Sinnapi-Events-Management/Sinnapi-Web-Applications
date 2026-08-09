'use client';
/**
 * All of `DateField`'s behaviour, so the component itself is only structure.
 *
 * Choosing a day is the commit: a single date needs no confirmation step, and
 * an OK button would add a click to the most common interaction in the product.
 * The panel closes on select, which is also what fires `onBlur` and lets
 * validation speak.
 */
import { useCallback } from 'react';
import { formatIsoDate, formatIsoDateLong } from '../formatDate';
import { compareIso, parseIsoDate, toIsoDate, todayIso, type IsoDate } from '../isoDate';
import type { DateBoundsProps } from '../types';
import { useDayBounds, useDefaultMonth } from './useDayBounds';
import { usePickerPopover } from './usePickerPopover';

export type UseDateFieldOptions = DateBoundsProps & {
  value: IsoDate;
  onChange: (next: IsoDate) => void;
  onBlur?: () => void;
  disabled?: boolean;
};

export function useDateField({
  value,
  onChange,
  onBlur,
  disabled,
  ...boundProps
}: UseDateFieldOptions) {
  const popover = usePickerPopover({ disabled, onClose: onBlur });
  const bounds = useDayBounds(boundProps);
  const defaultMonth = useDefaultMonth(value, bounds);

  const { closePicker } = popover;

  const selectDay = useCallback(
    (next: Date | undefined) => {
      // `undefined` arrives when the selected day is clicked again — react-day-picker
      // treats that as a deselect, and so do we.
      onChange(toIsoDate(next ?? null));
      closePicker();
    },
    [onChange, closePicker],
  );

  const clear = useCallback(() => {
    onChange('');
    onBlur?.();
  }, [onChange, onBlur]);

  // The "Today" shortcut has to obey the same bounds as the grid — a field with
  // `minDate` in the future must not offer a button that lands outside it.
  // `disablePast`/`disableFuture` are exclusive of today itself, so only the
  // explicit bounds can rule it out.
  const today = todayIso();
  const { minDate, maxDate, disabledDates } = boundProps;
  const todayAllowed =
    !(minDate && compareIso(today, minDate) < 0) &&
    !(maxDate && compareIso(today, maxDate) > 0) &&
    !disabledDates?.includes(today);

  const selectToday = useCallback(() => {
    onChange(today);
    closePicker();
  }, [onChange, closePicker, today]);

  return {
    popover,
    bounds,
    defaultMonth,
    /** `undefined` rather than `null`: what react-day-picker's `selected` wants. */
    selected: parseIsoDate(value) ?? undefined,
    display: formatIsoDate(value),
    /** Long form for the trigger's accessible description. */
    announced: formatIsoDateLong(value),
    selectDay,
    selectToday,
    todayAllowed,
    clear,
  };
}
