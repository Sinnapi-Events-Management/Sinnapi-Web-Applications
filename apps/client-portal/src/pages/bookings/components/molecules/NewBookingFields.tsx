import type { Control } from 'react-hook-form';
import { Stack } from '@sinnapi/ui';
import { ControlledField, ControlledTimeField } from '@sinnapi/ui/forms';
import { paymentRailLabel } from '@sinnapi/ui';
import type { MyEventModel } from '@/lib/types';
import EventDateField from '@/components/vendor/components/molecules/EventDateField';
import VendorPickerField from './VendorPickerField';
import type { NewBookingValues } from '../../schema';

type Props = {
  control: Control<NewBookingValues>;
  events: MyEventModel[];
  /** The vendor chosen above, so the date field can check their calendar. */
  vendorId: string | undefined;
  slotMinutes: number;
  endMinTime?: string;
  endDisabled: boolean;
  disabled?: boolean;
};

/**
 * Who, when, where and roughly how much — everything about the booking except
 * how it is paid for.
 *
 * The event select names the terms an event carries in its own option label. A
 * client picking an event is, without being told otherwise, also picking that
 * event's payment rail, and finding that out only when the picker below greys
 * itself out is a worse way to learn it than reading it here.
 */
export default function NewBookingFields({
  control,
  events,
  vendorId,
  slotMinutes,
  endMinTime,
  endDisabled,
  disabled,
}: Props) {
  return (
    <Stack spacing={2.5}>
      <VendorPickerField control={control} disabled={disabled} />

      {events.length > 0 && (
        <ControlledField
          name="event_id"
          control={control}
          label="Part of one of your events (optional)"
          disabled={disabled}
          options={[
            { value: '', label: 'Not part of an event' },
            ...events.map((e) => ({
              value: e.id,
              label: e.payment_type ? `${e.title} — ${paymentRailLabel(e.payment_type)}` : e.title,
            })),
          ]}
          helperText="An event with payment terms set applies them to this booking."
        />
      )}

      {/* The vendor is picked in this same form, so the calendar it checks
          against only exists once they have been — until then the field is an
          ordinary date picker with nothing to mark. */}
      <EventDateField name="event_date" control={control} vendorId={vendorId} disabled={disabled} />

      {/* Optional, but worth asking: without it the vendor's first reply is
          always "what time?". The end cannot precede the start, because the
          list it is picked from starts one slot after it. */}
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <ControlledTimeField
          name="start_time"
          control={control}
          label="Start time (optional)"
          minuteStep={slotMinutes}
          disabled={disabled}
        />
        <ControlledTimeField
          name="end_time"
          control={control}
          label="End time (optional)"
          minuteStep={slotMinutes}
          minTime={endMinTime}
          disabled={endDisabled || disabled}
        />
      </Stack>

      <ControlledField name="location" control={control} label="Location" disabled={disabled} />

      {/* The figure everything below is priced against. Said so in the helper
          text, because a client who leaves it blank gets a terms comparison
          with no numbers in it and no explanation of why. */}
      <ControlledField
        name="amount"
        control={control}
        type="number"
        label="Estimated amount (UGX)"
        inputProps={{ min: 0 }}
        disabled={disabled}
        helperText="What you expect this to cost. The payment options below are priced against it."
      />
    </Stack>
  );
}
