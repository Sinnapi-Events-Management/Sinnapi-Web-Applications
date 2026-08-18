import { Controller, type Control } from 'react-hook-form';
import { Box, FormControlLabel, Stack, Switch } from '@sinnapi/ui';
import { ControlledDateField } from '@sinnapi/ui/forms';
import {
  CURRENCY_OPTIONS,
  STATUS_OPTIONS,
  type EventFormValues,
  type SelectOption,
} from '../../schema';
import ControlledField from './ControlledField';

type Props = {
  control: Control<EventFormValues>;
  /** Occasions from `event_types`, supplied by the owning form. */
  eventTypeOptions: SelectOption[];
  /** Disables the occasion select until the vocabulary lands. */
  eventTypesLoading: boolean;
};

/**
 * The editable event fields, shared by the create and edit forms so the layout
 * lives in one place. Purely presentational — the owning form supplies `control`
 * and the occasion options, and handles submit.
 */
export default function EventFormFields({ control, eventTypeOptions, eventTypesLoading }: Props) {
  return (
    <Stack spacing={2.5}>
      <ControlledField name="title" control={control} label="Title" required autoFocus />
      <ControlledField
        name="description"
        control={control}
        label="Description"
        multiline
        minRows={4}
      />
      <ControlledField
        name="event_type_id"
        control={control}
        label="Event type"
        options={eventTypeOptions}
        disabled={eventTypesLoading}
        helperText={
          eventTypesLoading ? 'Loading event types…' : 'Managed under Config → Event Types.'
        }
      />
      {/* An admin edits events that have already happened as well as ones still
          to come, so this calendar stays unbounded in both directions. */}
      <ControlledDateField name="event_date" control={control} label="Date" />
      <ControlledField name="location" control={control} label="Location" />

      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <ControlledField name="budget_min" control={control} label="Min budget" />
        <ControlledField name="budget_max" control={control} label="Max budget" />
        <Box sx={{ width: 120, flexShrink: 0 }}>
          <ControlledField
            name="currency"
            control={control}
            label="Currency"
            options={CURRENCY_OPTIONS}
          />
        </Box>
      </Stack>

      <ControlledField name="status" control={control} label="Status" options={STATUS_OPTIONS} />

      <Controller
        name="is_public"
        control={control}
        render={({ field: { value, ...field } }) => (
          <FormControlLabel control={<Switch {...field} checked={value} />} label="Public event" />
        )}
      />
    </Stack>
  );
}
