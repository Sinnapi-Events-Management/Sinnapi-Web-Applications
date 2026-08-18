import type { Control } from 'react-hook-form';
import { Stack } from '@sinnapi/ui';
import { ControlledField, ControlledDateField, type SelectOption } from '@sinnapi/ui/forms';
import type { EventFormValues } from '../../schema';

type Props = {
  control: Control<EventFormValues>;
  /** Occasions from `event_types`, supplied by the owning form. */
  eventTypeOptions: SelectOption[];
  /** Disables the occasion select until the vocabulary lands. */
  eventTypesLoading: boolean;
};

/**
 * The editable event fields. Purely presentational — the owning form supplies
 * `control` and the occasion options and handles submit, so this layout can be
 * reused by any future event form (an edit drawer, say) without dragging state
 * along.
 */
export default function EventFormFields({ control, eventTypeOptions, eventTypesLoading }: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField name="title" control={control} label="Event title" required autoFocus />
      {/* A select, not a text box: the occasion is what vendors and the public
          site filter by, so a typed one ("Wedding ceremony") would file the
          event outside every facet a vendor browses. The list is the one an
          admin manages, fetched live. */}
      <ControlledField
        name="event_type_id"
        control={control}
        label="Event type"
        options={eventTypeOptions}
        disabled={eventTypesLoading}
        helperText={
          eventTypesLoading
            ? 'Loading event types…'
            : 'Helps the right vendors find your event. You can leave it unset.'
        }
      />
      {/* An event is posted for vendors to bid on, so only future dates make
          sense — the field itself stays optional, as the schema has it. */}
      <ControlledDateField
        name="event_date"
        control={control}
        label="Event date (optional)"
        disablePast
      />
      <ControlledField name="location" control={control} label="Location" />
      <ControlledField
        name="description"
        control={control}
        label="Description"
        multiline
        minRows={4}
      />
    </Stack>
  );
}
