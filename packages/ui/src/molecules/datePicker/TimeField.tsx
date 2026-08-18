'use client';
/**
 * A time of day, chosen from a list of slots.
 *
 * The sibling of `DateField` — same trigger, same popover, same clear button —
 * so a "date + start + end" row reads as one control repeated, not three
 * different widgets. Values are `HH:mm`, which Postgres `time` columns take
 * verbatim.
 */
import { useEffect, useRef } from 'react';
import { MenuItem, MenuList, Paper, Typography } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/ScheduleOutlined';
import { PickerSurface } from './PickerSurface';
import { PickerTrigger } from './PickerTrigger';
import { useTimeField } from './hooks/useTimeField';
import type { IsoTime } from './isoTime';
import type { PickerFieldProps } from './types';

/** Tall enough to show roughly eight slots — enough context to scan, short enough to fit. */
const LIST_MAX_HEIGHT = 288;

export type TimeFieldProps = PickerFieldProps & {
  /** `HH:mm` on a 24-hour clock, or `''` for no time. */
  value: IsoTime;
  onChange: (next: IsoTime) => void;
  /** Grid granularity in minutes. Default 15. */
  minuteStep?: number;
  minTime?: IsoTime;
  maxTime?: IsoTime;
};

export function TimeField({
  value,
  onChange,
  minuteStep,
  minTime,
  maxTime,
  label,
  placeholder = 'Select time',
  // See `DateField`: closing the list is what counts as leaving the field.
  onBlur,
  ...fieldProps
}: TimeFieldProps) {
  const { popover, slots, activeIndex, display, selectSlot, clear } = useTimeField({
    value,
    onChange,
    onBlur,
    disabled: fieldProps.disabled,
    minuteStep,
    minTime,
    maxTime,
  });

  const activeRef = useRef<HTMLLIElement>(null);
  // Opening on "00:00" when 14:30 is chosen would mean scrolling past half a day;
  // the list jumps straight to the current value instead.
  useEffect(() => {
    if (popover.open) activeRef.current?.scrollIntoView({ block: 'center' });
  }, [popover.open]);

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
        clearLabel={label ? `Clear ${label.toLowerCase()}` : 'Clear time'}
        icon={<ScheduleIcon fontSize="small" color="action" />}
      />
      <PickerSurface popover={popover} ariaLabel={label ? `Choose ${label}` : 'Choose a time'}>
        <Paper elevation={0} sx={{ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto', minWidth: 132 }}>
          {slots.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
              No times available
            </Typography>
          ) : (
            <MenuList dense autoFocusItem={popover.open}>
              {slots.map((slot, index) => (
                <MenuItem
                  key={slot}
                  ref={index === activeIndex ? activeRef : undefined}
                  selected={slot === value}
                  onClick={() => selectSlot(slot)}
                >
                  {slot}
                </MenuItem>
              ))}
            </MenuList>
          )}
        </Paper>
      </PickerSurface>
    </>
  );
}
