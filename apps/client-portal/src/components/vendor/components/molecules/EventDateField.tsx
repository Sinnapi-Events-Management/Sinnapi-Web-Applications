import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Alert, CalendarLegend, Stack } from '@sinnapi/ui';
import { ControlledDateField } from '@sinnapi/ui/forms';
import { useEventDateAvailability } from '../../hooks/useEventDateAvailability';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  /** Whose calendar to check against. Undefined until the form has a vendor. */
  vendorId: string | undefined;
  disabled?: boolean;
};

/**
 * The event date, checked against the vendor's calendar.
 *
 * Closed days are marked and still selectable, which is the deliberate choice:
 * a blocked day is the vendor's current plan, not a law, and plenty of them
 * would move things for the right job. Refusing the click would lose the
 * request; showing the conflict lets the client decide whether to ask anyway.
 *
 * The marker is `booked` for every kind of block. Which days are someone else's
 * wedding and which are the vendor's own time off is not a client's business.
 */
export default function EventDateField<T extends FieldValues>({
  name,
  control,
  vendorId,
  disabled,
}: Props<T>) {
  const { unavailableDates, isDateUnavailable } = useEventDateAvailability(control, name, vendorId);

  return (
    <Stack spacing={1}>
      {/* A booking can only be for a date still to come, so the calendar simply
          doesn't offer the past. */}
      <ControlledDateField
        name={name}
        control={control}
        label="Event date"
        disablePast
        disabled={disabled}
        modifiers={unavailableDates.length ? { booked: unavailableDates } : undefined}
        dayEmphasis="solid"
        calendarFooter={
          unavailableDates.length ? (
            <CalendarLegend items={[{ color: 'secondary.main', label: 'Vendor unavailable' }]} />
          ) : undefined
        }
      />
      {isDateUnavailable && (
        <Alert severity="warning">
          The vendor has marked this day unavailable. You can still send the request — they may be
          able to rearrange, but they are more likely to decline.
        </Alert>
      )}
    </Stack>
  );
}
