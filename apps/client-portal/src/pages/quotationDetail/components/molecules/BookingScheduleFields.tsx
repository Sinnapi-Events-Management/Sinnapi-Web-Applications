import { Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateField, ControlledTimeField } from '@sinnapi/ui/forms';
import type { Control } from 'react-hook-form';
import type { BookingFromQuotationValues } from '../../schema';

type Props = {
  control: Control<BookingFromQuotationValues>;
  slotMinutes: number;
  endMinTime?: string;
  endDisabled: boolean;
};

/**
 * When and where — the only things a booking made from a quote asks for.
 *
 * A molecule of its own rather than fields inlined in the dialog so the
 * schedule can be reused wherever else a booking gets rescheduled, and so the
 * dialog stays a dialog: a header, this, and two buttons.
 */
export default function BookingScheduleFields({
  control,
  slotMinutes,
  endMinTime,
  endDisabled,
}: Props) {
  return (
    <Stack spacing={2}>
      {/* A booking can only be for a date still to come, so the calendar simply
          does not offer the past — the RPC refuses it too, but being told after
          the fact is not the same as not being able to pick it. */}
      <ControlledDateField name="event_date" control={control} label="Event date" disablePast />

      {/* Optional, but worth asking: without it the vendor's first reply is
          always "what time?". The end cannot precede the start, because the
          list it is picked from starts one slot after it. */}
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <ControlledTimeField
          name="start_time"
          control={control}
          label="Start time (optional)"
          minuteStep={slotMinutes}
        />
        <ControlledTimeField
          name="end_time"
          control={control}
          label="End time (optional)"
          minuteStep={slotMinutes}
          minTime={endMinTime}
          disabled={endDisabled}
        />
      </Stack>

      <ControlledField
        name="location"
        control={control}
        label="Location"
        helperText="Where the vendor should turn up. You can add the exact address in a message later."
      />
    </Stack>
  );
}
