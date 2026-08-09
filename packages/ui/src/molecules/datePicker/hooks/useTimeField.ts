'use client';
/**
 * All of `TimeField`'s behaviour.
 *
 * A list of fixed slots rather than free text: event times in this product are
 * booking windows, not stopwatch readings, so a 15-minute grid covers real use
 * and removes every "is 7 seven in the morning or evening" ambiguity that typed
 * times bring. `minTime` narrows the list, which is how an end time is stopped
 * from preceding its start without a second validation message.
 */
import { useCallback, useMemo } from 'react';
import { timeSlots, toMinutes, type IsoTime } from '../isoTime';
import { usePickerPopover } from './usePickerPopover';

/** Quarter-hour: the coarsest grid that still expresses every realistic booking. */
const DEFAULT_STEP = 15;

export type UseTimeFieldOptions = {
  value: IsoTime;
  onChange: (next: IsoTime) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** Grid granularity in minutes. Default 15. */
  minuteStep?: number;
  /** Earliest selectable slot, inclusive. */
  minTime?: IsoTime;
  /** Latest selectable slot, inclusive. */
  maxTime?: IsoTime;
};

export function useTimeField({
  value,
  onChange,
  onBlur,
  disabled,
  minuteStep = DEFAULT_STEP,
  minTime,
  maxTime,
}: UseTimeFieldOptions) {
  const popover = usePickerPopover({ disabled, onClose: onBlur });
  const { closePicker } = popover;

  const slots = useMemo(
    () => timeSlots(minuteStep, minTime, maxTime),
    [minuteStep, minTime, maxTime],
  );

  /**
   * Where the list should scroll to when it opens: the chosen slot, or the one
   * nearest it when a narrowed `minTime` has pushed the old value out of range.
   */
  const activeIndex = useMemo(() => {
    if (!value) return -1;
    const exact = slots.indexOf(value);
    if (exact >= 0) return exact;
    const target = toMinutes(value);
    if (target === null) return -1;
    return slots.findIndex((slot) => (toMinutes(slot) ?? 0) >= target);
  }, [slots, value]);

  const selectSlot = useCallback(
    (slot: IsoTime) => {
      onChange(slot);
      closePicker();
    },
    [onChange, closePicker],
  );

  const clear = useCallback(() => {
    onChange('');
    onBlur?.();
  }, [onChange, onBlur]);

  return {
    popover,
    slots,
    activeIndex,
    /** 24-hour display — no reformatting needed, the stored value already reads right. */
    display: value,
    selectSlot,
    clear,
  };
}
