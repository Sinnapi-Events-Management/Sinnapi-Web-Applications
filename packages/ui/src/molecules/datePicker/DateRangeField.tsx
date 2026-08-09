'use client';
/**
 * A start and an end date, as one control.
 *
 * Replaces the "From […] – To […]" pairs the toolbars and validity-window forms
 * used to carry. Two independent date inputs cannot express that they belong
 * together: they let you pick an end before its start, they take two calendar
 * navigations to fill, and they read as two unrelated filters. One trigger with
 * one calendar fixes all three — the second click is always constrained to the
 * first, and the value reads back as `12 – 20 Aug 2026`.
 *
 * Value in, value out is `{ from, to }` of `YYYY-MM-DD` strings, so the two
 * columns behind it stay two columns.
 */
import { Box, Stack } from '@mui/material';
import DateRangeIcon from '@mui/icons-material/DateRangeOutlined';
import { CalendarSurface } from './CalendarSurface';
import { PickerFooter } from './PickerFooter';
import { PickerSurface } from './PickerSurface';
import { PickerTrigger } from './PickerTrigger';
import { RangePresetList } from './RangePresetList';
import { useDateRangeField } from './hooks/useDateRangeField';
import type { IsoDateRange } from './isoDate';
import type { RangePreset } from './presets';
import type { DateBoundsProps, PickerFieldProps } from './types';

export type DateRangeFieldProps = PickerFieldProps &
  DateBoundsProps & {
    value: IsoDateRange;
    onChange: (next: IsoDateRange) => void;
    /** One-tap shortcuts. Omit for none — see `PAST_RANGE_PRESETS`. */
    presets?: RangePreset[];
  };

export function DateRangeField({
  value,
  onChange,
  presets,
  minDate,
  maxDate,
  disablePast,
  disableFuture,
  disabledDates,
  label,
  placeholder = 'Any date',
  // See `DateField`: the trigger has no use for it — closing the panel is what
  // counts as leaving the field, and that is where the commit happens.
  onBlur,
  ...fieldProps
}: DateRangeFieldProps) {
  const {
    popover,
    bounds,
    defaultMonth,
    draft,
    selected,
    display,
    draftDisplay,
    selectRange,
    applyPreset,
    clear,
    clearInPanel,
  } = useDateRangeField({
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

  // A phone gets one month and the presets on top; there is no room for two
  // grids side by side, let alone a rail beside them.
  const compact = popover.fullScreen;
  const activePreset = presets?.find((preset) => {
    const range = preset.resolve();
    return range.from === draft.from && range.to === draft.to;
  });

  const presetRail = presets?.length ? (
    <RangePresetList
      presets={presets}
      onApply={applyPreset}
      activeId={activePreset?.id}
      horizontal={compact}
    />
  ) : null;

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
        clearLabel={label ? `Clear ${label.toLowerCase()}` : 'Clear date range'}
        icon={<DateRangeIcon fontSize="small" color="action" />}
      />
      <PickerSurface
        popover={popover}
        ariaLabel={label ? `Choose ${label}` : 'Choose a date range'}
      >
        <Stack direction={compact ? 'column' : 'row'}>
          {presetRail}
          <Box sx={{ p: 1.5, pb: 0 }}>
            <CalendarSurface
              mode="range"
              density="compact"
              selected={selected}
              onSelect={selectRange}
              defaultMonth={defaultMonth}
              numberOfMonths={compact ? 1 : 2}
              disabled={bounds.disabled}
              startMonth={bounds.startMonth}
              endMonth={bounds.endMonth}
              autoFocus
            />
          </Box>
        </Stack>
        <PickerFooter
          summary={draftDisplay}
          emptyHint="Pick a start and an end date"
          onClear={clearInPanel}
          clearDisabled={!draft.from && !draft.to}
          action={{ label: 'Done', onClick: popover.closePicker }}
        />
      </PickerSurface>
    </>
  );
}
